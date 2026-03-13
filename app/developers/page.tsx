import { getApprovedDevelopers, getGamesByDeveloper } from '@/lib/db';
import Link from 'next/link';
import type { Metadata } from 'next';

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

export const metadata: Metadata = {
  title: 'Developers | Yoel The G',
  description: 'Meet the game developers behind the fun!',
};

export default async function DevelopersPage() {
  const developers = (await getApprovedDevelopers()) as Developer[];

  // Fetch game counts for each developer
  const developersWithCounts: { developer: Developer; gameCount: number }[] = [];

  for (const dev of developers) {
    const games = (await getGamesByDeveloper(dev.id)) as Game[];
    developersWithCounts.push({ developer: dev, gameCount: games.length });
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Page Header */}
      <section className="relative px-4 pt-24 pb-12 sm:pt-32 sm:pb-16 flex flex-col items-center text-center">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--primary) 0%, var(--accent) 50%, transparent 70%)',
          }}
        />
        <h1 className="relative text-gradient font-fredoka font-bold text-4xl sm:text-6xl md:text-7xl tracking-tight">
          Our Developers
        </h1>
        <p className="relative mt-3 sm:mt-4 text-lg sm:text-xl font-fredoka text-[var(--text)] opacity-70">
          The creative minds building awesome games!
        </p>
      </section>

      {/* Developers Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {developersWithCounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {developersWithCounts.map(({ developer, gameCount }, idx) => (
              <Link href="/" key={developer.id}>
                <div
                  className="
                    card-pop-in
                    theme-card theme-glow
                    flex flex-col items-center gap-4
                    p-8 sm:p-10
                    cursor-pointer select-none
                    transition-transform duration-200 ease-out
                    hover:scale-[1.04]
                    active:scale-[0.97]
                  "
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Large Avatar Emoji */}
                  <div
                    className="
                      w-24 h-24 sm:w-28 sm:h-28
                      rounded-full
                      flex items-center justify-center
                      text-6xl sm:text-7xl
                      transition-transform duration-300
                      hover:scale-110
                    "
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, var(--primary) 25%, transparent), color-mix(in srgb, var(--accent) 20%, transparent))`,
                    }}
                  >
                    {developer.avatar_emoji}
                  </div>

                  {/* Name */}
                  <h2 className="font-fredoka font-bold text-xl sm:text-2xl text-[var(--text)] text-center">
                    {developer.name}
                  </h2>

                  {/* Game Count */}
                  <div className="flex items-center gap-2 text-sm sm:text-base text-[var(--text)] opacity-60">
                    <span className="text-lg">🎮</span>
                    <span className="font-medium">
                      {gameCount} {gameCount === 1 ? 'game' : 'games'} published
                    </span>
                  </div>

                  {/* View Games Button */}
                  <div className="btn-primary mt-2 text-sm px-5 py-2">
                    View Games
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-7xl sm:text-8xl mb-6 hero-float">👩‍💻</div>
            <h2 className="font-fredoka font-bold text-2xl sm:text-3xl text-[var(--text)] mb-3">
              No developers yet!
            </h2>
            <p className="text-lg text-[var(--text)] opacity-60 max-w-md">
              Developers are getting started. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
