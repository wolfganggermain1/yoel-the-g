import { notFound } from 'next/navigation';
import { getGameBySlug, getDevelopersForGame } from '@/lib/db';
import GamePlayer from '@/components/GamePlayer';
import type { Metadata } from 'next';

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

interface PlayPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const game = (await getGameBySlug(params.slug)) as Game | undefined;

  if (!game) {
    return { title: 'Game Not Found' };
  }

  const authors = getDevelopersForGame(game.id);
  const authorNames = authors.length > 0
    ? authors.map(a => a.developer_name).join(' & ')
    : 'Unknown';

  return {
    title: `${game.title} | Yoel The G`,
    description: `${game.description} - Made by ${authorNames}`,
  };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const game = (await getGameBySlug(params.slug)) as Game | undefined;

  if (!game) {
    notFound();
  }

  const authors = getDevelopersForGame(game.id);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <GamePlayer game={game} gameSlug={params.slug} authors={authors} />
    </div>
  );
}
