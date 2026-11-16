import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { generatedGameFile } from '@/lib/generated-games';

export const dynamic = 'force-dynamic';

const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * GET /api/generated/[slug]
 * Serve an AI-generated game's HTML from the data volume.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  if (!SLUG_PATTERN.test(params.slug)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const html = await readFile(generatedGameFile(params.slug));
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
