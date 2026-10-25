import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Confirming your account…');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let unsubscribeAuth: (() => void) | null = null;
    const complete = async () => {
      if (!supabase) {
        setError('Supabase Auth is not configured for this website.');
        setMessage('');
        return;
      }
      let recoveryDetected = `${window.location.hash}${window.location.search}`.includes('type=recovery');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
        if (event === 'PASSWORD_RECOVERY') {
          recoveryDetected = true;
          if (active) {
            setIsRecovery(true);
            setMessage('Choose a new password for your account.');
          }
        }
      });
      unsubscribeAuth = () => subscription.unsubscribe();
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          throw new Error('The confirmation link is invalid or expired. Request a new link and try again.');
        }
        if (recoveryDetected) {
          setIsRecovery(true);
          setMessage('Choose a new password for your account.');
          return;
        }
        await auth.me();
        if (active) navigate('/app/overview', { replace: true });
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not complete authentication.');
          setMessage('');
        }
      }
    };
    void complete();
    return () => {
      active = false;
      unsubscribeAuth?.();
    };
  }, [navigate]);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!supabase) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await auth.me();
      navigate('/app/overview', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <section className="neo-card w-full max-w-md p-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-5">ShockLens / Authentication</p>
        <h1 className="font-heading font-extrabold text-2xl mb-4">{error ? 'AUTHENTICATION ISSUE' : isRecovery ? 'RESET PASSWORD' : 'VERIFYING'}</h1>
        {message && <p role="status" aria-live="polite" className="font-body text-sm text-muted-foreground mb-5">{message}</p>}
        {isRecovery && !error && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <label htmlFor="new-password" className="block font-mono text-[10px] font-bold uppercase tracking-widest">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} className="w-full border-2 border-black bg-white px-4 py-3" placeholder="At least 8 characters" />
            <button type="submit" disabled={saving} className="btn-yellow w-full py-3">{saving ? 'UPDATING…' : 'SAVE NEW PASSWORD →'}</button>
          </form>
        )}
        {error && <div role="alert" className="border border-coral border-l-4 bg-coral/10 p-3 font-body text-sm text-coral">{error}</div>}
        {error && <Link to="/login" className="btn-yellow w-full mt-6 py-3">RETURN TO SIGN IN →</Link>}
      </section>
    </main>
  );
}
