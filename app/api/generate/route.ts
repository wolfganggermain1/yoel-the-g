import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { requireMinRole, type JwtPayload } from '@/lib/auth';
import {
  addGame,
  addGameDeveloper,
  addGeneration,
  countGenerationsLastDay,
  getGameBySlug,
} from '@/lib/db';
import { generateGamePrompt, type GameTemplateConfig } from '@/lib/game-template';
import { scanGameHtml, slugify } from '@/lib/game-scan';
import { generatedGameDir, generatedGameFile, generatedGamePath } from '@/lib/generated-games';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

const DEFAULT_MODEL = 'claude-opus-5-5';
const DEFAULT_DAILY_LIMIT = 5;
const MAX_HTML_SIZE = 5 * 1024 * 1024; // same cap as uploads

// USD per million tokens [input, output], only for the cost shown after a run.
const PRICE_PER_MTOK: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
};

const GAME_TYPES = new Set(['platformer', 'puzzle', 'memory', 'runner', 'shooter', 'drawing']);
const THEMES = new Set(['space', 'ocean', 'forest', 'city', 'fantasy']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const FEATURES = new Set(['score', 'timer', 'levels', 'powerups', 'sounds']);

const AGE_MIN: Record<GameTemplateConfig['difficulty'], number> = { easy: 3, medium: 6, hard: 9 };

const SYSTEM_PROMPT = `You are the game maker for Yoel The G, a gaming platform for kids.
You turn a game brief into a complete, polished, fully playable HTML5 Canvas game.

OUTPUT FORMAT
- Reply with ONLY the HTML document: start with <!DOCTYPE html> and end with </html>.
- No markdown fences, no explanation before or after the document.
- Keep the file under 4 MB.

PLATFORM SECURITY SCANNER
The platform's scanner rejects the file if these appear ANYWHERE in it, including inside
comments or strings, so never write them (the list only grows, so avoid all of these):
  eval(   new Function(   document.cookie   XMLHttpRequest   atob(
  String.fromCharCode   __proto__   window['eval'
  fetch( / import( / navigator.sendBeacon( pointing at an http(s) URL
- Read keyboard input with event.key or event.code, never String.fromCharCode.
- No external URLs at all: no fonts, images, scripts, stylesheets or audio from the
  web. Draw everything on the canvas and synthesize sounds with the Web Audio API.`;

type StreamEvent =
  | { type: 'status'; message: string }
  | { type: 'progress'; chars: number }
  | { type: 'done'; slug: string; title: string; playUrl: string; costCents: number | null }
  | { type: 'error'; message: string };

/** A failure with a message safe to show to the player. */
class GenerationFailure extends Error {}

function parseConfig(raw: unknown): GameTemplateConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

  const title = str(r.title, 60);
  const difficulty = str(r.difficulty, 10);
  if (!title || !DIFFICULTIES.has(difficulty)) return null;

  const gameType = str(r.gameType, 20);
  const theme = str(r.theme, 20);
  const features = Array.isArray(r.features)
    ? r.features.filter((f): f is string => typeof f === 'string' && FEATURES.has(f))
    : [];

  return {
    gameType: GAME_TYPES.has(gameType) ? (gameType as GameTemplateConfig['gameType']) : undefined,
    theme: THEMES.has(theme) ? (theme as GameTemplateConfig['theme']) : undefined,
    difficulty: difficulty as GameTemplateConfig['difficulty'],
    features,
    title,
    description: str(r.description, 2000),
    developerName: str(r.developerName, 60) || 'Game Developer',
  };
}

function uniqueSlug(title: string): string {
  const base = slugify(title).slice(0, 50).replace(/-$/, '') || 'game';
  let slug = base;
  for (let n = 2; getGameBySlug(slug); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

function categoryFor(gameType: GameTemplateConfig['gameType']): string {
  if (gameType === 'drawing') return 'creative';
  if (gameType === 'puzzle' || gameType === 'memory') return 'puzzle';
  return 'arcade';
}

function extractHtml(text: string): string | null {
  const start = text.search(/<!doctype html|<html[\s>]/i);
  const end = text.lastIndexOf('</html>');
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + '</html>'.length);
}

function fixPrompt(violations: string[]): string {
  return `The platform's security scanner rejected the game because it matched these patterns:
${violations.map((v) => `- ${v}`).join('\n')}

Remove every occurrence (including in comments and strings), keep the game otherwise identical,
and return the complete corrected HTML document, nothing else.`;
}

function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICE_PER_MTOK[model];
  if (!price) return null;
  return Math.round(((inputTokens * price[0] + outputTokens * price[1]) / 1_000_000) * 100);
}

async function streamMessage(
  client: Anthropic,
  model: string,
  messages: Anthropic.Beta.BetaMessageParam[],
  send: (event: StreamEvent) => void,
) {
  const stream = client.beta.messages.stream({
    model,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high' },
    system: SYSTEM_PROMPT,
    messages,
  });

  let chars = 0;
  let lastSent = 0;
  stream.on('text', (delta) => {
    chars += delta.length;
    if (chars - lastSent >= 2000) {
      lastSent = chars;
      send({ type: 'progress', chars });
    }
  });

  return stream.finalMessage();
}

