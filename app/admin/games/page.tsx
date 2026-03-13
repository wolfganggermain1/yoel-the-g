'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';

interface Game {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  developer_id: number;
  thumbnail_emoji: string;
  category: string;
  published: number;
  play_count: number;
  created_at: string;
  developer_name: string | null;
}

interface Developer {
  id: number;
  name: string;
  avatar_emoji: string;
}

const CATEGORIES = [
  'arcade',
  'puzzle',
  'adventure',
  'racing',
  'sports',
  'strategy',
  'educational',
  'creative',
];

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('arcade');
  const [developerId, setDeveloperId] = useState<number | ''>('');
  const [thumbnailEmoji, setThumbnailEmoji] = useState('\u{1F3AE}');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [gamesRes, devsRes] = await Promise.all([
        fetch('/api/admin/games'),
        fetch('/api/developers'),
      ]);

      if (gamesRes.ok) {
        const gData = await gamesRes.json();
        setGames(gData.games);
      }
      if (devsRes.ok) {
        const dData = await devsRes.json();
        // Only show approved developers for the upload form
        const approved = (dData.developers as Developer[]).filter(
          (d: Developer & { approved?: number }) => (d as Developer & { approved: number }).approved === 1,
        );
        setDevelopers(approved);
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

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!file) {
      setUploadError('Please select an HTML file.');
      return;
    }
    if (!title.trim()) {
      setUploadError('Title is required.');
      return;
    }
    if (!developerId) {
      setUploadError('Please select a developer.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('developerId', String(developerId));
      formData.append('thumbnailEmoji', thumbnailEmoji || '\u{1F3AE}');
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadSuccess(`Game "${title}" uploaded successfully!`);
        setTitle('');
        setDescription('');
        setCategory('arcade');
        setDeveloperId('');
        setThumbnailEmoji('\u{1F3AE}');
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('game-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Refresh list
        loadData();
      } else {
        setUploadError(data.error || 'Upload failed.');
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleTogglePublish(id: number) {
    await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'toggle' }),
    });
    loadData();
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete' }),
    });
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg opacity-60" style={{ color: 'var(--text)' }}>
          Loading games...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h2
          className="text-2xl font-bold font-fredoka"
          style={{ color: 'var(--text)' }}
        >
          {'\u{1F3AE}'} Games Management
        </h2>
        <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>
          Upload, publish, and manage all games on the platform.
        </p>
      </div>

      {/* Upload form */}
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
          {'\u{2795}'} Upload New Game
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label
                htmlFor="game-title"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Title *
              </label>
              <input
                id="game-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Space Blaster"
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
              {title && (
                <p className="text-xs mt-1 opacity-40" style={{ color: 'var(--text)' }}>
                  Slug: {generateSlug(title)}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="game-category"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Category
              </label>
              <select
                id="game-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Developer */}
            <div>
              <label
                htmlFor="game-developer"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Developer *
              </label>
              <select
                id="game-developer"
                value={developerId}
                onChange={(e) => setDeveloperId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                <option value="">Select developer...</option>
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.avatar_emoji} {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Thumbnail emoji */}
            <div>
              <label
                htmlFor="game-emoji"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Thumbnail Emoji
              </label>
              <input
                id="game-emoji"
                type="text"
                value={thumbnailEmoji}
                onChange={(e) => setThumbnailEmoji(e.target.value)}
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

          {/* Description */}
          <div>
            <label
              htmlFor="game-desc"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text)' }}
            >
              Description
            </label>
            <textarea
              id="game-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the game..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          {/* File upload */}
          <div>
            <label
              htmlFor="game-file"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text)' }}
            >
              HTML Game File * (.html, max 5MB)
            </label>
            <input
              id="game-file"
              type="file"
              accept=".html,.htm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          {/* Messages */}
          {uploadError && (
            <p className="text-red-500 text-sm font-medium" role="alert">
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p className="text-green-500 text-sm font-medium" role="status">
              {uploadSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Game'}
          </button>
        </form>
      </div>

      {/* Games list */}
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
          All Games ({games.length})
        </h3>

        {games.length === 0 ? (
          <p className="text-sm opacity-50" style={{ color: 'var(--text)' }}>
            No games yet. Upload your first game above!
          </p>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  opacity: game.published ? 1 : 0.6,
                }}
              >
                {/* Icon */}
                <span className="text-3xl flex-shrink-0">{game.thumbnail_emoji}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{ color: 'var(--text)' }}
                  >
                    {game.title}
                  </p>
                  <p className="text-xs opacity-50" style={{ color: 'var(--text)' }}>
                    by {game.developer_name ?? 'Unknown'} &middot;{' '}
                    {game.category} &middot;{' '}
                    {game.play_count} plays
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                  style={{
                    backgroundColor: game.published
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    color: game.published ? '#22c55e' : '#ef4444',
                  }}
                >
                  {game.published ? 'Published' : 'Draft'}
                </span>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublish(game.id)}
                    className="p-2 rounded-lg text-sm hover:opacity-80 transition-opacity cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                    title={game.published ? 'Unpublish' : 'Publish'}
                    aria-label={game.published ? 'Unpublish game' : 'Publish game'}
                  >
                    {game.published ? '\u{1F441}' : '\u{1F648}'}
                  </button>
                  <button
                    onClick={() => handleDelete(game.id, game.title)}
                    className="p-2 rounded-lg text-sm hover:opacity-80 transition-opacity cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                    }}
                    title="Delete game"
                    aria-label="Delete game"
                  >
                    {'\u{1F5D1}'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
