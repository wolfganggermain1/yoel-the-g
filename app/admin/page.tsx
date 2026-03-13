'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalGames: number;
  totalDevelopers: number;
  totalPlaySessions: number;
}

interface RecentSession {
  id: number;
  player_id: string;
  game_title: string | null;
  game_emoji: string | null;
  duration_seconds: number;
  xp_earned: number;
  played_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentSessions(data.recentSessions);
        }
      } catch {
        // Silently fail; stats will be null
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg opacity-60" style={{ color: 'var(--text)' }}>
          Loading dashboard...
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
          {'\u{1F4CA}'} Dashboard
        </h2>
        <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>
          Platform overview and recent activity
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={'\u{1F3AE}'}
          label="Total Games"
          value={stats?.totalGames ?? 0}
          href="/admin/games"
        />
        <StatCard
          icon={'\u{1F468}\u{200D}\u{1F4BB}'}
          label="Total Developers"
          value={stats?.totalDevelopers ?? 0}
          href="/admin/developers"
        />
        <StatCard
          icon={'\u{1F3C6}'}
          label="Play Sessions"
          value={stats?.totalPlaySessions ?? 0}
        />
      </div>

      {/* Recent activity */}
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
          {'\u{23F0}'} Recent Activity
        </h3>

        {recentSessions.length === 0 ? (
          <p className="text-sm opacity-50" style={{ color: 'var(--text)' }}>
            No play sessions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                }}
              >
                <span className="text-2xl">{session.game_emoji ?? '\u{1F3AE}'}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--text)' }}
                  >
                    {session.game_title ?? 'Unknown Game'}
                  </p>
                  <p className="text-xs opacity-50" style={{ color: 'var(--text)' }}>
                    {formatDuration(session.duration_seconds)} &middot; +{session.xp_earned} XP
                  </p>
                </div>
                <span className="text-xs opacity-40" style={{ color: 'var(--text)' }}>
                  {formatDate(session.played_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLink href="/admin/games" icon={'\u{2795}'} label="Manage Games" />
        <QuickLink href="/admin/developers" icon={'\u{1F465}'} label="Manage Developers" />
        <QuickLink href="/" icon={'\u{1F310}'} label="View Site" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div
      className="rounded-2xl p-6 text-center transition-transform hover:scale-[1.02]"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <p
        className="text-3xl font-bold font-fredoka"
        style={{ color: 'var(--primary)' }}
      >
        {value}
      </p>
      <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text)' }}>
        {label}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 rounded-xl transition-transform hover:scale-[1.02]"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
      }}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
