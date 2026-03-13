'use client';

import { getLevelTitle } from '@/lib/xp';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { badge: 32, font: 14, titleFont: 9 },
  md: { badge: 48, font: 20, titleFont: 11 },
  lg: { badge: 72, font: 30, titleFont: 14 },
} as const;

export default function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  const s = sizes[size];
  const title = getLevelTitle(level);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Badge circle */}
      <div
        className="level-badge flex items-center justify-center rounded-full select-none"
        style={{
          width: `${s.badge}px`,
          height: `${s.badge}px`,
          background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))`,
          boxShadow: `0 0 16px var(--primary), 0 2px 8px rgba(0,0,0,0.2)`,
          fontSize: `${s.font}px`,
          color: '#ffffff',
          fontWeight: 800,
          fontFamily: 'var(--font-fredoka, "Fredoka", sans-serif)',
          lineHeight: 1,
        }}
        aria-label={`Level ${level}`}
      >
        {level}
      </div>

      {/* Level title */}
      <span
        className="font-semibold select-none"
        style={{
          fontSize: `${s.titleFont}px`,
          color: 'var(--primary)',
          fontFamily: 'var(--font-fredoka, "Fredoka", sans-serif)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </span>

      {/* Pulse animation via inline style tag (scoped via class) */}
      <style jsx>{`
        .level-badge {
          animation: badge-pulse 2.5s ease-in-out infinite;
        }
        @keyframes badge-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 16px var(--primary), 0 2px 8px rgba(0,0,0,0.2);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 24px var(--primary), 0 0 40px var(--primary), 0 2px 8px rgba(0,0,0,0.2);
          }
        }
      `}</style>
    </div>
  );
}
