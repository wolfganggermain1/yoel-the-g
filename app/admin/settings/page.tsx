'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/AdminGuard';

interface KeyStatus {
  set: boolean;
  source: 'env' | 'admin' | null;
  last4: string | null;
}

const cardStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--card-shadow)',
};

const inputStyle = {
  backgroundColor: 'var(--bg)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
};

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setStatus(d.anthropicKey ?? null))
      .catch(() => setError('Could not load settings.'));
  }, [user?.role]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropicKey: key }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.anthropicKey);
        setKey('');
        setMessage('Key checked and saved. The game maker is on.');
      } else {
        setError(data.error || 'Could not save the key.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Remove the saved Claude API key? The game maker will only save ideas until a key is added again.')) return;
    const res = await fetch('/api/admin/settings', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setStatus(data.anthropicKey);
      setMessage('Key removed.');
    }
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg opacity-60" style={{ color: 'var(--text)' }}>
          Access denied. Super admin only.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold font-fredoka" style={{ color: 'var(--text)' }}>
          {'\u{2699}\u{FE0F}'} Settings
        </h2>
        <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>
          Turn on the AI game maker.
        </p>
      </div>

      <form onSubmit={save} className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h3 className="text-lg font-bold font-fredoka" style={{ color: 'var(--text)' }}>
          {'\u{1F511}'} Claude API key
        </h3>

        <p className="text-sm" style={{ color: 'var(--text)' }}>
          {status === null
            ? 'Checking...'
            : status.set
              ? `On: key ending in …${status.last4}${status.source === 'env' ? ' (set on the server, ANTHROPIC_API_KEY)' : ''}.`
              : 'Off: no key yet. "Make my game!" only saves ideas (see Admin → Game Ideas).'}
        </p>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        />

        {message && <p className="text-sm text-green-500">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 items-center">
          <button
            type="submit"
            disabled={saving || !key.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Checking...' : status?.set ? 'Replace key' : 'Save key'}
          </button>
          {status?.set && status.source === 'admin' && (
            <button type="button" onClick={remove} className="text-sm text-red-500 hover:underline">
              Remove key
            </button>
          )}
        </div>

        <p className="text-xs opacity-40" style={{ color: 'var(--text)' }}>
          Create a key at console.anthropic.com → API Keys. It is checked with Anthropic before saving,
          stored on the server, and never shown again. Each game costs about $0.40–0.90; each account
          can make 5 per day.
        </p>
      </form>
    </div>
  );
}
