'use client';

import { useState, useRef } from 'react';
import {
  generateGamePrompt,
  type GameTemplateConfig,
} from '@/lib/game-template';

type GameType = GameTemplateConfig['gameType'];
type Theme = GameTemplateConfig['theme'];
type Difficulty = GameTemplateConfig['difficulty'];

const GAME_TYPES: { type: GameType; emoji: string; name: string }[] = [
  { type: 'platformer', emoji: '\u{1F3C3}', name: 'Platformer' },
  { type: 'puzzle', emoji: '\u{1F9E9}', name: 'Puzzle' },
  { type: 'memory', emoji: '\u{1F0CF}', name: 'Memory' },
  { type: 'runner', emoji: '\u{1F3C3}\u200D\u2642\uFE0F', name: 'Runner' },
  { type: 'shooter', emoji: '\u{1F3AF}', name: 'Shooter' },
  { type: 'drawing', emoji: '\u{1F3A8}', name: 'Drawing' },
];

const THEMES: { theme: Theme; emoji: string; name: string }[] = [
  { theme: 'space', emoji: '\u{1F680}', name: 'Space' },
  { theme: 'ocean', emoji: '\u{1F30A}', name: 'Ocean' },
  { theme: 'forest', emoji: '\u{1F332}', name: 'Forest' },
  { theme: 'city', emoji: '\u{1F3D9}\uFE0F', name: 'City' },
  { theme: 'fantasy', emoji: '\u{1F3F0}', name: 'Fantasy' },
];

const DIFFICULTIES: { diff: Difficulty; stars: string; label: string; ages: string }[] = [
  { diff: 'easy', stars: '\u2B50', label: 'Easy', ages: '3-5' },
  { diff: 'medium', stars: '\u2B50\u2B50', label: 'Medium', ages: '6-8' },
  { diff: 'hard', stars: '\u2B50\u2B50\u2B50', label: 'Hard', ages: '9+' },
];

const FEATURES = [
  { id: 'score', emoji: '\u{1F4CA}', name: 'Score System' },
  { id: 'timer', emoji: '\u23F1\uFE0F', name: 'Timer' },
  { id: 'levels', emoji: '\u{1F4C8}', name: 'Multiple Levels' },
  { id: 'powerups', emoji: '\u26A1', name: 'Power-ups' },
  { id: 'sounds', emoji: '\u{1F50A}', name: 'Sound Effects' },
];

