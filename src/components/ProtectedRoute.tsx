import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth, ROLE_HOME_ROUTES } from '@/lib/auth';
import { DashboardLayout } from '@/components/DashboardLayout';
import type { UserRole } from '@/lib/types';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  // 1. Loading state while restoring session or fetching user profile
  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-ink-600">Verifying session & permissions...</p>
      </div>
    );
  }

  // 2. Unauthenticated user -> Redirect to unified /login page
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // 3. Disabled account check
  if (!profile.isActive) {
    return <Navigate to="/login" replace />;
  }

  // 4. Role Authorization check: If profile.role is not allowed for this route,
  // intelligently redirect user back to their own home dashboard.
  if (!allowedRoles.includes(profile.role)) {
    const userHomeRoute = ROLE_HOME_ROUTES[profile.role] || '/student';
    return <Navigate to={userHomeRoute} replace />;
  }

  // 5. Authorized user -> render protected portal layout
  return <DashboardLayout>{children}</DashboardLayout>;
}
