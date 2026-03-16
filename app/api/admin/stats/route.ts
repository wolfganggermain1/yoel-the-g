import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStats, getDb } from '@/lib/db';

interface RecentSession {
  id: number;
  player_id: string;
  game_id: number;
  duration_seconds: number;
  xp_earned: number;
  played_at: string;
  game_title: string | null;
  game_emoji: string | null;
}

/**
 * GET /api/admin/stats
 * Return platform statistics and recent play sessions.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = getStats();
  const totalUsers = (getDb().prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;

  // Fetch last 5 play sessions with game info
  const recentSessions = getDb()
    .prepare(
      `SELECT ps.*, g.title as game_title, g.thumbnail_emoji as game_emoji
       FROM play_sessions ps
       LEFT JOIN games g ON ps.game_id = g.id
       ORDER BY ps.played_at DESC
       LIMIT 5`,
    )
    .all() as RecentSession[];

  return NextResponse.json({ stats: { ...stats, totalUsers }, recentSessions });
}
