import { NextRequest, NextResponse } from 'next/server';
import { requireMinRole } from '@/lib/auth';
import { addTubeVideo, deleteTubeVideo, getTubeVideos, updateTubeVideo } from '@/lib/db';
import { isTubeCategory, parseYouTubeId } from '@/lib/tube';

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'SOCS=CAI' },
    cache: 'no-store',
  });
}

/**
 * Look up title + channel via YouTube oEmbed. oEmbed refuses videos whose owner
 * disabled embedding, which is exactly the set that would not play in Tube.
 */
async function lookupVideo(youtubeId: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const res = await fetchWithTimeout(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
  );
  if (res.status === 401 || res.status === 403) {
    return { error: 'This video does not allow playing on other sites. Pick another one.' };
  }
  if (!res.ok) {
    return { error: 'Video not found. It may be private or removed.' };
  }
  const meta = (await res.json()) as { title?: string; author_name?: string };

  // Duration is best-effort: it only powers the little time badge on thumbnails.
  let durationSeconds: number | null = null;
  try {
    const page = await (await fetchWithTimeout(watchUrl)).text();
    const m = page.match(/"lengthSeconds":"(\d+)"/);
    if (m) durationSeconds = Number(m[1]);
  } catch {
    // Leave duration empty
  }

  return {
    title: String(meta.title ?? 'Untitled video').slice(0, 200),
    channel: String(meta.author_name ?? '').slice(0, 100),
    durationSeconds,
  };
}

/**
 * GET /api/admin/tube — all videos, including hidden ones.
 */
export async function GET() {
  const user = await requireMinRole('admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ videos: getTubeVideos(true) });
}

/**
 * POST /api/admin/tube — { url, category } approve a new YouTube video.
 */
export async function POST(request: NextRequest) {
  const user = await requireMinRole('admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const youtubeId = typeof body.url === 'string' ? parseYouTubeId(body.url) : null;
  if (!youtubeId) {
    return NextResponse.json({ error: 'That does not look like a YouTube link.' }, { status: 400 });
  }
  const category = isTubeCategory(body.category) ? body.category : 'other';

  if (getTubeVideos(true).some((v) => v.youtube_id === youtubeId)) {
    return NextResponse.json({ error: 'That video is already in YTG Tube.' }, { status: 409 });
  }

  let info: Awaited<ReturnType<typeof lookupVideo>>;
  try {
    info = await lookupVideo(youtubeId);
  } catch {
    return NextResponse.json({ error: 'Could not reach YouTube. Try again.' }, { status: 502 });
  }
  if ('error' in info) {
    return NextResponse.json({ error: info.error }, { status: 422 });
  }

  addTubeVideo({
    youtube_id: youtubeId,
    title: info.title,
    channel: info.channel,
    category,
    duration_seconds: info.durationSeconds,
  });
  return NextResponse.json({ success: true, videos: getTubeVideos(true) });
}

/**
 * PATCH /api/admin/tube — { id, visible?, category?, title? }
 */
export async function PATCH(request: NextRequest) {
  const user = await requireMinRole('admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (body.category !== undefined && !isTubeCategory(body.category)) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : undefined;
  if (title !== undefined && !title) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
  }

  updateTubeVideo(id, {
    visible: typeof body.visible === 'boolean' ? body.visible : undefined,
    category: body.category,
    title,
  });
  return NextResponse.json({ success: true, videos: getTubeVideos(true) });
}

/**
 * DELETE /api/admin/tube?id=123
 */
export async function DELETE(request: NextRequest) {
  const user = await requireMinRole('admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  deleteTubeVideo(id);
  return NextResponse.json({ success: true, videos: getTubeVideos(true) });
}
