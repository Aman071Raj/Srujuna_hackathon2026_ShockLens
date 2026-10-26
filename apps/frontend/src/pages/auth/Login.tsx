import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { auth, enableGuestMode } from '../../lib/api';
import { supabase, usesSupabaseAuth } from '../../lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = () => {
    enableGuestMode();
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    navigate('/app/overview');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await auth.login({ email, password });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/app/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first, then choose reset password.');
      return;
    }
    if (!supabase) {
      setError('Password reset becomes available after Supabase Auth is configured for this project.');
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) throw resetError;
      setNotice('If an account exists for this email, Supabase will send a password reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="brand-lockup mb-8 text-2xl">
          <span className="brand-mark" aria-hidden="true">SL</span>
          <span>SHOCKLENS</span>
        </Link>

        <div className="neo-card p-8">
          <h1 className="font-heading font-extrabold text-3xl mb-2">SIGN IN</h1>
          <p className="font-body text-muted-foreground mb-8">
            Welcome back. Access your portfolios and analyses.
          </p>

          {error && (
            <div role="alert" className="bg-coral/10 border border-coral border-l-4 p-3 mb-6 font-body text-sm text-coral font-semibold">
              {error}
            </div>
          )}

          {notice && (
            <div role="status" aria-live="polite" className="bg-yellow/30 border border-black border-l-4 p-3 mb-6 font-body text-sm">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-heading font-bold text-sm block mb-2" htmlFor="email">
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border-2 border-black rounded-sm px-4 py-3 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="font-heading font-bold text-sm block mb-2" htmlFor="password">
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-black rounded-sm px-4 py-3 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
                placeholder="Your password"
              />
              {usesSupabaseAuth && (
                <button type="button" onClick={handlePasswordReset} disabled={loading} className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest underline underline-offset-4 disabled:opacity-50">
                  RESET PASSWORD
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-yellow w-full py-4 text-lg"
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-black/20"></div>
              <span className="flex-shrink mx-4 text-xs font-mono font-bold text-muted-foreground uppercase">Or Explore Instantly</span>
              <div className="flex-grow border-t border-black/20"></div>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-3.5 px-4 bg-white border-2 border-black rounded-sm font-heading font-bold text-sm hover:bg-black hover:text-yellow transition-all shadow-neo-sm"
            >
              ⚡ 1-CLICK GUEST / JUDGE ACCESS →
            </button>
          </form>

          <p className="mt-8 text-center font-body text-sm">
            No account?{' '}
            <Link to="/register" className="font-semibold underline hover:text-coral">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
