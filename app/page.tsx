export const dynamic = 'force-dynamic';

import { getApprovedDevelopers, getGamesByDeveloper, getDevelopersForGame } from '@/lib/db';
import GameCard from '@/components/GameCard';
import GameCreator from '@/components/GameCreator';

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

export default async function HomePage() {
  const developers = (await getApprovedDevelopers()) as Developer[];

  // Fetch games for each approved developer (includes co-authored games)
  const developersWithGames: { developer: Developer; games: Game[]; gameAuthors: Map<number, GameAuthor[]>; totalPlays: number }[] = [];

  for (const dev of developers) {
    const games = (await getGamesByDeveloper(dev.id)) as Game[];
    if (games.length > 0) {
      const gameAuthors = new Map<number, GameAuthor[]>();
      let totalPlays = 0;
      for (const game of games) {
        totalPlays += game.play_count || 0;
        const authors = getDevelopersForGame(game.id);
        if (authors.length > 0) {
          gameAuthors.set(game.id, authors);
        }
      }
      developersWithGames.push({ developer: dev, games, gameAuthors, totalPlays });
    }
  }

  // Sort by total plays descending, then by game count descending
  developersWithGames.sort((a, b) => {
    if (b.totalPlays !== a.totalPlays) return b.totalPlays - a.totalPlays;
    return b.games.length - a.games.length;
  });

  const hasGames = developersWithGames.length > 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-14 sm:pt-28 sm:pb-20 flex flex-col items-center text-center">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--primary) 0%, var(--accent) 50%, transparent 70%)',
          }}
        />

        <h1
          className="
            relative
            text-gradient font-fredoka font-bold
            text-5xl sm:text-7xl md:text-8xl lg:text-9xl
            tracking-tight
            hero-float
          "
        >
          Yo&euml;l The G
        </h1>

        <p
          className="
            relative
            mt-4 sm:mt-6
            text-xl sm:text-2xl md:text-3xl
            font-fredoka font-medium
            text-[var(--text)] opacity-80
          "
        >
          Family Game Studio
        </p>

        {/* Stats bar */}
        {hasGames && (
          <div className="relative mt-8 flex items-center gap-6 sm:gap-10 text-sm sm:text-base text-[var(--text)] opacity-60 font-medium">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-gradient">
                {developersWithGames.reduce((sum, d) => sum + d.games.length, 0)}
              </span>
              <span>Games</span>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-gradient">
                {developersWithGames.length}
              </span>
              <span>Publishers</span>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-gradient">
                {developersWithGames.reduce((sum, d) => sum + d.totalPlays, 0).toLocaleString()}
              </span>
              <span>Total Plays</span>
            </div>
          </div>
        )}
      </section>

      {/* Game Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {hasGames ? (
          developersWithGames.map(({ developer, games, gameAuthors, totalPlays }, sectionIdx) => (
            <section key={developer.id} className="mb-16">
              {/* Developer Section Header */}
              <div className="flex items-end justify-between mb-6 sm:mb-8 border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  {/* Rank indicator */}
                  <span
                    className="
                      flex items-center justify-center
                      w-8 h-8 sm:w-10 sm:h-10
                      rounded-full
                      text-sm sm:text-base font-bold
                      text-white
                    "
                    style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
                  >
                    {sectionIdx + 1}
                  </span>
                  <div>
                    <h2
                      className="
                        font-fredoka font-bold
                        text-xl sm:text-2xl md:text-3xl
                        text-[var(--text)]
                        leading-tight
                      "
                    >
                      {developer.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-0.5 text-xs sm:text-sm text-[var(--text)] opacity-50 font-medium">
                      <span>{games.length} {games.length === 1 ? 'game' : 'games'}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--text)] opacity-30" />
                      <span>{totalPlays.toLocaleString()} plays</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Games Grid */}
              <div
                className="
                  grid
                  grid-cols-2
                  sm:grid-cols-3
                  lg:grid-cols-4
                  gap-4 sm:gap-6
                "
              >
                {games.map((game, idx) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    developer={developer}
                    authors={gameAuthors.get(game.id)}
                    index={idx}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
            >
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-fredoka font-bold text-2xl sm:text-3xl text-[var(--text)] mb-3">
              No games yet!
            </h2>
            <p className="text-lg sm:text-xl text-[var(--text)] opacity-60 max-w-md">
              Check back soon -- new games are being built right now!
            </p>
          </div>
        )}
      </div>

      {/* Game Creator - public on landing page */}
      <GameCreator />
    </div>
  );
}
