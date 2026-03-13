'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';

interface Developer {
  id: number;
  name: string;
  slug: string;
  avatar_emoji: string;
  approved: number;
  created_at: string;
  game_count?: number;
}

export default function AdminDevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDevelopers = useCallback(async () => {
    try {
      const res = await fetch('/api/developers');
      if (res.ok) {
        const data = await res.json();
        setDevelopers(data.developers);
      }
    } catch {
      // Silent failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevelopers();
  }, [loadDevelopers]);

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!name.trim()) {
      setAddError('Name is required.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          emoji: emoji || '\u{1F3AE}',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setAddSuccess(`Developer "${name}" added!`);
        setName('');
        setEmoji('');
        loadDevelopers();
      } else {
        setAddError(data.error || 'Failed to add developer.');
      }
    } catch {
      setAddError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: number) {
    await fetch('/api/developers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    });
    loadDevelopers();
  }

  async function handleRemove(id: number, devName: string) {
    if (!confirm(`Remove developer "${devName}"? This cannot be undone.`)) return;
    await fetch('/api/developers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'remove' }),
    });
    loadDevelopers();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg opacity-60" style={{ color: 'var(--text)' }}>
          Loading developers...
        </p>
      </div>
    );
  }

  const approved = developers.filter((d) => d.approved === 1);
  const pending = developers.filter((d) => d.approved === 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h2
          className="text-2xl font-bold font-fredoka"
          style={{ color: 'var(--text)' }}
        >
          {'\u{1F468}\u{200D}\u{1F4BB}'} Developers Management
        </h2>
        <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>
          Manage game developers and their approval status.
        </p>
      </div>

      {/* Add developer form */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h3
          className="text-lg font-bold font-fredoka mb-4"
          style={{ color: 'var(--text)' }}
        >
          {'\u{2795}'} Add Developer
        </h3>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="dev-name"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Name *
              </label>
              <input
                id="dev-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ezekiel"
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
              {name && (
                <p className="text-xs mt-1 opacity-40" style={{ color: 'var(--text)' }}>
                  Slug: {generateSlug(name)}
                </p>
              )}
            </div>

            {/* Emoji */}
            <div>
              <label
                htmlFor="dev-emoji"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Avatar Emoji
              </label>
              <input
                id="dev-emoji"
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="\u{1F3AE}"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          </div>

          {/* Messages */}
          {addError && (
            <p className="text-red-500 text-sm font-medium" role="alert">
              {addError}
            </p>
          )}
          {addSuccess && (
            <p className="text-green-500 text-sm font-medium" role="status">
              {addSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Developer'}
          </button>
        </form>
      </div>

      {/* Pending developers */}
      {pending.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <h3
            className="text-lg font-bold font-fredoka mb-4"
            style={{ color: 'var(--text)' }}
          >
            {'\u{23F3}'} Pending Approval ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((dev) => (
              <DeveloperRow
                key={dev.id}
                developer={dev}
                onApprove={() => handleApprove(dev.id)}
                onRemove={() => handleRemove(dev.id, dev.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved developers */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h3
          className="text-lg font-bold font-fredoka mb-4"
          style={{ color: 'var(--text)' }}
        >
          {'\u2705'} Approved Developers ({approved.length})
        </h3>

        {approved.length === 0 ? (
          <p className="text-sm opacity-50" style={{ color: 'var(--text)' }}>
            No approved developers yet.
          </p>
        ) : (
          <div className="space-y-3">
            {approved.map((dev) => (
              <DeveloperRow
                key={dev.id}
                developer={dev}
                onRemove={() => handleRemove(dev.id, dev.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function DeveloperRow({
  developer,
  onApprove,
  onRemove,
}: {
  developer: Developer;
  onApprove?: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Avatar */}
      <span className="text-3xl flex-shrink-0">{developer.avatar_emoji}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: 'var(--text)' }}>
          {developer.name}
        </p>
        <p className="text-xs opacity-50" style={{ color: 'var(--text)' }}>
          @{developer.slug}
          {developer.game_count !== undefined && (
            <> &middot; {developer.game_count} game{developer.game_count !== 1 ? 's' : ''}</>
          )}
        </p>
      </div>

      {/* Status */}
      <span
        className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
        style={{
          backgroundColor: developer.approved
            ? 'rgba(34, 197, 94, 0.15)'
            : 'rgba(234, 179, 8, 0.15)',
          color: developer.approved ? '#22c55e' : '#eab308',
        }}
      >
        {developer.approved ? 'Approved' : 'Pending'}
      </span>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        {!developer.approved && onApprove && (
          <button
            onClick={onApprove}
            className="p-2 rounded-lg text-sm hover:opacity-80 transition-opacity cursor-pointer"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e',
            }}
            title="Approve developer"
            aria-label="Approve developer"
          >
            {'\u2705'}
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-2 rounded-lg text-sm hover:opacity-80 transition-opacity cursor-pointer"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
          }}
          title="Remove developer"
          aria-label="Remove developer"
        >
          {'\u{1F5D1}'}
        </button>
      </div>
    </div>
  );
}
