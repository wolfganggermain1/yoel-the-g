import { NextRequest, NextResponse } from 'next/server';
import { getPlayer, upsertPlayer, recordPlaySession, getDb } from '@/lib/db';
import { calculateLevel, generateNickname } from '@/lib/xp';

/**
 * GET /api/xp?playerId=xxx
 * Returns player data + recent play sessions.
 * Creates player with generated nickname if they don't exist yet.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    let player = getPlayer(playerId);

    // Auto-create player if they don't exist
    if (!player) {
      const nickname = generateNickname();
      upsertPlayer(playerId, nickname, 0, 1);
      player = getPlayer(playerId);
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Failed to create player' },
        { status: 500 }
      );
    }

    // Fetch recent play sessions (last 10)
    const db = getDb();
    const sessions = db
      .prepare(
        `SELECT ps.*, g.title as game_title, g.thumbnail_emoji
         FROM play_sessions ps
         LEFT JOIN games g ON ps.game_id = g.id
         WHERE ps.player_id = ?
         ORDER BY ps.played_at DESC
         LIMIT 10`
      )
      .all(playerId);

    // Count total games played
    const gamesPlayedRow = db
      .prepare(
        `SELECT COUNT(DISTINCT game_id) as count
         FROM play_sessions
         WHERE player_id = ?`
      )
      .get(playerId) as { count: number } | undefined;

    const gamesPlayed = gamesPlayedRow?.count ?? 0;

    return NextResponse.json({
      player,
      sessions,
      gamesPlayed,
    });
  } catch (error) {
    console.error('GET /api/xp error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xp
 * Body: { playerId, gameId?, duration, xp, nickname? }
 * - If nickname provided: update player nickname
 * - If gameId provided: record play session
 * - Updates player XP and recalculates level
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, gameId, duration, xp, nickname } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    let player = getPlayer(playerId);

    // Create player if they don't exist
    if (!player) {
      const newNickname = nickname || generateNickname();
      upsertPlayer(playerId, newNickname, 0, 1);
      player = getPlayer(playerId);
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Failed to create player' },
        { status: 500 }
      );
    }

    const oldLevel = player.level;

    // Handle nickname update
    if (nickname && nickname !== player.nickname) {
      upsertPlayer(playerId, nickname, player.xp, player.level);
      player = getPlayer(playerId)!;
    }

    // Handle XP gain and play session recording
    if (typeof xp === 'number' && xp > 0) {
      const newXP = player.xp + xp;
      const newLevel = calculateLevel(newXP);
      upsertPlayer(playerId, player.nickname, newXP, newLevel);

      // Record play session if gameId provided
      if (typeof gameId === 'number' && typeof duration === 'number') {
        recordPlaySession(playerId, gameId, duration, xp);
      }

      player = getPlayer(playerId)!;
    }

    const levelUp = player.level > oldLevel;

    return NextResponse.json({
      player,
      levelUp,
    });
  } catch (error) {
    console.error('POST /api/xp error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
