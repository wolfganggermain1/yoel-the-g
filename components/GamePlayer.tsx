'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

type GameAuthor = {
  developer_name: string;
  developer_emoji: string;
  role: string;
};

type Game = {
  id: number;
  title: string;
  slug: string;
  description: string;
  developer_id: number;
  thumbnail_emoji: string;
  game_path: string;
  category: string;
  age_min: number;
  published: number;
  play_count: number;
  player_count?: string;
  controls?: string;
  features?: string | null;
};

interface GamePlayerProps {
  game: Game;
  gameSlug: string;
  authors?: GameAuthor[];
}

/**
 * Get or create a persistent player ID in localStorage.
 */
function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('yoel-player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('yoel-player-id', id);
  }
  return id;
}

export default function GamePlayer({ game, gameSlug, authors }: GamePlayerProps) {
  const [xpNotifications, setXpNotifications] = useState<{ id: number; amount: number }[]>([]);
  const [showInfo, setShowInfo] = useState(true);
  const notifIdRef = useRef(0);

  // Tracking refs (not state, to avoid re-renders)
  const elapsedSecondsRef = useRef(0);
  const accumulatedXpRef = useRef(0);
  const isActiveRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef('');
  const hasMountedRef = useRef(false);

  /**
   * Show an XP notification that fades out.
   */
  const showXpNotification = useCallback((amount: number) => {
    const id = ++notifIdRef.current;
    setXpNotifications((prev) => [...prev, { id, amount }]);
    // Remove after animation completes
    setTimeout(() => {
      setXpNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 2500);
  }, []);

  /**
   * Send accumulated XP to the server.
   */
  const flushXp = useCallback(() => {
    const playerId = playerIdRef.current;
    const xp = accumulatedXpRef.current;
    const duration = elapsedSecondsRef.current;

    if (xp <= 0 || !playerId) return;

    // Use sendBeacon for reliability during page unload, falling back to fetch
    const payload = JSON.stringify({
      playerId,
      gameId: game.id,
      duration,
      xp,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/xp', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently fail -- best-effort XP submission
      });
    }

    accumulatedXpRef.current = 0;
  }, [game.id]);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    playerIdRef.current = getPlayerId();

    // Auto-hide info overlay after 3 seconds
    const infoTimer = setTimeout(() => setShowInfo(false), 3000);

    // Increment play count on mount
    fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: game.id, action: 'play' }),
    }).catch(() => {
      // Best-effort play count increment
    });

    // --- Elapsed time tracker (1-second tick) ---
    timerRef.current = setInterval(() => {
      if (isActiveRef.current) {
        elapsedSecondsRef.current += 1;
      }
    }, 1000);

    // --- XP award interval (every 60 seconds) ---
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        const xpGain = 10;
        accumulatedXpRef.current += xpGain;
        showXpNotification(xpGain);
      }
    }, 60_000);

    // --- Visibility change: pause/resume when tab is hidden ---
    const handleVisibility = () => {
      isActiveRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // --- postMessage listener for games that report XP ---
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && event.data.type === 'xp') {
        const amount = Number(event.data.amount) || 0;
        if (amount > 0) {
          accumulatedXpRef.current += amount;
          showXpNotification(amount);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // --- Cleanup on unmount ---
    return () => {
      clearTimeout(infoTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('message', handleMessage);
      flushXp();
    };
  }, [game.id, showXpNotification, flushXp]);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black z-50">
      {/* Game Iframe */}
      <iframe
        src={game.game_path}
        title={game.title}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />

      {/* Back Button Overlay */}
      <Link
        href="/"
        className="
          fixed top-4 left-4 z-[60]
          w-12 h-12 sm:w-14 sm:h-14
          rounded-full
          bg-black/50 hover:bg-black/70
          backdrop-blur-sm
          flex items-center justify-center
          text-white text-xl sm:text-2xl
          transition-all duration-200
          hover:scale-110
          active:scale-95
          shadow-lg
          touch-target
        "
        aria-label="Back to home"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </Link>

      {/* Game Info & Credits Overlay — auto-hides after 3s */}
      {authors && authors.length > 0 && (
        <div
          className="fixed bottom-4 left-4 z-[60] pointer-events-none transition-opacity duration-700"
          style={{ opacity: showInfo ? 1 : 0 }}
        >
          <div className="
            px-2.5 py-1.5 rounded-lg
            bg-black/40 backdrop-blur-sm
            text-white text-xs
            shadow-md
            flex items-center gap-1.5
          ">
            <span>{authors[0].developer_emoji}</span>
            <span className="font-fredoka font-semibold">{game.title}</span>
          </div>
        </div>
      )}

      {/* XP Notifications */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
        {xpNotifications.map((notif) => (
          <div
            key={notif.id}
            className="
              xp-fade
              px-3 py-1.5
              rounded-full
              bg-yellow-400/90
              text-black
              font-fredoka font-bold
              text-sm sm:text-base
              shadow-lg
              backdrop-blur-sm
              flex items-center gap-1
            "
          >
            <span>&#9889;</span>
            <span>+{notif.amount} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
