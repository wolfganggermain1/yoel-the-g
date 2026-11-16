'use client';

import { useCallback, useEffect, useState } from 'react';
import GenerateGameButton from '@/components/GenerateGameButton';
import type { GameTemplateConfig } from '@/lib/game-template';

interface Idea {
  id: number;
  title: string;
  config: GameTemplateConfig;
  game_id: number | null;
  game_slug: string | null;
  user_name: string | null;
  developer_name: string | null;
  created_at: string;
}

const cardStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--card-shadow)',
};

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/ideas');
    const data = await res.json();
    setIdeas(data.ideas ?? []);
    setCanGenerate(Boolean(data.canGenerate));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(idea: Idea) {
    if (!confirm(`Delete the idea "${idea.title}"?`)) return;
    await fetch('/api/admin/ideas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idea.id }),
    });
    load();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold font-fredoka" style={{ color: 'var(--text)' }}>
          {'\u{1F4A1}'} Game Ideas
        </h2>
        <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>
          Every game described with &quot;Make my game!&quot; is saved here.
          {canGenerate
            ? ' The game maker is on: build any idea below.'
            : ' The game maker is off until a super admin adds a Claude API key in Settings.'}
        </p>
      </div>

      {loading ? (
        <p className="opacity-60" style={{ color: 'var(--text)' }}>Loading...</p>
      ) : ideas.length === 0 ? (
        <p className="opacity-60" style={{ color: 'var(--text)' }}>
          No ideas yet. Describe a game on the home page and press &quot;Make my game!&quot;.
        </p>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="rounded-2xl p-5 space-y-3" style={cardStyle}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-fredoka text-lg" style={{ color: 'var(--text)' }}>
                    {idea.title}
                  </p>
                  <p className="text-xs opacity-60" style={{ color: 'var(--text)' }}>
                    {[idea.config.gameType, idea.config.theme, idea.config.difficulty]
                      .filter(Boolean)
                      .join(' · ')}
                    {' — by '}
                    {idea.developer_name || idea.user_name || 'unknown'}
                    {' · '}
                    {new Date(idea.created_at + 'Z').toLocaleDateString()}
                  </p>
                  {idea.config.description && (
                    <p className="text-sm mt-2 whitespace-pre-line" style={{ color: 'var(--text)' }}>
                      {idea.config.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(idea)}
                  className="p-2 rounded-lg text-xs hover:opacity-80 cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                  }}
                  title="Delete idea"
                >
                  {'\u{1F5D1}'}
                </button>
              </div>

              {idea.game_slug ? (
                <a href={`/play/${idea.game_slug}`} className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  {'\u{1F3AE}'} Made into a game: play the draft
                </a>
              ) : canGenerate ? (
                openId === idea.id ? (
                  <GenerateGameButton ideaId={idea.id} />
                ) : (
                  <button onClick={() => setOpenId(idea.id)} className="btn-primary">
                    Make this game
                  </button>
                )
              ) : (
                <p className="text-xs opacity-50" style={{ color: 'var(--text)' }}>
                  Waiting for the game maker to be switched on.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
