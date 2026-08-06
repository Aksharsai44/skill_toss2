import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '@/lib/types';

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  institution?: string;
};

type AuthContextValue = {
  user: User | null;
  login: (role: Role, name?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const roleDefaults: Record<Role, { name: string; email: string; institution: string }> = {
  'product-admin': { name: 'Aarav Mehta', email: 'aarav@skilltoss.com', institution: 'Skill Toss HQ' },
  'super-admin': { name: 'Priya Nair', email: 'priya@brightfuture.edu', institution: 'Bright Future Group' },
  admin: { name: 'Rahul Sharma', email: 'rahul@brightfuture.edu', institution: 'Bright Future College' },
  teacher: { name: 'Sneha Kapoor', email: 'sneha@brightfuture.edu', institution: 'Bright Future College' },
  student: { name: 'Arjun Verma', email: 'arjun@student.com', institution: 'Bright Future College' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (role, name) => {
        const d = roleDefaults[role];
        setUser({
          id: crypto.randomUUID(),
          name: name || d.name,
          email: d.email,
          role,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || d.name)}&backgroundColor=2563eb,0891b2,16a34a,d97706&textColor=ffffff`,
          institution: d.institution,
        });
      },
      logout: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
