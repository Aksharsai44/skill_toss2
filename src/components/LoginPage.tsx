import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Loader2, CheckCircle2, Check } from 'lucide-react';
import { ROLE_HOME_ROUTES, useAuth } from '@/lib/authContext';
import type { UserRole } from '@/lib/types';
import { fadeOut } from '@/lib/motion';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  isDemoQuickSelectEnabled,
  type DemoAccount,
} from '@/lib/demoAccounts';
import { cn } from '@/lib/cn';

/** Stores only the email address, on this device, when "Remember my email" is checked. */
const REMEMBERED_EMAIL_KEY = 'skill-toss-remembered-email';

type ResetState = { kind: 'idle' | 'sending' | 'sent' | 'error'; message: string };

export function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '');
  const [rememberEmail, setRememberEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) !== null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [reset, setReset] = useState<ResetState>({ kind: 'idle', message: '' });
  const panelRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

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
      // Persist the email only when the box is checked, so checking it before typing still works.
      if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      // The authenticated profile decides the destination, never the selected demo button.
      const { profile: userProfile } = await signIn(email.trim(), password);
      const targetRoute = ROLE_HOME_ROUTES[userProfile.role] || '/student';
      if (panelRef.current) fadeOut(panelRef.current, () => navigate(targetRoute, { replace: true }));
      else navigate(targetRoute, { replace: true });
    } catch (err: unknown) {
      setIsTransitioning(false);
      const fallback = 'Failed to sign in. Please check your credentials.';
      const message = err instanceof Error ? err.message || fallback : fallback;
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setSelectedDemoRole(account.profile.role);
    setErrorMessage(null);
    // Move focus to Sign In so the next keystroke completes the flow; the fields stay editable.
    submitRef.current?.focus();
  };

  // Manual edits win: drop the selected state as soon as the form no longer matches.
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, value.trim());
    if (reset.kind !== 'idle') setReset({ kind: 'idle', message: '' });
    if (selectedDemoRole) setSelectedDemoRole(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (selectedDemoRole) setSelectedDemoRole(null);
  };

  const handleRememberChange = (checked: boolean) => {
    setRememberEmail(checked);
    if (checked) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  };

  const sendResetLink = async () => {
    const target = email.trim();
    if (!target) {
      setReset({ kind: 'error', message: 'Enter your email address in the field above first.' });
      return;
    }
    setReset({ kind: 'sending', message: '' });
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setReset({ kind: 'error', message: error.message });
      return;
    }
    // Deliberately does not confirm whether the account exists.
    setReset({
      kind: 'sent',
      message: `If an account exists for ${target}, a reset link has been sent. Check your inbox and spam folder.`,
    });
  };

  return (
    <div ref={panelRef} className="min-h-screen bg-ink-50 flex flex-col justify-center py-10 sm:py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <button
          aria-label="Return to Skill Toss home"
          className="mx-auto flex justify-center items-center gap-3 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold font-display text-xl shadow-soft">
            ST
          </div>
          <span className="font-bold font-display text-2xl text-ink-900">Skill Toss</span>
        </button>
        <h1 className="mt-7 text-center text-3xl font-bold text-ink-950 font-display">
          Sign in to your account
        </h1>
        <p className="mt-2.5 text-center text-sm text-ink-500">
          Enter your credentials to access your portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-7 px-5 shadow-card rounded-dialog sm:px-8 border border-ink-200">
          {errorMessage && (
            <div id="login-error" role="alert" aria-live="assertive" className="mb-6 p-3.5 rounded-control bg-error-50 border border-error-100 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-error-600 shrink-0 mt-px" />
              <div className="text-sm leading-6 text-error-700 font-medium">{errorMessage}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <div className="relative">
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
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                  aria-describedby={errorMessage ? 'login-error' : undefined}
                  className="input pl-10 pr-3"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
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
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  aria-describedby={errorMessage ? 'login-error' : undefined}
                  className="input pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-ink-400 hover:text-ink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40 rounded-r-control"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-ink-300 rounded-sm focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-ink-600 cursor-pointer">
                  Remember my email
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowReset((open) => !open)}
                aria-expanded={showReset}
                aria-controls="password-reset-panel"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Forgot password?
              </button>
            </div>

            {showReset && (
              <div
                id="password-reset-panel"
                className="rounded-control border border-ink-200 bg-ink-50 p-3.5 animate-fade-in"
              >
                {isSupabaseConfigured ? (
                  <>
                    <p className="text-sm leading-6 text-ink-600">
                      We&rsquo;ll email a reset link to the address entered above.
                    </p>
                    <button
                      type="button"
                      onClick={sendResetLink}
                      disabled={reset.kind === 'sending'}
                      className="btn-secondary mt-2.5 text-sm"
                    >
                      {reset.kind === 'sending' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                        </>
                      ) : (
                        'Send reset link'
                      )}
                    </button>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-ink-600">
                    Password reset needs a configured Supabase project. This environment uses placeholder
                    credentials, so no reset email can be sent — contact your administrator instead.
                  </p>
                )}
                {reset.kind === 'sent' && (
                  <p role="status" className="mt-2.5 flex items-start gap-2 text-sm leading-6 text-success-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-1" aria-hidden="true" />
                    <span>{reset.message}</span>
                  </p>
                )}
                {reset.kind === 'error' && (
                  <p role="alert" className="mt-2.5 flex items-start gap-2 text-sm leading-6 text-error-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-1" aria-hidden="true" />
                    <span>{reset.message}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <button
                ref={submitRef}
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

          {isDemoQuickSelectEnabled && (
            <div className="mt-8 pt-6 border-t border-ink-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                <Sparkles className="w-3.5 h-3.5 text-ink-400" aria-hidden="true" />
                <span>Demo quick select</span>
              </div>
              {/* Two columns until `sm`, because "Product Admin" truncates in a 3-column row at 375px. */}
              <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label="Demo quick select roles">
                {DEMO_ACCOUNTS.map((account) => {
                  const isSelected = selectedDemoRole === account.profile.role;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => selectDemoAccount(account)}
                      aria-pressed={isSelected}
                      disabled={isSubmitting}
                      className={cn(
                        'min-h-11 px-2 py-2 flex items-center justify-center gap-1 text-xs font-medium rounded-control border transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-ring',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 text-primary-800 font-semibold'
                          : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 hover:text-ink-900 hover:border-ink-300',
                      )}
                      title={`Fill the ${account.label} email and demo password (${account.email})`}
                    >
                      {/* A shape as well as a colour, so the selection is not conveyed by colour alone. */}
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                      <span className="truncate">{account.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-ink-500">
                Fills the form only — you still press Sign In, and the signed-in profile decides which
                portal opens. Available in development builds; excluded from a production build unless
                <code className="mx-1 font-mono text-[11px] text-ink-600">VITE_ENABLE_DEMO_LOGIN=true</code>
                is set for it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