export default function GameCreator() {
  const [isOpen, setIsOpen] = useState(false);
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [features, setFeatures] = useState<string[]>(['score', 'timer', 'levels', 'powerups']);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [devName, setDevName] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  const step =
    !gameType ? 1 :
    !theme ? 2 :
    !difficulty ? 3 :
    !generatedPrompt ? 4 :
    5;

  function toggleFeature(id: string) {
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  function generate() {
    if (!gameType || !theme || !difficulty || !title) return;
    const prompt = generateGamePrompt({
      gameType,
      theme,
      difficulty,
      features,
      title,
      description,
      developerName: devName || 'Game Developer',
    });
    setGeneratedPrompt(prompt);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = generatedPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function reset() {
    setGameType(null);
    setTheme(null);
    setDifficulty(null);
    setFeatures(['score', 'timer', 'levels', 'powerups']);
    setTitle('');
    setDescription('');
    setDevName('');
    setGeneratedPrompt('');
    setCopied(false);
  }

  if (!isOpen) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full theme-card p-8 text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <div className="text-5xl mb-4">{'\u{1F3AE}'}</div>
          <h2 className="font-fredoka font-bold text-2xl sm:text-3xl text-[var(--text)] mb-2">
            Create Your Own Game
          </h2>
          <p className="text-lg text-[var(--text)] opacity-60">
            Answer a few questions, get a ready-to-use AI prompt, paste it into Claude or any AI to build your game!
          </p>
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <div className="theme-card p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-fredoka font-bold text-2xl sm:text-3xl text-[var(--text)]">
            {'\u{1F3AE}'} Game Creator
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[var(--text)] opacity-50 hover:opacity-100 text-2xl"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className="h-2 flex-1 rounded-full transition-all duration-300"
              style={{
                background: s <= step ? 'var(--primary)' : 'var(--border)',
                opacity: s <= step ? 1 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Step 1: Game Type */}
        {step === 1 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-4">
              What type of game do you want to make?
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GAME_TYPES.map((g) => (
                <button
                  key={g.type}
                  onClick={() => setGameType(g.type)}
                  className="p-4 rounded-xl text-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'var(--surface)',
                    border: '2px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <div className="text-3xl mb-2">{g.emoji}</div>
                  <div className="font-fredoka font-semibold">{g.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Theme */}
        {step === 2 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-4">
              Pick a theme for your game
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.theme}
                  onClick={() => setTheme(t.theme)}
                  className="p-4 rounded-xl text-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'var(--surface)',
                    border: '2px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <div className="text-3xl mb-2">{t.emoji}</div>
                  <div className="font-fredoka font-semibold text-sm">{t.name}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setGameType(null); }}
              className="mt-4 text-sm text-[var(--primary)] hover:underline"
            >
              {'\u2190'} Back
            </button>
          </div>
        )}

        {/* Step 3: Difficulty */}
        {step === 3 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-4">
              How hard should it be?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.diff}
                  onClick={() => setDifficulty(d.diff)}
                  className="p-5 rounded-xl text-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'var(--surface)',
                    border: '2px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <div className="text-2xl mb-1">{d.stars}</div>
                  <div className="font-fredoka font-bold text-lg">{d.label}</div>
                  <div className="text-xs opacity-60 mt-1">Ages {d.ages}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setTheme(null); }}
              className="mt-4 text-sm text-[var(--primary)] hover:underline"
            >
              {'\u2190'} Back
            </button>
          </div>
        )}

        {/* Step 4: Features + Details + Generate */}
        {step === 4 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-4">
              Customize your game
            </h3>

            {/* Features toggles */}
            <div className="space-y-2 mb-6">
              {FEATURES.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: features.includes(f.id) ? 'var(--accent)' : 'var(--surface)' }}
                >
                  <input
                    type="checkbox"
                    checked={features.includes(f.id)}
                    onChange={() => toggleFeature(f.id)}
                    className="w-5 h-5 accent-[var(--primary)]"
                  />
                  <span className="text-xl">{f.emoji}</span>
                  <span className="font-medium text-[var(--text)]">{f.name}</span>
                </label>
              ))}
            </div>

            {/* Game title, description + developer name */}
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Game Title (required)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 rounded-lg font-medium text-lg"
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  color: 'var(--text)',
                }}
                maxLength={50}
              />
              <textarea
                placeholder="Describe your game -- what happens, what makes it fun? (optional but recommended)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg resize-none"
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  color: 'var(--text)',
                }}
                rows={3}
                maxLength={300}
              />
              <input
                type="text"
                placeholder="Your Developer Name"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                className="w-full p-3 rounded-lg"
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  color: 'var(--text)',
                }}
                maxLength={30}
              />
            </div>

            {/* Summary */}
            <div
              className="p-4 rounded-lg mb-6 text-sm"
              style={{ background: 'var(--accent)', color: 'var(--text)' }}
            >
              <div className="font-fredoka font-semibold mb-1">Your Game:</div>
              <div>
                {GAME_TYPES.find((g) => g.type === gameType)?.emoji}{' '}
                {GAME_TYPES.find((g) => g.type === gameType)?.name} &middot;{' '}
                {THEMES.find((t) => t.theme === theme)?.emoji}{' '}
                {THEMES.find((t) => t.theme === theme)?.name} &middot;{' '}
                {DIFFICULTIES.find((d) => d.diff === difficulty)?.label}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDifficulty(null)}
                className="px-4 py-3 rounded-lg font-medium"
                style={{ background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--text)' }}
              >
                {'\u2190'} Back
              </button>
              <button
                onClick={generate}
                disabled={!title}
                className="flex-1 btn-primary py-3 rounded-lg font-fredoka font-bold text-lg disabled:opacity-40"
              >
                {'\u2728'} Generate AI Prompt
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Generated Prompt */}
        {step === 5 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-2">
              Your game prompt is ready!
            </h3>
            <p className="text-[var(--text)] opacity-60 mb-4 text-sm">
              Copy this prompt and paste it into Claude, ChatGPT, or any AI to create your game.
              Save the HTML file it generates and upload it via Admin.
            </p>

            {/* Prompt display */}
            <div
              className="rounded-lg overflow-hidden mb-4"
              style={{ border: '2px solid var(--border)' }}
            >
              <div
                className="px-4 py-2 flex items-center justify-between text-sm font-medium"
                style={{ background: 'var(--accent)', color: 'var(--text)' }}
              >
                <span>game-prompt.txt</span>
                <span className="opacity-60">{generatedPrompt.length} chars</span>
              </div>
              <pre
                ref={promptRef}
                className="p-4 text-xs leading-relaxed overflow-auto whitespace-pre-wrap"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  maxHeight: '400px',
                }}
              >
                {generatedPrompt}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={copyPrompt}
                className="flex-1 min-w-[200px] btn-primary py-3 rounded-lg font-fredoka font-bold text-lg transition-all"
                style={copied ? { background: '#22c55e' } : {}}
              >
                {copied ? '\u2705 Copied!' : '\u{1F4CB} Copy to Clipboard'}
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 rounded-lg font-medium"
                style={{ background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--text)' }}
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
