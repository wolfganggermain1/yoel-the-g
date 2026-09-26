'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import type { TubeGame } from '@/lib/tube';

interface GameStageProps {
  game: TubeGame;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
}

/** Runs a YTG game inside the Tube stage, sandboxed the same way as the main game player. */
export default function GameStage({ game, fullscreen, onToggleFullscreen, onExit }: GameStageProps) {
  const [loading, setLoading] = useState(true);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: game.id, action: 'play' }),
    }).catch(() => {
      // Best-effort play count (fails quietly offline)
    });
  }, [game.id]);

  return (
    <>
      <iframe
        key={game.slug}
        ref={frameRef}
        className="tube-game-frame"
        src={game.game_path}
        title={game.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        onLoad={() => {
          setLoading(false);
          frameRef.current?.focus();
        }}
      />
      {loading && (
        <div className="tube-game-loading">
          <div className="tube-spinner" />
          <div className="tube-game-loading__label">Loading {game.title}&hellip;</div>
        </div>
      )}
      <div className="tube-game-tools">
        <button
          onClick={onToggleFullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          <Icon name={fullscreen ? 'fullscreenExit' : 'fullscreen'} size={22} />
        </button>
        <button onClick={onExit} aria-label="Close game" title="Close game">
          <Icon name="close" size={22} />
        </button>
      </div>
    </>
  );
}
