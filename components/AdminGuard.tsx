'use client';

import { useEffect, useState, FormEvent, ReactNode, createContext, useContext } from 'react';

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

interface AuthUser {
  userId: number;
  email: string;
  displayName: string;
  role: string;
  developerId: number | null;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ---------------------------------------------------------------------------
// Role display helpers
// ---------------------------------------------------------------------------

function roleBadge(role: string): { label: string; color: string; bg: string } {
  switch (role) {
    case 'super_admin':
      return { label: 'Super Admin', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    case 'admin':
      return { label: 'Admin', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
    case 'family_dev':
      return { label: 'Family Dev', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' };
    case 'outside_dev':
      return { label: 'Developer', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' };
    default:
      return { label: role, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' };
  }
}

// ---------------------------------------------------------------------------
// Change Password Prompt
// ---------------------------------------------------------------------------

function ChangePasswordPrompt({ onComplete }: { onComplete: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        onComplete();
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  };

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
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{'\uD83D\uDD11'}</div>
          <h1 className="text-2xl font-bold font-fredoka" style={{ color: 'var(--text)' }}>
            Change Your Password
          </h1>
          <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text)' }}>
            You must change your default password before continuing
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current-pw" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Current Password
            </label>
            <input
              id="current-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-lg outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="new-pw" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              New Password
            </label>
            <input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-lg outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Confirm New Password
            </label>
            <input
              id="confirm-pw"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-lg outline-none focus:ring-2"
              style={inputStyle}
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
            {submitting ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminGuard component
// ---------------------------------------------------------------------------

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/admin/login');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
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
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setStatus('authenticated');
        setEmail('');
        setPassword('');
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setUser(null);
    setStatus('unauthenticated');
    setEmail('');
    setPassword('');
  }

  // Loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">{'\u2699\uFE0F'}</div>
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
            <div className="text-5xl mb-3">{'\uD83D\uDD10'}</div>
            <h1 className="text-2xl font-bold font-fredoka" style={{ color: 'var(--text)' }}>
              Admin Login
            </h1>
            <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text)' }}>
              Sign in with your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="you@yoeltheg.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-lg outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
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
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Must change password
  if (user?.mustChangePassword) {
    return (
      <ChangePasswordPrompt
        onComplete={() => {
          setUser({ ...user, mustChangePassword: false });
        }}
      />
    );
  }

  // Authenticated
  const badge = user ? roleBadge(user.role) : null;

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <div
          className="flex items-center justify-between px-4 py-2 text-sm"
          style={{
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-medium opacity-60" style={{ color: 'var(--text)' }}>
              {'\uD83D\uDC64'} {user?.displayName ?? 'Admin'}
            </span>
            {badge && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            )}
          </div>
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
    </AuthContext.Provider>
  );
}
