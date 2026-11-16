import { NextRequest, NextResponse } from 'next/server';
import { requireMinRole } from '@/lib/auth';
import { deleteGameIdea, getGameIdea, listGameIdeas } from '@/lib/db';
import { getAnthropicKey } from '@/lib/anthropic-key';

export const dynamic = 'force-dynamic';

function isAdmin(role: string) {
  return role === 'admin' || role === 'super_admin';
}

/**
 * GET /api/admin/ideas
 * Saved game ideas, newest first. Admins see everyone's; developers see their own.
 * canGenerate tells the page whether the game maker has an API key.
 */
export async function GET() {
  const user = await requireMinRole('family_dev');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ideas = listGameIdeas(isAdmin(user.role) ? undefined : user.userId).map((i) => ({
    ...i,
    config: JSON.parse(i.config),
  }));
  return NextResponse.json({ ideas, canGenerate: getAnthropicKey() !== null });
}

/**
 * DELETE /api/admin/ideas
 * Body: { id }. Admins can delete any idea; developers only their own.
 */
export async function DELETE(request: NextRequest) {
  const user = await requireMinRole('family_dev');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: unknown };
  const idea = typeof id === 'number' ? getGameIdea(id) : undefined;
  if (!idea || (!isAdmin(user.role) && idea.user_id !== user.userId)) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }
  deleteGameIdea(idea.id);
  return NextResponse.json({ success: true });
}
