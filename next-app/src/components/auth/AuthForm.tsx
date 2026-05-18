'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export function AuthForm() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      const errMsg =
        mode === 'login'
          ? await login(email.trim(), password)
          : await signup(email.trim(), password);
      if (errMsg) setError(errMsg);
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card w-full max-w-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)' }}
          >
            K
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#e1e1e9]">Knowledge Dashboard</h1>
            <p className="text-xs text-[#6b6b7b]">sign in to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="glass-input text-sm"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
          <input
            className="glass-input text-sm"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <p className="text-[#f87171] text-sm">{error}</p>
          )}

          <button
            className="btn-primary w-full text-sm"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6b6b7b]">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                className="text-[#818cf8] hover:underline"
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className="text-[#818cf8] hover:underline"
                onClick={() => { setMode('login'); setError(null); }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
