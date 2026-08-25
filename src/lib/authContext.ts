import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '@/lib/types';

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  product_admin: '/product-admin', super_admin: '/super-admin', admin: '/admin',
  teacher: '/teacher', student: '/student', parent: '/student',
};

export type AuthContextValue = {
  user: User | null; session: Session | null; profile: UserProfile | null; loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User; profile: UserProfile }>;
  signOut: () => Promise<void>;
  updateProfileAvatar: (file: File | null) => Promise<void>;
  impersonate: (role: UserRole, institutionId: string) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
