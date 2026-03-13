'use client';

import { xpForNextLevel, xpProgress } from '@/lib/xp';

interface XPBarProps {
  currentXP: number;
  level: number;
}

export default function XPBar({ currentXP, level }: XPBarProps) {
  const progress = xpProgress(currentXP);
  const nextXP = xpForNextLevel(level);
  const currentLevelXP = (level - 1) * (level - 1) * 100;
  const xpIntoLevel = currentXP - currentLevelXP;
  const xpNeeded = nextXP - currentLevelXP;
  const percent = Math.round(progress * 100);

  return (
    <div className="w-full">
      {/* Labels */}
      <div className="flex justify-between items-center mb-1 text-sm font-semibold">
        <span style={{ color: 'var(--primary)' }}>
          Level {level}
        </span>
        <span style={{ color: 'var(--text)', opacity: 0.7 }}>
          {xpIntoLevel} / {xpNeeded} XP
        </span>
      </div>

      {/* Bar container */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: '14px',
          borderRadius: '7px',
          backgroundColor: 'var(--border)',
        }}
      >
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${percent}%`,
            borderRadius: '7px',
            background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))`,
            boxShadow: `0 0 12px var(--primary), 0 0 4px var(--primary)`,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Sparkle at fill point */}
        {percent > 3 && (
          <span
            className="absolute pointer-events-none select-none"
            style={{
              left: `${percent}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '14px',
              lineHeight: 1,
              filter: 'drop-shadow(0 0 4px var(--primary))',
              transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            aria-hidden="true"
          >
            ✨
          </span>
        )}
      </div>
    </div>
  );
}
