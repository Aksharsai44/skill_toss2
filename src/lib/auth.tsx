import { useCallback, useEffect, useState, useMemo, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole, UserProfile } from '@/lib/types';
import { AuthContext, type AuthContextValue } from '@/lib/authContext';
import { putAttachment, getAttachment, removeAttachment } from '@/lib/attachmentStorage';
import type { SubmissionAttachment } from '@/lib/types';

// Fallback mock profiles for quick demo accounts if Supabase profiles table is empty or offline
const DEMO_PROFILES: Record<string, UserProfile> = {
  'productadmin@skilltoss.demo': {
    id: 'demo-product-admin-id',
    fullName: 'Aarav Mehta',
    role: 'product_admin',
    institutionId: 'inst_hq',
    isActive: true,
  },
  'superadmin@skilltoss.demo': {
    id: 'demo-super-admin-id',
    fullName: 'Priya Nair',
    role: 'super_admin',
    institutionId: 'inst_group_01',
    isActive: true,
  },
  'admin@skilltoss.demo': {
    id: 'demo-admin-id',
    fullName: 'Rahul Sharma',
    role: 'admin',
    institutionId: 'inst_college_01',
    isActive: true,
  },
  'teacher@skilltoss.demo': {
    id: 'demo-teacher-id',
    fullName: 'Sneha Kapoor',
    role: 'teacher',
    institutionId: 'inst_college_01',
    isActive: true,
  },
  'student@skilltoss.demo': {
    id: 'demo-student-id',
    fullName: 'Arjun Verma',
    role: 'student',
    institutionId: 'inst_college_01',
    isActive: true,
  },
  'parent@skilltoss.demo': {
    id: 'demo-parent-id',
    fullName: 'Rajesh Verma',
    role: 'parent',
    institutionId: 'inst_college_01',
    isActive: true,
  },
};

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

  // Helper function to fetch or resolve profile
  const fetchProfile = useCallback(async (authUser: User): Promise<UserProfile> => {
    // 1. Try to fetch from Supabase `profiles` table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          fullName: data.full_name,
          role: data.role as UserRole,
          institutionId: data.institution_id || null,
          avatarUrl: data.avatar_url,
          isActive: data.is_active ?? true,
        };
      }
    } catch (err) {
      console.warn('Could not query profiles table from Supabase:', err);
    }

    // 2. Fallback to demo profile matching email if available
    const emailLower = authUser.email?.toLowerCase() || '';
    if (DEMO_PROFILES[emailLower]) {
      return {
        ...DEMO_PROFILES[emailLower],
        id: authUser.id,
      };
    }

    // 3. Fallback: infer from user metadata or default to student
    const roleFromMeta = (authUser.user_metadata?.role as UserRole) || 'student';
    return {
      id: authUser.id,
      fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      role: roleFromMeta,
      institutionId: authUser.user_metadata?.institution_id || null,
      isActive: true,
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
            setSession(data.session);
            setUser(data.session.user);
            const userProfile = await fetchProfile(data.session.user);
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
        setSession(newSession);
        setUser(newSession.user);
        const userProfile = await fetchProfile(newSession.user);
        setProfile(userProfile);
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
    // 1. Try real Supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Demo fallback: If offline or using demo accounts without live Supabase DB, allow demo logins
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
