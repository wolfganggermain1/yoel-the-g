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
  play_count: number;
};

export const metadata: Metadata = {
  title: 'Developers | Yoel The G',
  description: 'Meet the game developers behind the fun!',
};

export default async function DevelopersPage() {
  const developers = (await getApprovedDevelopers()) as Developer[];

  // Fetch game counts and total plays for each developer
  const developersWithStats: { developer: Developer; gameCount: number; totalPlays: number }[] = [];

  for (const dev of developers) {
    const games = (await getGamesByDeveloper(dev.id)) as Game[];
    const totalPlays = games.reduce((sum, g) => sum + (g.play_count || 0), 0);
    developersWithStats.push({ developer: dev, gameCount: games.length, totalPlays });
  }

  // Sort by total plays descending, then by game count
  developersWithStats.sort((a, b) => {
    if (b.totalPlays !== a.totalPlays) return b.totalPlays - a.totalPlays;
    return b.gameCount - a.gameCount;
  });

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
          Publishers
        </h1>
        <p className="relative mt-3 sm:mt-4 text-lg sm:text-xl font-fredoka text-[var(--text)] opacity-70">
          Ranked by total plays
        </p>
      </section>

      {/* Developers List */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {developersWithStats.length > 0 ? (
          <div className="flex flex-col gap-4">
            {developersWithStats.map(({ developer, gameCount, totalPlays }, idx) => (
              <Link href="/" key={developer.id}>
                <div
                  className="
                    card-pop-in
                    theme-card
                    flex items-center gap-4 sm:gap-5
                    p-4 sm:p-5
                    cursor-pointer select-none
                    transition-all duration-200 ease-out
                    hover:scale-[1.02]
                    hover:shadow-lg
                    active:scale-[0.98]
                  "
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Rank */}
                  <span
                    className="
                      flex-shrink-0
                      flex items-center justify-center
                      w-10 h-10 sm:w-12 sm:h-12
                      rounded-full
                      text-sm sm:text-base font-bold
                      text-white
                    "
                    style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
                  >
                    #{idx + 1}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-fredoka font-bold text-lg sm:text-xl text-[var(--text)] truncate">
                      {developer.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-0.5 text-xs sm:text-sm text-[var(--text)] opacity-50 font-medium">
                      <span>{gameCount} {gameCount === 1 ? 'game' : 'games'}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--text)] opacity-30" />
                      <span>{totalPlays.toLocaleString()} plays</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-[var(--text)] opacity-30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
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