/**
 * Ask the model for the game; one automatic fix round if the scanner rejects it.
 */
async function produceHtml(
  model: string,
  config: GameTemplateConfig,
  usage: { input: number; output: number },
  send: (event: StreamEvent) => void,
): Promise<string> {
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: generateGamePrompt(config) },
  ];

  for (let attempt = 1; attempt <= 2; attempt++) {
    send({
      type: 'status',
      message: attempt === 1
        ? 'Dreaming up your game...'
        : 'Fixing a few things the safety check flagged...',
    });

    const message = await streamMessage(client, model, messages, send);
    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;

    if (message.stop_reason === 'refusal') {
      throw new GenerationFailure('The game maker declined this idea. Try describing a different game.');
    }
    if (message.stop_reason === 'max_tokens') {
      throw new GenerationFailure('The game came out too big. Try a simpler idea.');
    }

    const text = message.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    const html = extractHtml(text);
    if (!html) {
      throw new GenerationFailure('The game maker did not return a complete game. Please try again.');
    }
    if (Buffer.byteLength(html, 'utf8') > MAX_HTML_SIZE) {
      throw new GenerationFailure('The game came out too big. Try a simpler idea.');
    }

    const violations = scanGameHtml(html);
    if (violations.length === 0) return html;

    messages.push(
      { role: 'assistant', content: message.content as Anthropic.Beta.BetaContentBlockParam[] },
      { role: 'user', content: fixPrompt(violations) },
    );
  }

  throw new GenerationFailure('The game did not pass the safety check. Try a different idea.');
}

async function generate(
  user: JwtPayload,
  config: GameTemplateConfig,
  developerId: number,
  model: string,
  send: (event: StreamEvent) => void,
) {
  const startedAt = Date.now();
  const usage = { input: 0, output: 0 };

  try {
    const html = await produceHtml(model, config, usage, send);

    send({ type: 'status', message: 'Saving your game...' });
    const slug = uniqueSlug(config.title);
    await mkdir(generatedGameDir(slug), { recursive: true });
    await writeFile(generatedGameFile(slug), html, 'utf8');

    const result = addGame({
      title: config.title,
      slug,
      description: config.description || `Made with the YTG game maker by ${config.developerName}.`,
      developer_id: developerId,
      game_path: generatedGamePath(slug),
      category: categoryFor(config.gameType),
      age_min: AGE_MIN[config.difficulty],
      features: config.features,
      published: 0,
    });
    const gameId = Number(result.lastInsertRowid);
    addGameDeveloper(gameId, developerId, 'lead');

    const costCents = estimateCostCents(model, usage.input, usage.output);
    addGeneration({
      user_id: user.userId,
      game_id: gameId,
      model,
      status: 'ok',
      input_tokens: usage.input,
      output_tokens: usage.output,
      cost_cents: costCents,
      duration_ms: Date.now() - startedAt,
    });

    send({ type: 'done', slug, title: config.title, playUrl: `/play/${slug}`, costCents });
  } catch (err) {
    if (!(err instanceof GenerationFailure)) {
      console.error('Generate error:', err);
    }
    addGeneration({
      user_id: user.userId,
      game_id: null,
      model,
      status: 'failed',
      input_tokens: usage.input,
      output_tokens: usage.output,
      cost_cents: estimateCostCents(model, usage.input, usage.output),
      error: err instanceof Error ? err.message : String(err),
      duration_ms: Date.now() - startedAt,
    });
    send({
      type: 'error',
      message: err instanceof GenerationFailure
        ? err.message
        : 'The game maker hit a problem. Please try again.',
    });
  }
}

/**
 * POST /api/generate
 * Generate a game from a wizard config and save it as an unpublished draft.
 * Body: { config: GameTemplateConfig, developerId?: number (admins only) }
 * Streams newline-delimited JSON events: status, progress, done, error.
 */
export async function POST(request: NextRequest) {
  const user = await requireMinRole('family_dev');
  if (!user) {
    return NextResponse.json({ error: 'Please log in at /admin first.' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'The game maker is not set up yet (ANTHROPIC_API_KEY is missing).' },
      { status: 503 },
    );
  }

  let body: { config?: unknown; developerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const config = parseConfig(body.config);
  if (!config) {
    return NextResponse.json({ error: 'Title and difficulty are required' }, { status: 400 });
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const developerId =
    user.developerId ?? (isAdmin && typeof body.developerId === 'number' ? body.developerId : null);
  if (!developerId) {
    return NextResponse.json(
      { error: 'Your account is not linked to a developer profile yet. Ask an admin to link it.' },
      { status: 400 },
    );
  }

  const dailyLimit = Number(process.env.GENERATOR_DAILY_LIMIT) || DEFAULT_DAILY_LIMIT;
  if (countGenerationsLastDay(user.userId) >= dailyLimit) {
    return NextResponse.json(
      { error: `You've used all ${dailyLimit} games for today. Come back tomorrow!` },
      { status: 429 },
    );
  }

  const model = process.env.GENERATOR_MODEL || DEFAULT_MODEL;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };
      try {
        await generate(user, config, developerId, model, send);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
