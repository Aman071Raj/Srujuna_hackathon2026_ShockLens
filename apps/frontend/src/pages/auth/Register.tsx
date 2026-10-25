import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '../../lib/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await auth.register({ name, email, password });
      if (result.confirmationRequired) {
        setNotice('Account created. Check your inbox and confirm your email using the link before signing in.');
        setPassword('');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/app/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <h1 className="font-heading font-extrabold text-3xl mb-2">CREATE ACCOUNT</h1>
          <p className="font-body text-muted-foreground mb-8">
            Free to use. No credit card required.
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
              <label className="font-heading font-bold text-sm block mb-2" htmlFor="name">
                YOUR NAME
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border-2 border-black rounded-sm px-4 py-3 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
                placeholder="Your full name"
              />
            </div>
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-black rounded-sm px-4 py-3 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
                placeholder="Minimum 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-yellow w-full py-4 text-lg"
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
            </button>
          </form>

          <p className="mt-8 text-center font-body text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold underline hover:text-coral">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
