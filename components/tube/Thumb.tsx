'use client';

import { useState } from 'react';
import type { TubeGame } from '@/lib/tube';

const ART_GRADIENTS = [
  ['#ff4f9a', '#7b2ff7'],
  ['#ff8a00', '#e52e71'],
  ['#00c6ff', '#0072ff'],
  ['#11998e', '#38ef7d'],
  ['#fc466b', '#3f5efb'],
  ['#f7971e', '#ffd200'],
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarColor(text: string): string {
  const colors = ['#e91e63', '#9c27b0', '#3f51b5', '#009688', '#ef6c00', '#5d4037', '#1e88e5', '#43a047'];
  return colors[hash(text) % colors.length];
}

export function VideoThumb({ youtubeId, hq = false }: { youtubeId: string; hq?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="tube-thumb-img"
      src={`https://i.ytimg.com/vi/${youtubeId}/${hq ? 'hqdefault' : 'mqdefault'}.jpg`}
      alt=""
      loading="lazy"
      draggable={false}
    />
  );
}

/** Game screenshot, or a bold emoji "thumbnail" when no screenshot exists (or it fails offline). */
export function GameThumb({ game, big = false }: { game: TubeGame; big?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (game.thumb && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="tube-thumb-img"
        src={game.thumb}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
      />
    );
  }

  const [from, to] = ART_GRADIENTS[hash(game.slug) % ART_GRADIENTS.length];
  return (
    <div
      className="tube-thumb-art"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: big ? 28 : 16 }}
    >
      <span className="tube-thumb-art__emoji">{game.thumbnail_emoji}</span>
      <span className="tube-thumb-art__title">{game.title}</span>
    </div>
  );
}
