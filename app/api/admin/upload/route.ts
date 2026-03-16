import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { requireMinRole } from '@/lib/auth';
import { addGame } from '@/lib/db';

const MAX_HTML_SIZE = 5 * 1024 * 1024;   // 5 MB for single HTML
const MAX_ZIP_SIZE = 25 * 1024 * 1024;    // 25 MB for ZIP

// Dangerous file extensions blocked in ZIP archives
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll',
  '.com', '.scr', '.pif', '.vbs', '.vbe', '.wsf', '.wsh',
]);

// Dangerous patterns scanned in HTML/JS content
const DANGEROUS_PATTERNS = [
  /\beval\s*\(/gi,
  /\bnew\s+Function\s*\(/gi,
  /\bdocument\.cookie\b/gi,
  /\bfetch\s*\(\s*['"`]https?:\/\//gi,
  /\bXMLHttpRequest\b/gi,
  /\bimport\s*\(\s*['"`]https?:\/\//gi,
  /\bnavigator\.sendBeacon\s*\(\s*['"`]https?:\/\//gi,
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate a ZIP file for security and structure requirements.
 */
function validateZip(buffer: Buffer): { errors: string[]; zip: AdmZip | null } {
  const errors: string[] = [];

  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    return { errors: ['Invalid ZIP file'], zip: null };
  }

  const entries = zip.getEntries();

  // Must contain index.html at root level
  const hasIndexHtml = entries.some(
    (entry) => !entry.isDirectory && entry.entryName === 'index.html',
  );
  if (!hasIndexHtml) {
    errors.push('ZIP must contain index.html at the root level');
  }

  for (const entry of entries) {
    // Path traversal check
    if (entry.entryName.includes('..')) {
      errors.push(`Path traversal detected: ${entry.entryName}`);
      continue;
    }

    if (entry.isDirectory) continue;

    // Blocked file extensions
    const ext = path.extname(entry.entryName).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      errors.push(`Blocked file type: ${entry.entryName}`);
    }

    // Security scan HTML/JS files
    if (ext === '.html' || ext === '.htm' || ext === '.js') {
      const content = entry.getData().toString('utf8');
      for (const pattern of DANGEROUS_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(content)) {
          errors.push(
            `Security violation in ${entry.entryName}: contains "${pattern.source}" pattern`,
          );
        }
      }
    }
  }

  return { errors, zip };
}

/**
 * POST /api/admin/upload
 * Upload an HTML or ZIP game file and register it in the database.
 *
 * Expects multipart/form-data with:
 *   - title (string, required)
 *   - description (string, optional)
 *   - category (string, optional, default 'arcade')
 *   - developerId (string/number, required)
 *   - thumbnailEmoji (string, optional)
 *   - file (File, required, .html or .zip)
 */
export async function POST(request: NextRequest) {
  const user = await requireMinRole('family_dev');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const title = formData.get('title') as string | null;
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || 'arcade';
    const developerIdStr = formData.get('developerId') as string | null;
    const thumbnailEmoji = (formData.get('thumbnailEmoji') as string) || '\u{1F3AE}';
    const file = formData.get('file') as File | null;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!developerIdStr) {
      return NextResponse.json({ error: 'Developer is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'Game file is required' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isZip = fileName.endsWith('.zip');
    const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm');

    if (!isZip && !isHtml) {
      return NextResponse.json(
        { error: 'Only .html and .zip files are allowed' },
        { status: 400 },
      );
    }

    const maxSize = isZip ? MAX_ZIP_SIZE : MAX_HTML_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be under ${isZip ? '25' : '5'} MB` },
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

    const gameDir = path.join(process.cwd(), 'public', 'games', slug);
    await mkdir(gameDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (isZip) {
      const { errors, zip } = validateZip(buffer);

      if (errors.length > 0) {
        return NextResponse.json(
          { error: `ZIP validation failed:\n${errors.join('\n')}` },
          { status: 400 },
        );
      }

      zip!.extractAllTo(gameDir, true);
    } else {
      const filePath = path.join(gameDir, 'index.html');
      await writeFile(filePath, buffer);
    }

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
