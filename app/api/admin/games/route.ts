import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getDb, toggleGamePublished } from '@/lib/db';

interface GameWithDev {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  developer_id: number;
  thumbnail_emoji: string;
  game_path: string;
  category: string;
  published: number;
  play_count: number;
  created_at: string;
  developer_name: string | null;
}

/**
 * GET /api/admin/games
 * List all games (published and unpublished) with developer names.
 */
export async function GET() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const games = getDb()
    .prepare(
      `SELECT g.*, d.name as developer_name
       FROM games g
       LEFT JOIN developers d ON g.developer_id = d.id
       ORDER BY g.created_at DESC`,
    )
    .all() as GameWithDev[];

  return NextResponse.json({ games });
}

/**
 * PATCH /api/admin/games
 * Toggle published status or delete a game.
 * Body: { id: number, action: 'toggle' | 'delete' }
 */
export async function PATCH(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action } = body as { id?: number; action?: string };

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    if (action === 'toggle') {
      toggleGamePublished(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      getDb().prepare('DELETE FROM games WHERE id = ?').run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
