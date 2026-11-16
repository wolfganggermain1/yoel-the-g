'use client';

import { useState } from 'react';
import type { GameTemplateConfig } from '@/lib/game-template';

type Phase = 'idle' | 'running' | 'done' | 'error';

interface DoneEvent {
  slug: string;
  title: string;
  playUrl: string;
  costCents: number | null;
}

type StreamEvent =
  | { type: 'status'; message: string }
  | { type: 'progress'; chars: number }
  | ({ type: 'done' } & DoneEvent)
  | { type: 'error'; message: string };

/**
 * "Make my game!" panel shown under a generated prompt. Calls /api/generate
 * and follows its newline-delimited JSON stream until the draft is saved.
 */
export default function GenerateGameButton({ config }: { config: GameTemplateConfig }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');
  const [chars, setChars] = useState(0);
  const [result, setResult] = useState<DoneEvent | null>(null);
  const [error, setError] = useState('');

  async function run() {
    setPhase('running');
    setStatus('Waking up the game maker...');
    setChars(0);
    setError('');

    let finished = false;
    function handleEvent(event: StreamEvent) {
      switch (event.type) {
        case 'status':
          setStatus(event.message);
          break;
        case 'progress':
          setChars(event.chars);
          break;
        case 'done':
          finished = true;
          setResult(event);
          setPhase('done');
          break;
        case 'error':
          throw new Error(event.message);
      }
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) handleEvent(JSON.parse(line));
        }
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer));
      if (!finished) {
        throw new Error('The game maker stopped early. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
    }
  }

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ border: '2px solid var(--primary)', background: 'var(--surface)' }}
    >
      <h4 className="font-fredoka font-semibold text-lg mb-1" style={{ color: 'var(--text)' }}>
        {'✨'} Or let YTG build it for you
      </h4>
      <p className="text-sm opacity-60 mb-3" style={{ color: 'var(--text)' }}>
        Takes 1-3 minutes. Your game lands in Admin as a draft, and an admin publishes it.
      </p>

      {(phase === 'idle' || phase === 'error') && (
        <>
          {error && <p className="text-sm mb-3 text-red-500">{error}</p>}
          <button
            onClick={run}
            className="btn-primary px-6 py-3 rounded-xl font-fredoka font-bold text-lg"
          >
            {phase === 'error' ? 'Try again' : 'Make my game!'}
          </button>
        </>
      )}

      {phase === 'running' && (
        <div className="text-sm" style={{ color: 'var(--text)' }}>
          <p className="font-medium">{status}</p>
          {chars > 0 && (
            <p className="opacity-60">Writing code... {chars.toLocaleString()} characters so far</p>
          )}
          <p className="opacity-60 mt-2">Keep this page open.</p>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="text-sm" style={{ color: 'var(--text)' }}>
          <p className="font-fredoka font-semibold text-lg mb-2">
            {'\u{1F389}'} {result.title} is ready!
          </p>
          <a
            href={result.playUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-block px-6 py-3 rounded-xl font-fredoka font-bold text-lg"
          >
            Play it
          </a>
          <p className="opacity-60 mt-3">
            It is a draft for now. An admin can publish it from Admin &rarr; Games.
            {result.costCents !== null && ` This one cost about $${(result.costCents / 100).toFixed(2)}.`}
          </p>
        </div>
      )}
    </div>
  );
}
