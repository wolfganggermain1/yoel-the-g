import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { isAdminAuthenticated } from '@/lib/auth';
import { getDb, toggleGamePublished, updateGame, getGameById } from '@/lib/db';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * PUT /api/admin/games
 * Update a game's metadata and optionally re-upload its HTML file.
 * Expects multipart/form-data with:
 *   - id (required)
 *   - title, description, category, developerId, thumbnailEmoji (optional)
 *   - file (optional, .html only, max 5 MB)
 */
export async function PUT(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const idStr = formData.get('id') as string | null;

    if (!idStr) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const game = getGameById(id);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Build update data from provided fields
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;
    const developerIdStr = formData.get('developerId') as string | null;
    const thumbnailEmoji = formData.get('thumbnailEmoji') as string | null;
    const file = formData.get('file') as File | null;

    const updates: Record<string, string | number> = {};
    if (title && title.trim()) updates.title = title.trim();
    if (description !== null) updates.description = description;
    if (category) updates.category = category;
    if (thumbnailEmoji) updates.thumbnail_emoji = thumbnailEmoji;
    if (developerIdStr) {
      const devId = parseInt(developerIdStr, 10);
      if (!isNaN(devId)) updates.developer_id = devId;
    }

    // Handle file re-upload
    if (file && file.size > 0) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
        return NextResponse.json({ error: 'Only .html files are allowed' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size must be under 5 MB' }, { status: 400 });
      }

      // Write file to existing game path
      const gamePath = game.game_path;
      const fullPath = path.join(process.cwd(), 'public', gamePath);
      const dir = path.dirname(fullPath);
      await mkdir(dir, { recursive: true });

      const bytes = await file.arrayBuffer();
      await writeFile(fullPath, Buffer.from(bytes));
    }

    // Apply metadata updates
    if (Object.keys(updates).length > 0) {
      updateGame(id, updates);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    return NextResponse.json({ error: 'Update failed. Please try again.' }, { status: 500 });
  }
}
