'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AdminGuard';
import { TUBE_CATEGORIES, formatDuration, type TubeVideo } from '@/lib/tube';

export default function AdminTubePage() {
  const { user } = useAuth();
  const isAdminOrAbove = user?.role === 'super_admin' || user?.role === 'admin';

  const [videos, setVideos] = useState<TubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<string>('drawing');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tube');
      if (res.ok) setVideos((await res.json()).videos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminOrAbove) loadVideos();
    else setLoading(false);
  }, [isAdminOrAbove, loadVideos]);

  async function send(method: 'POST' | 'PATCH' | 'DELETE', body?: object, query = '') {
    const res = await fetch(`/api/admin/tube${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (data.videos) setVideos(data.videos);
    return { ok: res.ok, error: data.error as string | undefined };
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setAdding(true);
    const { ok, error } = await send('POST', { url, category });
    setAdding(false);
    if (ok) {
      setUrl('');
      setMessage({ kind: 'ok', text: 'Video approved and live in YTG Tube.' });
    } else {
      setMessage({ kind: 'error', text: error ?? 'Could not add that video.' });
    }
  }

  async function handleDelete(video: TubeVideo) {
    if (!confirm(`Remove "${video.title}" from YTG Tube?`)) return;
    await send('DELETE', undefined, `?id=${video.id}`);
  }

  if (!isAdminOrAbove && !loading) {
    return (
      <p className="text-sm opacity-60" style={{ color: 'var(--text)' }}>
        Only parents (admins) can manage YTG Tube videos.
      </p>
    );
  }

  const inputStyle = {
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  };

  const shown = videos.filter((v) =>
    filter === 'all' ? true : filter === 'visible' ? v.visible === 1 : v.visible === 0,
  );
  const hiddenCount = videos.filter((v) => v.visible === 0).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-fredoka" style={{ color: 'var(--text)' }}>
            {'\u{1F4FA}'} YTG Tube Videos
          </h2>
          <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>
            Only videos on this list play in YTG Tube. Kids cannot search YouTube or open other videos.
          </p>
        </div>
        <Link href="/tube" className="text-sm font-medium underline" style={{ color: 'var(--primary)' }}>
          Open YTG Tube {'→'}
        </Link>
      </div>

      {/* Add video */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
      >
        <h3 className="text-lg font-bold font-fredoka mb-4" style={{ color: 'var(--text)' }}>
          {'➕'} Approve a Video
        </h3>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
            <div>
              <label htmlFor="tube-url" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                YouTube link *
              </label>
              <input
                id="tube-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="tube-cat" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Category
              </label>
              <select
                id="tube-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={inputStyle}
              >
                {TUBE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs opacity-50" style={{ color: 'var(--text)' }}>
            Watch the whole video first. The title and channel are filled in from YouTube automatically.
          </p>
          {message && (
            <p
              className={`text-sm font-medium ${message.kind === 'error' ? 'text-red-500' : 'text-green-500'}`}
              role={message.kind === 'error' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          )}
          <button type="submit" disabled={adding} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {adding ? 'Checking video...' : 'Approve Video'}
          </button>
        </form>
      </div>

      {/* Video list */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold font-fredoka" style={{ color: 'var(--text)' }}>
            Approved Videos ({videos.length - hiddenCount} showing{hiddenCount > 0 ? `, ${hiddenCount} hidden` : ''})
          </h3>
          <div className="flex gap-1">
            {(['all', 'visible', 'hidden'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-medium capitalize"
                style={{
                  backgroundColor: filter === f ? 'var(--primary)' : 'var(--bg)',
                  color: filter === f ? '#fff' : 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm opacity-50" style={{ color: 'var(--text)' }}>Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-sm opacity-50" style={{ color: 'var(--text)' }}>No videos here yet.</p>
        ) : (
          <div className="space-y-3">
            {shown.map((video) => (
              <div
                key={video.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  opacity: video.visible ? 1 : 0.55,
                }}
              >
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex-shrink-0 w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-black"
                  title="Preview on YouTube"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {video.duration_seconds ? (
                    <span className="absolute bottom-1 right-1 px-1 rounded text-[11px] font-medium bg-black/75 text-white">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  ) : null}
                </a>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2" style={{ color: 'var(--text)' }}>{video.title}</p>
                  <p className="text-xs opacity-50 mt-0.5" style={{ color: 'var(--text)' }}>
                    {video.channel || 'Unknown channel'}
                    {video.visible ? '' : ' · hidden from kids'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={video.category}
                    onChange={(e) => send('PATCH', { id: video.id, category: e.target.value })}
                    aria-label="Category"
                    className="px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                    style={inputStyle}
                  >
                    {TUBE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => send('PATCH', { id: video.id, visible: !video.visible })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: video.visible ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: video.visible ? '#d97706' : '#059669',
                    }}
                  >
                    {video.visible ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleDelete(video)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}
                  >
                    Remove
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
