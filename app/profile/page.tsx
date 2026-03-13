'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import LevelBadge from '@/components/LevelBadge';
import XPBar from '@/components/XPBar';
import { getLevelTitle, calculateLevel } from '@/lib/xp';

// ============================================
// Types
// ============================================

interface Player {
  id: string;
  nickname: string;
  xp: number;
  level: number;
  created_at: string;
}

interface PlaySessionWithGame {
  id: number;
  player_id: string;
  game_id: number;
  duration_seconds: number;
  xp_earned: number;
  played_at: string;
  game_title?: string;
  thumbnail_emoji?: string;
}

interface PlayerData {
  player: Player;
  sessions: PlaySessionWithGame[];
  gamesPlayed: number;
}

// ============================================
// Helpers
// ============================================

const PLAYER_ID_KEY = 'yoel-player-id';
const PLAYER_CACHE_KEY = 'yoel-player-cache';

function getStoredPlayerId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLAYER_ID_KEY);
}

function setStoredPlayerId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAYER_ID_KEY, id);
}

function getCachedPlayerData(): PlayerData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAYER_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return null;
}

function setCachedPlayerData(data: PlayerData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYER_CACHE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

/** Format a played_at timestamp as a human-friendly "time ago" string. */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// ============================================
// Profile Page Component
// ============================================

export default function ProfilePage() {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);

  // Fetch or create player on mount
  const fetchPlayer = useCallback(async () => {
    let playerId = getStoredPlayerId();

    // Generate new player ID if none exists
    if (!playerId) {
      playerId = uuidv4();
      setStoredPlayerId(playerId);
    }

    try {
      const res = await fetch(`/api/xp?playerId=${encodeURIComponent(playerId)}`);
      if (res.ok) {
        const data: PlayerData = await res.json();
        setPlayerData(data);
        setCachedPlayerData(data);
      } else {
        // Fall back to cached data on fetch failure
        const cached = getCachedPlayerData();
        if (cached) setPlayerData(cached);
      }
    } catch {
      // Offline: use cached data
      const cached = getCachedPlayerData();
      if (cached) setPlayerData(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  // Handle nickname edit
  const startEditNickname = () => {
    if (!playerData) return;
    setNicknameInput(playerData.player.nickname);
    setEditingNickname(true);
  };

  const saveNickname = async () => {
    if (!playerData || !nicknameInput.trim()) return;
    const trimmed = nicknameInput.trim().slice(0, 30);
    if (trimmed === playerData.player.nickname) {
      setEditingNickname(false);
      return;
    }

    setSavingNickname(true);
    try {
      const res = await fetch('/api/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerData.player.id,
          nickname: trimmed,
          xp: 0,
          duration: 0,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setPlayerData((prev) =>
          prev ? { ...prev, player: result.player } : prev
        );
      }
    } catch {
      // Silently fail - keep old nickname
    } finally {
      setSavingNickname(false);
      setEditingNickname(false);
    }
  };

  const handleNicknameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveNickname();
    if (e.key === 'Escape') setEditingNickname(false);
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full border-4 border-t-transparent"
            style={{
              width: '48px',
              height: '48px',
              borderColor: 'var(--primary)',
              borderTopColor: 'transparent',
            }}
          />
          <p className="mt-4 text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // Fallback if no data at all
  const player = playerData?.player ?? {
    id: getStoredPlayerId() || 'unknown',
    nickname: 'New Player',
    xp: 0,
    level: 1,
    created_at: new Date().toISOString(),
  };

  const sessions = playerData?.sessions ?? [];
  const gamesPlayed = playerData?.gamesPlayed ?? 0;
  const levelTitle = getLevelTitle(player.level);

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Profile Card */}
      <div
        className="theme-card w-full max-w-md p-6 flex flex-col items-center gap-5"
      >
        {/* Level Badge (large) */}
        <LevelBadge level={player.level} size="lg" />

        {/* Nickname */}
        <div className="text-center w-full">
          {editingNickname ? (
            <div className="flex items-center gap-2 justify-center">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={handleNicknameKeyDown}
                onBlur={saveNickname}
                autoFocus
                maxLength={30}
                className="text-2xl font-bold text-center rounded-lg px-3 py-1 outline-none"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '2px solid var(--primary)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-fredoka, "Fredoka", sans-serif)',
                  width: '100%',
                  maxWidth: '280px',
                }}
                disabled={savingNickname}
              />
            </div>
          ) : (
            <button
              onClick={startEditNickname}
              className="text-2xl font-bold cursor-pointer hover:opacity-80 touch-target"
              style={{
                color: 'var(--text)',
                fontFamily: 'var(--font-fredoka, "Fredoka", sans-serif)',
                background: 'none',
                border: 'none',
                padding: '4px 8px',
              }}
              title="Tap to change nickname"
              aria-label="Edit nickname"
            >
              {player.nickname}
              <span className="ml-2 text-sm opacity-50" aria-hidden="true">
                ✏️
              </span>
            </button>
          )}
          <p
            className="text-sm mt-1 font-semibold uppercase tracking-wider"
            style={{ color: 'var(--primary)' }}
          >
            {levelTitle}
          </p>
        </div>

        {/* XP Bar */}
        <div className="w-full">
          <XPBar currentXP={player.xp} level={player.level} />
        </div>

        {/* Stats */}
        <div className="flex gap-6 justify-center w-full">
          <div className="text-center">
            <p
              className="text-2xl font-bold"
              style={{
                color: 'var(--text)',
                fontFamily: 'var(--font-fredoka, "Fredoka", sans-serif)',
              }}
            >
              {player.xp.toLocaleString()}
            </p>
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--primary)' }}>
              Total XP
            </p>
          </div>
          <div
            className="w-px"
            style={{ backgroundColor: 'var(--border)' }}
          />
          <div className="text-center">
            <p
              className="text-2xl font-bold"
              style={{
                color: 'var(--text)',
                fontFamily: 'var(--font-fredoka, "Fredoka", sans-serif)',
              }}
            >
              {gamesPlayed}
            </p>
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--primary)' }}>
              Games Played
            </p>
          </div>
        </div>
      </div>

      {/* Play History */}
      <div className="w-full max-w-md mt-6">
        <h2
          className="text-lg font-bold mb-3"
          style={{
            color: 'var(--text)',
            fontFamily: 'var(--font-fredoka, "Fredoka", sans-serif)',
          }}
        >
          Recent Activity
        </h2>

        {sessions.length === 0 ? (
          <div
            className="theme-card p-6 text-center"
          >
            <p className="text-4xl mb-3" aria-hidden="true">🎮</p>
            <p
              className="text-base font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Start playing games to earn XP!
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text)', opacity: 0.6 }}
            >
              Your play history will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="theme-card p-3 flex items-center gap-3"
              >
                {/* Game emoji */}
                <span className="text-2xl select-none" aria-hidden="true">
                  {session.thumbnail_emoji || '🎮'}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--text)' }}
                  >
                    {session.game_title || `Game #${session.game_id}`}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text)', opacity: 0.5 }}
                  >
                    {timeAgo(session.played_at)}
                  </p>
                </div>

                {/* XP earned */}
                <div className="text-right shrink-0">
                  <p
                    className="text-sm font-bold"
                    style={{ color: 'var(--primary)' }}
                  >
                    +{session.xp_earned} XP
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text)', opacity: 0.5 }}
                  >
                    {Math.floor(session.duration_seconds / 60)}m{' '}
                    {session.duration_seconds % 60}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
