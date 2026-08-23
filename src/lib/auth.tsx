import { useCallback, useEffect, useState, useMemo, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole, UserProfile } from '@/lib/types';
import { AuthContext, type AuthContextValue } from '@/lib/authContext';
import { putAttachment, getAttachment, removeAttachment } from '@/lib/attachmentStorage';
import type { SubmissionAttachment } from '@/lib/types';
// Local-only fallback profiles for the demo identities, used when demo sign-in is enabled.
import { DEMO_PROFILES, isDemoSignInFallbackEnabled } from '@/lib/demoAccounts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const updateProfileAvatar = useCallback(async (file: File | null) => {
    if (!user) return;
    const id = `profile_avatar_${user.id}`;
    if (!file) { await removeAttachment(id).catch(() => undefined); localStorage.removeItem(`skill-toss-avatar-${user.id}`); setProfile((current) => current ? { ...current, avatarUrl: null } : current); return; }
    const metadata: SubmissionAttachment = { id, submissionId: user.id, fileName: file.name, fileType: file.type, fileSize: file.size, lastModified: file.lastModified, storageMode: 'local', createdAt: new Date().toISOString(), ownerType: 'note', ownerId: user.id, uploadedBy: user.id };
    await putAttachment(metadata, file);
    localStorage.setItem(`skill-toss-avatar-${user.id}`, id);
    const stored = await getAttachment(id);
    setProfile((current) => current ? { ...current, avatarUrl: stored ? URL.createObjectURL(stored.blob) : null } : current);
  }, [user]);
  const profileId = profile?.id;
  useEffect(() => {
    if (!user || !profileId) return;
    const id = localStorage.getItem(`skill-toss-avatar-${user.id}`);
    if (!id) return;
    let active = true;
    void getAttachment(id).then((stored) => { if (active && stored) setProfile((current) => current ? { ...current, avatarUrl: URL.createObjectURL(stored.blob) } : current); });
    return () => { active = false; };
  }, [user, profileId]);

  // Resolve authorization only from the database profile created for the Auth user.
  const fetchProfile = useCallback(async (authUser: User): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, institution_id, role, full_name, avatar_url, is_active')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load your Skill Toss profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('Your account is awaiting profile provisioning. Please contact your administrator.');
    }

    return {
      id: data.id,
      fullName: data.full_name,
      role: data.role as UserRole,
      institutionId: data.institution_id || null,
      avatarUrl: data.avatar_url,
      isActive: data.is_active,
    };
  }, []);

  // Restore session on application startup
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.user) {
          if (mounted) {
            const userProfile = await fetchProfile(data.session.user);
            if (!userProfile.isActive) {
              await supabase.auth.signOut();
              return;
            }
            setSession(data.session);
            setUser(data.session.user);
            setProfile(userProfile);
          }
        } else {
          // Check for demo session fallback
          const demoEmail = localStorage.getItem('demo_session_email');
          if (demoEmail && DEMO_PROFILES[demoEmail]) {
            const demoProf = DEMO_PROFILES[demoEmail];
            const fakeUser = {
              id: demoProf.id,
              email: demoEmail,
              app_metadata: {},
              user_metadata: { role: demoProf.role, full_name: demoProf.fullName },
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            } as unknown as User;
            
            if (mounted) {
              setUser(fakeUser);
              setProfile(demoProf);
            }
          }
        }
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen for Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      if (newSession && newSession.user) {
        try {
          const userProfile = await fetchProfile(newSession.user);
          if (!userProfile.isActive) {
            throw new Error('The authenticated profile is inactive or awaiting provisioning.');
          }
          setSession(newSession);
          setUser(newSession.user);
          setProfile(userProfile);
        } catch (error) {
          console.error('Could not resolve the authenticated profile:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // A local demo profile may only stand in while demo sign-in is enabled for this build.
      // In any other build a rejected sign-in stays rejected — never mint a session that
      // Supabase Auth did not grant.
      if (isDemoSignInFallbackEnabled) {
        const demoProf = DEMO_PROFILES[email.toLowerCase()];
        if (demoProf) {
          const fakeUser = {
            id: demoProf.id,
            email: email.toLowerCase(),
            app_metadata: {},
            user_metadata: { role: demoProf.role, full_name: demoProf.fullName },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as unknown as User;

          localStorage.setItem('demo_session_email', email.toLowerCase());
          setUser(fakeUser);
          setProfile(demoProf);
          return { user: fakeUser, profile: demoProf };
        }
      }

      throw new Error(error.message || 'Invalid login credentials');
    }

    if (!data.user) throw new Error('User account not found');

    const userProfile = await fetchProfile(data.user);

    if (!userProfile.isActive) {
      await supabase.auth.signOut();
      throw new Error('Your account has been disabled. Please contact your administrator.');
    }

    setUser(data.user);
    setSession(data.session);
    setProfile(userProfile);

    return { user: data.user, profile: userProfile };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error signing out from Supabase:', err);
    } finally {
      localStorage.removeItem('demo_session_email');
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, profile, loading, signIn, signOut, updateProfileAvatar }),
    [user, session, profile, loading, signIn, signOut, updateProfileAvatar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
