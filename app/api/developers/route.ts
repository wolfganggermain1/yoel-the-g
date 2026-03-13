import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import {
  getAllDevelopers,
  addDeveloper,
  approveDeveloper,
  removeDeveloper,
  getDb,
} from '@/lib/db';

interface DeveloperWithCount {
  id: number;
  name: string;
  slug: string;
  avatar_emoji: string;
  approved: number;
  created_at: string;
  game_count: number;
}

/**
 * GET /api/developers
 * Return all developers with their game counts.
 * This endpoint requires admin auth for the full list.
 */
export async function GET() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const developers = getAllDevelopers();

  // Enrich with game counts
  const countStmt = getDb().prepare(
    'SELECT COUNT(*) as count FROM games WHERE developer_id = ?',
  );

  const enriched: DeveloperWithCount[] = developers.map((dev) => {
    const row = countStmt.get(dev.id) as { count: number };
    return {
      ...dev,
      game_count: row.count,
    };
  });

  return NextResponse.json({ developers: enriched });
}

/**
 * POST /api/developers
 * Add a new developer (unapproved by default).
 * Body: { name: string, emoji?: string }
 */
export async function POST(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, emoji } = body as { name?: string; emoji?: string };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 },
      );
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Name produces an invalid slug' },
        { status: 400 },
      );
    }

    addDeveloper(name.trim(), slug, emoji || '\u{1F3AE}');
    return NextResponse.json({ success: true });
  } catch (err) {
    // Handle unique constraint (duplicate slug)
    const message = err instanceof Error ? err.message : '';
    if (message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { success: false, error: 'A developer with this name already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to add developer' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/developers
 * Approve or remove a developer.
 * Body: { id: number, action: 'approve' | 'remove' }
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
      return NextResponse.json(
        { success: false, error: 'Missing id or action' },
        { status: 400 },
      );
    }

    if (action === 'approve') {
      approveDeveloper(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'remove') {
      removeDeveloper(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "approve" or "remove".' },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}
