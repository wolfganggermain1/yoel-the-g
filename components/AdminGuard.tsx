'use client';

import { useEffect, useState, FormEvent, ReactNode } from 'react';

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/admin/login');
        const data = await res.json();
        setStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
      } catch {
        setStatus('unauthenticated');
      }
    }
    check();
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus('authenticated');
        setPassword('');
      } else {
        setError(data.error || 'Wrong password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setStatus('unauthenticated');
    setPassword('');
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">&#9881;&#65039;</div>
          <p className="text-lg" style={{ color: 'var(--text)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">&#128272;</div>
            <h1
              className="text-2xl font-bold font-fredoka"
              style={{ color: 'var(--text)' }}
            >
              Admin Login
            </h1>
            <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text)' }}>
              Enter the admin password to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="sr-only">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-lg outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center font-medium" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Checking...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated: render children with logout in header
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="flex items-center justify-between px-4 py-2 text-sm"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="font-medium opacity-60" style={{ color: 'var(--text)' }}>
          &#128100; Admin
        </span>
        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
          style={{
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}
