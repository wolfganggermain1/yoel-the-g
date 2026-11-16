// ---------------------------------------------------------------------------
// lib/anthropic-key.ts
// The Claude API key comes from the ANTHROPIC_API_KEY env var if set, else
// from the key a super admin saved in Admin → Settings (settings table).
// ---------------------------------------------------------------------------

import { getSetting } from '@/lib/db';

export const ANTHROPIC_KEY_SETTING = 'anthropic_api_key';

export function getAnthropicKey(): { key: string; source: 'env' | 'admin' } | null {
  if (process.env.ANTHROPIC_API_KEY) return { key: process.env.ANTHROPIC_API_KEY, source: 'env' };
  const saved = getSetting(ANTHROPIC_KEY_SETTING);
  return saved ? { key: saved, source: 'admin' } : null;
}
