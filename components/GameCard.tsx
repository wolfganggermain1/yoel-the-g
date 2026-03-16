'use client';

import Link from 'next/link';

type Developer = {
  id: number;
  name: string;
  slug: string;
  avatar_emoji: string;
  approved: number;
};

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

interface GameCardProps {
  game: Game;
  developer: Developer;
  authors?: GameAuthor[];
  index?: number;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  arcade: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' },
  puzzle: { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' },
  strategy: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' },
  adventure: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981' },
  creative: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
};

function formatPlays(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export default function GameCard({ game, developer, authors, index = 0 }: GameCardProps) {
  const authorDisplay = authors && authors.length > 0
    ? authors.map(a => a.developer_name).join(' & ')
    : developer.name;

  const colors = categoryColors[game.category] || categoryColors.arcade;
  const isMultiplayer = game.player_count === '2 Players';

  return (
    <Link
      href={`/play/${game.slug}`}
      className="card-pop-in block group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className="
          theme-card
          flex flex-col
          overflow-hidden
          min-w-[160px]
          cursor-pointer select-none
          transition-all duration-200 ease-out
          group-hover:scale-[1.03]
          group-hover:shadow-lg
          group-active:scale-[0.97]
        "
      >
        {/* Gradient Header */}
        <div
          className="relative h-28 sm:h-32 flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))`,
          }}
        >
          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)',
            }}
          />
          {/* Category pill - top right */}
          <span
            className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(4px)' }}
          >
            {game.category}
          </span>
          {/* Play count - top left */}
          {game.play_count > 0 && (
            <span
              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold"
              style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', backdropFilter: 'blur(4px)' }}
            >
              {formatPlays(game.play_count)} plays
            </span>
          )}
          {/* Game initial / visual */}
          <span className="relative text-5xl sm:text-6xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
            {game.thumbnail_emoji}
          </span>
        </div>

        {/* Card Body */}
        <div className="flex flex-col gap-2 p-3.5 sm:p-4">
          {/* Game Title */}
          <h3
            className="
              font-fredoka font-bold
              text-base sm:text-lg
              text-[var(--text)]
              leading-tight
              line-clamp-2
            "
          >
            {game.title}
          </h3>

          {/* Author */}
          <p className="text-xs sm:text-sm text-[var(--text)] opacity-55 font-medium truncate">
            {authorDisplay}
          </p>

          {/* Footer: player count + category */}
          <div className="flex items-center gap-2 mt-1">
            {isMultiplayer && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold"
                style={{ background: colors.bg, color: colors.text }}
              >
                2P
              </span>
            )}
            {game.play_count === 0 && (
              <span className="text-[10px] sm:text-xs text-[var(--text)] opacity-40 font-medium">
                New
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
