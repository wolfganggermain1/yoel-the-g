import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { isAdminAuthenticated } from '@/lib/auth';
import { addGame } from '@/lib/db';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Generate a URL-safe slug from text.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * POST /api/admin/upload
 * Upload an HTML game file and register it in the database.
 *
 * Expects multipart/form-data with:
 *   - title (string, required)
 *   - description (string, optional)
 *   - category (string, optional, default 'arcade')
 *   - developerId (string/number, required)
 *   - thumbnailEmoji (string, optional)
 *   - file (File, required, .html only, max 5 MB)
 */
export async function POST(request: NextRequest) {
  // Auth check
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    // Extract fields
    const title = formData.get('title') as string | null;
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || 'arcade';
    const developerIdStr = formData.get('developerId') as string | null;
    const thumbnailEmoji = (formData.get('thumbnailEmoji') as string) || '\u{1F3AE}';
    const file = formData.get('file') as File | null;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!developerIdStr) {
      return NextResponse.json({ error: 'Developer is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'HTML file is required' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
      return NextResponse.json(
        { error: 'Only .html files are allowed' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be under 5 MB' },
        { status: 400 },
      );
    }

    const slug = slugify(title.trim());
    if (!slug) {
      return NextResponse.json(
        { error: 'Title produces an invalid slug' },
        { status: 400 },
      );
    }

    const developerId = parseInt(developerIdStr, 10);
    if (isNaN(developerId)) {
      return NextResponse.json({ error: 'Invalid developer ID' }, { status: 400 });
    }

    // Create directory and write file
    const gameDir = path.join(process.cwd(), 'public', 'games', slug);
    await mkdir(gameDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(gameDir, 'index.html');
    await writeFile(filePath, buffer);

    // Register in database
    const gamePath = `/games/${slug}/index.html`;
    const result = addGame({
      title: title.trim(),
      slug,
      description: description || undefined,
      developer_id: developerId,
      thumbnail_emoji: thumbnailEmoji,
      game_path: gamePath,
      category,
      published: 0,
    });

    return NextResponse.json({
      success: true,
      game: {
        id: result.lastInsertRowid,
        title: title.trim(),
        slug,
        game_path: gamePath,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 },
    );
  }
}
