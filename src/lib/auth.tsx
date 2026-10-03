import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '@/lib/authContext';
import {
  AUTH_INVALIDATED_EVENT,
  changePassword as changeDjangoPassword,
  getCurrentUser,
  getStoredSession,
  login,
  logout,
  type DjangoAuthUser,
  type DjangoSession,
} from '@/lib/djangoApi';
import { getAttachment, putAttachment, removeAttachment } from '@/lib/attachmentStorage';
import type { SubmissionAttachment, UserProfile } from '@/lib/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DjangoAuthUser | null>(null);
  const [session, setSession] = useState<DjangoSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback((reason?: string) => {
    setUser(null);
    setSession(null);
    setProfile(null);
    if (reason) sessionStorage.setItem('skill-toss-auth-notice', reason);
  }, []);

  useEffect(() => {
    const invalidated = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason;
      clearAuthState(reason);
    };
    window.addEventListener(AUTH_INVALIDATED_EVENT, invalidated);
    return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, invalidated);
  }, [clearAuthState]);

  useEffect(() => {
    let mounted = true;
    async function restore() {
      if (!getStoredSession()) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const restored = await getCurrentUser();
        if (!mounted) return;
        setUser(restored.user);
        setProfile(restored.profile);
        setSession(getStoredSession());
      } catch (error) {
        if (mounted) clearAuthState(error instanceof Error ? error.message : undefined);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void restore();
    return () => { mounted = false; };
  }, [clearAuthState]);

  const signIn = useCallback(async (email: string, password: string) => {
    const authenticated = await login(email, password);
    setUser(authenticated.user);
    setProfile(authenticated.profile);
    setSession(getStoredSession());
    sessionStorage.removeItem('skill-toss-auth-notice');
    return authenticated;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.warn('The backend logout request failed; local credentials were still cleared.', error);
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  const changePassword = useCallback(async (
    currentPassword: string, newPassword: string, confirmPassword: string,
  ) => {
    await changeDjangoPassword(currentPassword, newPassword, confirmPassword);
    clearAuthState();
  }, [clearAuthState]);

  const updateProfileAvatar = useCallback(async (file: File | null) => {
    if (!user) return;
    const id = `profile_avatar_${user.id}`;
    if (!file) {
      await removeAttachment(id).catch(() => undefined);
      localStorage.removeItem(`skill-toss-avatar-${user.id}`);
      setProfile((current) => current ? { ...current, avatarUrl: null } : current);
      return;
    }
    const metadata: SubmissionAttachment = {
      id, submissionId: user.id, fileName: file.name, fileType: file.type,
      fileSize: file.size, lastModified: file.lastModified, storageMode: 'local',
      createdAt: new Date().toISOString(), ownerType: 'note', ownerId: user.id, uploadedBy: user.id,
    };
    await putAttachment(metadata, file);
    localStorage.setItem(`skill-toss-avatar-${user.id}`, id);
    const stored = await getAttachment(id);
    setProfile((current) => current ? {
      ...current, avatarUrl: stored ? URL.createObjectURL(stored.blob) : null,
    } : current);
  }, [user]);

  const profileId = profile?.id;
  useEffect(() => {
    if (!user || !profileId) return;
    const id = localStorage.getItem(`skill-toss-avatar-${user.id}`);
    if (!id) return;
    let active = true;
    void getAttachment(id).then((stored) => {
      if (active && stored) setProfile((current) => current ? {
        ...current, avatarUrl: URL.createObjectURL(stored.blob),
      } : current);
    });
    return () => { active = false; };
  }, [user, profileId]);

  const value = useMemo<AuthContextValue>(() => ({
    user, session, profile, loading, signIn, signOut, changePassword, updateProfileAvatar,
  }), [user, session, profile, loading, signIn, signOut, changePassword, updateProfileAvatar]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
