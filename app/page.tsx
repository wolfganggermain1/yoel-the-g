import { getApprovedDevelopers, getGamesByDeveloper } from '@/lib/db';
import GameCard from '@/components/GameCard';
import GameCreator from '@/components/GameCreator';

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

export default async function HomePage() {
  const developers = (await getApprovedDevelopers()) as Developer[];

  // Fetch games for each approved developer
  const developersWithGames: { developer: Developer; games: Game[] }[] = [];

  for (const dev of developers) {
    const games = (await getGamesByDeveloper(dev.id)) as Game[];
    if (games.length > 0) {
      developersWithGames.push({ developer: dev, games });
    }
  }

  const hasGames = developersWithGames.length > 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-14 sm:pt-28 sm:pb-20 flex flex-col items-center text-center">
        {/* Decorative radial glow behind the title */}
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

        {/* Decorative emoji row */}
        <div
          className="relative mt-6 flex gap-3 text-2xl sm:text-3xl opacity-70 hero-float"
          style={{ animationDelay: '0.5s' }}
        >
          <span>🎮</span>
          <span>🕹️</span>
          <span>🏆</span>
          <span>⭐</span>
          <span>🚀</span>
        </div>
      </section>

      {/* Game Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {hasGames ? (
          developersWithGames.map(({ developer, games }) => (
            <section key={developer.id} className="mb-16">
              {/* Developer Section Header */}
              <h2
                className="
                  font-fredoka font-bold
                  text-2xl sm:text-3xl md:text-4xl
                  text-[var(--text)]
                  mb-6 sm:mb-8
                  flex items-center gap-3
                "
              >
                <span className="text-3xl sm:text-4xl">{developer.avatar_emoji}</span>
                <span>{developer.name}&apos;s Games</span>
              </h2>

              {/* Games Grid: 2 cols mobile, 3 tablet, 4 desktop */}
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
                    index={idx}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-7xl sm:text-8xl mb-6 hero-float">🎮</div>
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
