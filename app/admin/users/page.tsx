'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useAuth } from '@/components/AdminGuard';

interface UserInfo {
  id: number;
  email: string;
  display_name: string;
  role: string;
  developer_id: number | null;
  is_family: number;
  must_change_password: number;
  created_at: string;
  updated_at: string;
}

interface Developer {
  id: number;
  name: string;
  avatar_emoji: string;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'family_dev', label: 'Family Dev' },
  { value: 'outside_dev', label: 'Outside Dev' },
];

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

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('outside_dev');
  const [developerId, setDeveloperId] = useState<number | ''>('');
  const [isFamily, setIsFamily] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [usersRes, devsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/developers'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }
      if (devsRes.ok) {
        const data = await devsRes.json();
        setDevelopers(data.developers);
      }
    } catch {
      // Silent failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!email.trim() || !displayName.trim()) {
      setAddError('Email and display name are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          role,
          developerId: developerId || undefined,
          isFamily,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setAddSuccess(`User "${displayName}" created with default password.`);
        setEmail('');
        setDisplayName('');
        setRole('outside_dev');
        setDeveloperId('');
        setIsFamily(false);
        loadData();
      } else {
        setAddError(data.error || 'Failed to create user.');
      }
    } catch {
      setAddError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(id: number, newRole: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'updateRole', role: newRole }),
    });
    loadData();
  }

  async function handleResetPassword(id: number, name: string) {
    if (!confirm(`Reset password for "${name}" to default (changeme123)?`)) return;
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'resetPassword' }),
    });
    loadData();
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete' }),
    });
    loadData();
  }

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg opacity-60" style={{ color: 'var(--text)' }}>
          Access denied. Super admin only.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg opacity-60" style={{ color: 'var(--text)' }}>
          Loading users...
        </p>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold font-fredoka" style={{ color: 'var(--text)' }}>
          {'\u{1F465}'} User Management
        </h2>
        <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>
          Manage user accounts, roles, and passwords.
        </p>
      </div>

      {/* Add user form */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h3 className="text-lg font-bold font-fredoka mb-4" style={{ color: 'var(--text)' }}>
          {'\u{2795}'} Add User
        </h3>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Email *
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="user-name" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Display Name *
              </label>
              <input
                id="user-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Ezekiel"
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="user-role" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Role *
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={inputStyle}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="user-dev" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Link to Developer (optional)
              </label>
              <select
                id="user-dev"
                value={developerId}
                onChange={(e) => setDeveloperId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={inputStyle}
              >
                <option value="">None</option>
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.avatar_emoji} {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="user-family"
              type="checkbox"
              checked={isFamily}
              onChange={(e) => setIsFamily(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="user-family" className="text-sm" style={{ color: 'var(--text)' }}>
              Family member (exempt from fees)
            </label>
          </div>

          {addError && (
            <p className="text-red-500 text-sm font-medium" role="alert">{addError}</p>
          )}
          {addSuccess && (
            <p className="text-green-500 text-sm font-medium" role="status">{addSuccess}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create User'}
          </button>

          <p className="text-xs opacity-40" style={{ color: 'var(--text)' }}>
            New users get the default password &quot;changeme123&quot; and must change it on first login.
          </p>
        </form>
      </div>

      {/* Users list */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h3 className="text-lg font-bold font-fredoka mb-4" style={{ color: 'var(--text)' }}>
          All Users ({users.length})
        </h3>

        {users.length === 0 ? (
          <p className="text-sm opacity-50" style={{ color: 'var(--text)' }}>
            No users found.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const badge = roleBadge(u.role);
              const isSelf = u.id === currentUser?.userId;

              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--text)' }}>
                      {u.display_name}
                      {isSelf && (
                        <span className="text-xs opacity-40 ml-2">(you)</span>
                      )}
                      {u.is_family === 1 && (
                        <span className="text-xs ml-2 opacity-60">{'\u{1F3E0}'} Family</span>
                      )}
                    </p>
                    <p className="text-xs opacity-50" style={{ color: 'var(--text)' }}>
                      {u.email}
                      {u.must_change_password === 1 && (
                        <span className="text-yellow-500 ml-2">(must change password)</span>
                      )}
                    </p>
                  </div>

                  {/* Role badge */}
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Role change */}
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className="px-2 py-1 rounded-lg text-xs outline-none cursor-pointer"
                      style={inputStyle}
                      title="Change role"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>

                    {/* Reset password */}
                    <button
                      onClick={() => handleResetPassword(u.id, u.display_name)}
                      className="p-2 rounded-lg text-xs hover:opacity-80 transition-opacity cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#f59e0b',
                      }}
                      title="Reset password to default"
                    >
                      {'\u{1F511}'}
                    </button>

                    {/* Delete */}
                    {!isSelf && (
                      <button
                        onClick={() => handleDelete(u.id, u.display_name)}
                        className="p-2 rounded-lg text-xs hover:opacity-80 transition-opacity cursor-pointer"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                        }}
                        title="Delete user"
                      >
                        {'\u{1F5D1}'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
