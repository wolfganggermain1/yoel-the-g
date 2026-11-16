// ---------------------------------------------------------------------------
// lib/generated-games.ts
// Where AI-generated games live on disk and how they are served.
//
// Uploaded games sit in public/games/, which is baked into the Docker image
// and wiped on every deploy. Generated games are written at runtime, so they
// go under data/ (the persistent volume in production) and are served by
// /api/generated/[slug].
// ---------------------------------------------------------------------------

import path from 'path';

export const GENERATED_URL_PREFIX = '/api/generated/';

export function generatedGameDir(slug: string): string {
  return path.join(process.cwd(), 'data', 'generated', slug);
}

export function generatedGameFile(slug: string): string {
  return path.join(generatedGameDir(slug), 'index.html');
}

export function generatedGamePath(slug: string): string {
  return `${GENERATED_URL_PREFIX}${slug}`;
}

export function isGeneratedGamePath(gamePath: string): boolean {
  return gamePath.startsWith(GENERATED_URL_PREFIX);
}
