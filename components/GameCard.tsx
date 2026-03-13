'use client';

import Link from 'next/link';

type Developer = {
  id: number;
  name: string;
  slug: string;
  avatar_emoji: string;
  approved: number;
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
};

interface GameCardProps {
  game: Game;
  developer: Developer;
  index?: number;
}

export default function GameCard({ game, developer, index = 0 }: GameCardProps) {
  return (
    <Link
      href={`/play/${game.slug}`}
      className="card-pop-in block group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className="
          theme-card theme-glow
          flex flex-col items-center gap-3
          p-5 sm:p-6
          min-w-[160px] min-h-[200px]
          cursor-pointer select-none
          transition-transform duration-200 ease-out
          group-hover:scale-[1.05]
          group-active:scale-[0.97]
        "
      >
        {/* Emoji Thumbnail */}
        <div
          className="
            w-20 h-20 sm:w-24 sm:h-24
            rounded-full
            flex items-center justify-center
            text-5xl sm:text-6xl
            transition-transform duration-300
            group-hover:scale-110
            group-hover:rotate-3
          "
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, transparent), color-mix(in srgb, var(--accent) 15%, transparent))`,
          }}
        >
          {game.thumbnail_emoji}
        </div>

        {/* Game Title */}
        <h3
          className="
            font-fredoka font-bold
            text-lg sm:text-xl
            text-[var(--text)]
            text-center
            leading-tight
          "
        >
          {game.title}
        </h3>

        {/* Developer Info */}
        <div className="flex items-center gap-1.5 text-sm text-[var(--text)] opacity-70">
          <span className="text-base">{developer.avatar_emoji}</span>
          <span className="font-medium">{developer.name}</span>
        </div>

        {/* Bottom Row: Play Count + Category */}
        <div className="flex items-center gap-3 mt-auto w-full justify-center flex-wrap">
          {/* Play Count */}
          <div className="flex items-center gap-1 text-xs text-[var(--text)] opacity-60">
            <span className="text-sm">🎮</span>
            <span>{game.play_count.toLocaleString()} plays</span>
          </div>

          {/* Category Badge */}
          <span
            className="
              px-2.5 py-0.5
              rounded-full
              text-xs font-semibold
              bg-[var(--primary)]
              text-white
              opacity-90
            "
          >
            {game.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
