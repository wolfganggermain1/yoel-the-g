import { NextRequest, NextResponse } from 'next/server';
import { getAllPublishedGames, getDb } from '@/lib/db';

/**
 * GET /api/games
 * Returns all published games with developer info.
 */
export async function GET() {
  try {
    const db = getDb();

    // Join games with developers to get developer name and emoji
    const games = db
      .prepare(
        `SELECT g.*, d.name as developer_name, d.avatar_emoji as developer_emoji
         FROM games g
         LEFT JOIN developers d ON g.developer_id = d.id
         WHERE g.published = 1
         ORDER BY g.play_count DESC`
      )
      .all();

    return NextResponse.json({ games });
  } catch (error) {
    // Fallback: try getAllPublishedGames without developer join
    try {
      const games = getAllPublishedGames();
      return NextResponse.json({ games });
    } catch (fallbackError) {
      console.error('GET /api/games error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

/**
 * POST /api/games
 * Body: { gameId: number, action: 'play' }
 * Increments the play count for a game.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, action } = body;

    if (!gameId || action !== 'play') {
      return NextResponse.json(
        { error: 'gameId and action="play" are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      `UPDATE games SET play_count = play_count + 1 WHERE id = ?`
    ).run(gameId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/games error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
