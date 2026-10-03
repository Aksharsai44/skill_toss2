import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';

export function ChangePasswordForm() {
  const navigate = useNavigate();
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('The password confirmation does not match.');
      return;
    }
    try {
      setSubmitting(true);
      await changePassword(currentPassword, password, confirmation);
      navigate('/login?password=changed', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password could not be changed.');
    } finally {
      setSubmitting(false);
    }
  };

  return <form onSubmit={submit} className="space-y-4">
    {error && <div role="alert" className="rounded-control border border-error-200 bg-error-50 p-3 text-sm text-error-700">{error}</div>}
    <div><label className="label" htmlFor="account-current-password">Current password</label><input id="account-current-password" className="input" type="password" autoComplete="current-password" required disabled={submitting} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>
    <div><label className="label" htmlFor="account-new-password">New password</label><input id="account-new-password" className="input" type="password" autoComplete="new-password" minLength={8} required disabled={submitting} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
    <div><label className="label" htmlFor="account-confirm-password">Confirm new password</label><input id="account-confirm-password" className="input" type="password" autoComplete="new-password" minLength={8} required disabled={submitting} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
    <p className="text-xs leading-5 text-ink-500">Changing your password signs out every existing SkillToss session, including this one.</p>
    <button type="submit" disabled={submitting} className="btn-primary justify-center">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Changing password…</> : 'Change password and sign out'}</button>
  </form>;
}
