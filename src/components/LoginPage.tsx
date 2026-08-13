import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { ROLE_HOME_ROUTES, useAuth } from '@/lib/authContext';
import type { UserRole } from '@/lib/types';
import { fadeOut } from '@/lib/motion';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // If already authenticated and profile loaded, redirect immediately to their dashboard
  if (!isTransitioning && !authLoading && user && profile) {
    const targetRoute = ROLE_HOME_ROUTES[profile.role] || '/student';
    return <Navigate to={targetRoute} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setIsTransitioning(true);
      const { profile: userProfile } = await signIn(email.trim(), password);
      const targetRoute = ROLE_HOME_ROUTES[userProfile.role] || '/student';
      if (panelRef.current) fadeOut(panelRef.current, () => navigate(targetRoute, { replace: true }));
      else navigate(targetRoute, { replace: true });
    } catch (err: unknown) {
      setIsTransitioning(false);
      if (err instanceof Error) {
        setErrorMessage(err.message || 'Failed to sign in. Please check your credentials.');
      } else {
        setErrorMessage('Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setErrorMessage(null);
  };

  const demoAccounts: { label: string; email: string; role: UserRole }[] = [
    { label: 'Product Admin', email: 'productadmin@skilltoss.demo', role: 'product_admin' },
    { label: 'Super Admin', email: 'superadmin@skilltoss.demo', role: 'super_admin' },
    { label: 'Admin', email: 'admin@skilltoss.demo', role: 'admin' },
    { label: 'Teacher', email: 'teacher@skilltoss.demo', role: 'teacher' },
    { label: 'Student', email: 'student@skilltoss.demo', role: 'student' },
    { label: 'Parent', email: 'parent@skilltoss.demo', role: 'parent' },
  ];

  return (
    <div ref={panelRef} className="min-h-screen bg-ink-50 flex flex-col justify-center py-10 sm:py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <button
          aria-label="Return to Skill Toss home"
          className="mx-auto flex justify-center items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold font-display text-xl shadow-soft">
            ST
          </div>
          <span className="font-bold font-display text-2xl text-ink-900">Skill Toss</span>
        </button>
        <h1 className="mt-7 text-center text-3xl font-bold text-ink-950 font-display tracking-[-0.025em]">
          Sign in to your account
        </h1>
        <p className="mt-2 text-center text-sm text-ink-500">
          Enter your credentials to access your portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-7 px-5 shadow-card rounded-dialog sm:px-8 border border-ink-200">
          {errorMessage && (
            <div id="login-error" role="alert" aria-live="assertive" className="mb-6 p-4 rounded-xl bg-danger-50 border border-danger-100 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-danger-600 shrink-0 mt-0.5" />
              <div className="text-sm text-danger-700 font-medium">{errorMessage}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-ink-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                  aria-describedby={errorMessage ? 'login-error' : undefined}
                  className="input pl-10 pr-3"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-ink-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  aria-describedby={errorMessage ? 'login-error' : undefined}
                  className="input pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-ink-400 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/30 rounded-r-xl"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-ink-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-ink-600">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Please contact your administrator to reset your password.');
                  }}
                  className="font-medium text-primary-600 hover:text-primary-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-3 text-base flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                    <span className="sr-only" aria-live="polite">Signing in</span>
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-8 pt-6 border-t border-ink-100">
            <div className="flex items-center gap-1.5 text-xs text-ink-500 font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" /> Demo Quick Select
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {demoAccounts.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => fillDemoAccount(demo.email)}
                  className="min-h-9 px-2.5 py-1.5 text-xs font-medium border border-ink-200 rounded-lg text-ink-700 bg-ink-50 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 active:scale-[0.98] text-left truncate"
                  title={`Fill ${demo.label} (${demo.email})`}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
