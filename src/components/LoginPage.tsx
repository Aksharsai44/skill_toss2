import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, Sparkles,
} from 'lucide-react';
import { ROLE_HOME_ROUTES, useAuth } from '@/lib/authContext';
import { forgotPassword } from '@/lib/djangoApi';
import { cn } from '@/lib/cn';
import { DEMO_ACCOUNTS, isDemoQuickSelectEnabled, type DemoAccount } from '@/lib/demoAccounts';
import { fadeOut } from '@/lib/motion';
import type { UserRole } from '@/lib/types';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const notice = sessionStorage.getItem('skill-toss-auth-notice');
    sessionStorage.removeItem('skill-toss-auth-notice');
    return notice;
  });
  const [successMessage] = useState<string | null>(() => {
    const result = new URLSearchParams(window.location.search).get('password');
    if (result === 'set') return 'Password set successfully. Sign in with your new password.';
    if (result === 'reset' || result === 'changed') return 'Password updated. Sign in again on every device.';
    return null;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [reset, setReset] = useState<ResetState>({ kind: 'idle', message: '' });
  const panelRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  if (!isTransitioning && !authLoading && user && profile) {
    return <Navigate to={ROLE_HOME_ROUTES[profile.role]} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    try {
      setIsSubmitting(true);
      setIsTransitioning(true);
      if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      const authenticated = await signIn(email.trim(), password);
      const target = ROLE_HOME_ROUTES[authenticated.profile.role];
      if (panelRef.current) fadeOut(panelRef.current, () => navigate(target, { replace: true }));
      else navigate(target, { replace: true });
    } catch (error) {
      setIsTransitioning(false);
      const message = error instanceof Error ? error.message : 'Failed to sign in. Please check your credentials.';
      setErrorMessage(message.toLowerCase().includes('inactive')
        ? 'This account is disabled or awaiting setup. Contact your administrator.'
        : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword('');
    setSelectedDemoRole(account.profile.role);
    setErrorMessage(null);
    submitRef.current?.focus();
  };

  const sendResetLink = async () => {
    const target = email.trim();
    if (!target) {
      setReset({ kind: 'error', message: 'Enter your email address in the field above first.' });
      return;
    }
    setReset({ kind: 'sending', message: '' });
    try {
      await forgotPassword(target);
      setReset({
        kind: 'sent',
        message: `If an account exists for ${target}, a reset link has been sent. Check your inbox and spam folder.`,
      });
    } catch (error) {
      setReset({ kind: 'error', message: error instanceof Error ? error.message : 'The reset request could not be sent.' });
    }
  };

  return (
    <div ref={panelRef} className="relative flex min-h-screen flex-col justify-center bg-ink-50 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <button aria-label="Return to Skill Toss home" onClick={() => navigate('/')} className="focus-ring mx-auto flex items-center justify-center gap-3 rounded-control">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 font-display text-xl font-bold text-white shadow-soft">ST</div>
          <span className="font-display text-2xl font-bold text-ink-900">Skill Toss</span>
        </button>
        <h1 className="mt-7 text-center font-display text-3xl font-bold text-ink-950">Sign in to your account</h1>
        <p className="mt-2.5 text-center text-sm text-ink-500">Enter your credentials to access your portal</p>
      </div>

      <div className="z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-dialog border border-ink-200 bg-white px-5 py-7 shadow-card sm:px-8">
          {errorMessage && <div role="alert" className="mb-6 flex items-start gap-3 rounded-control border border-error-100 bg-error-50 p-3.5 text-sm font-medium leading-6 text-error-700"><AlertCircle className="mt-px h-5 w-5 shrink-0" />{errorMessage}</div>}
          {successMessage && <div role="status" className="mb-6 flex items-start gap-3 rounded-control border border-success-200 bg-success-50 p-3.5 text-sm font-medium leading-6 text-success-700"><CheckCircle2 className="mt-px h-5 w-5 shrink-0" />{successMessage}</div>}

          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" /><input id="email" type="email" autoComplete="email" required className="input pl-10" value={email} onChange={(event) => { setEmail(event.target.value); setSelectedDemoRole(null); setReset({ kind: 'idle', message: '' }); if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, event.target.value.trim()); }} /></div>
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className="input px-10" value={password} onChange={(event) => { setPassword(event.target.value); setSelectedDemoRole(null); }} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((shown) => !shown)} className="focus-ring absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-control text-ink-500">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center text-sm text-ink-600"><input type="checkbox" checked={rememberEmail} onChange={(event) => { setRememberEmail(event.target.checked); if (event.target.checked) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim()); else localStorage.removeItem(REMEMBERED_EMAIL_KEY); }} className="mr-2 h-4 w-4 rounded-sm border-ink-300 text-primary-600" />Remember my email</label>
              <button type="button" onClick={() => setShowReset((open) => !open)} aria-expanded={showReset} className="focus-ring rounded text-sm font-medium text-primary-600 hover:text-primary-700">Forgot password?</button>
            </div>

            {showReset && <div className="rounded-control border border-ink-200 bg-ink-50 p-3.5">
              <p className="text-sm leading-6 text-ink-600">We&rsquo;ll email a reset link to the address entered above.</p>
              <button type="button" onClick={sendResetLink} disabled={reset.kind === 'sending'} className="btn-secondary mt-2.5 text-sm">{reset.kind === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send reset link'}</button>
              {reset.kind === 'sent' && <p role="status" className="mt-2.5 flex gap-2 text-sm leading-6 text-success-700"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{reset.message}</p>}
              {reset.kind === 'error' && <p role="alert" className="mt-2.5 flex gap-2 text-sm leading-6 text-error-700"><AlertCircle className="mt-1 h-4 w-4 shrink-0" />{reset.message}</p>}
            </div>}

            <button ref={submitRef} type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3 text-base">{isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing in…</> : <>Sign In <ArrowRight className="h-5 w-5" /></>}</button>
          </form>

          {isDemoQuickSelectEnabled && <div className="mt-8 border-t border-ink-100 pt-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500"><Sparkles className="h-3.5 w-3.5" /><span>Development quick select</span></div>
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Development account quick select">
              {DEMO_ACCOUNTS.map((account) => <button key={account.email} type="button" onClick={() => selectDemoAccount(account)} aria-pressed={selectedDemoRole === account.profile.role} disabled={isSubmitting} className={cn('focus-ring flex min-h-11 items-center justify-center gap-1 rounded-control border px-2 py-2 text-xs font-medium', selectedDemoRole === account.profile.role ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50')}>{selectedDemoRole === account.profile.role && <Check className="h-3.5 w-3.5" />}<span className="truncate">{account.label}</span></button>)}
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-500">Fills the Django login form only. The backend account and <code>/api/auth/me/</code> response determine access.</p>
          </div>}
        </div>
      </div>
    </div>
  );
}
