import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireRole } from '@/lib/auth';
import { deleteSetting, setSetting } from '@/lib/db';
import { ANTHROPIC_KEY_SETTING, getAnthropicKey } from '@/lib/anthropic-key';

export const dynamic = 'force-dynamic';

/** Status only; the key itself never leaves the server. */
function keyStatus() {
  const found = getAnthropicKey();
  return found
    ? { set: true, source: found.source, last4: found.key.slice(-4) }
    : { set: false, source: null, last4: null };
}

/**
 * GET /api/admin/settings
 * Whether the game maker has a Claude API key. Super admin only.
 */
export async function GET() {
  const user = await requireRole('super_admin');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  return NextResponse.json({ anthropicKey: keyStatus() });
}

/**
 * PUT /api/admin/settings
 * Body: { anthropicKey: string }. Checks the key with Anthropic, then saves it.
 */
export async function PUT(request: NextRequest) {
  const user = await requireRole('super_admin');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  let body: { anthropicKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const key = typeof body.anthropicKey === 'string' ? body.anthropicKey.trim() : '';
  if (!key.startsWith('sk-ant-') || key.length > 300) {
    return NextResponse.json(
      { error: 'That does not look like a Claude API key (it should start with sk-ant-).' },
      { status: 400 },
    );
  }

  // Listing models is free and proves the key works before we save it.
  try {
    await new Anthropic({ apiKey: key }).models.list({ limit: 1 });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json({ error: 'Anthropic rejected this key.' }, { status: 400 });
    }
    console.error('Key check failed:', err);
    return NextResponse.json(
      { error: 'Could not reach Anthropic to check the key. Try again in a minute.' },
      { status: 502 },
    );
  }

  setSetting(ANTHROPIC_KEY_SETTING, key);
  return NextResponse.json({ success: true, anthropicKey: keyStatus() });
}

/**
 * DELETE /api/admin/settings
 * Remove the saved key (an ANTHROPIC_API_KEY env var, if any, still applies).
 */
export async function DELETE() {
  const user = await requireRole('super_admin');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  deleteSetting(ANTHROPIC_KEY_SETTING);
  return NextResponse.json({ success: true, anthropicKey: keyStatus() });
}
