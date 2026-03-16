'use client';

import { useState, useRef } from 'react';
import {
  generateGamePrompt,
  type GameTemplateConfig,
} from '@/lib/game-template';

type Difficulty = GameTemplateConfig['difficulty'];

const STYLE_CHIPS = [
  'Platformer', 'Puzzle', 'Memory', 'Runner', 'Shooter', 'Drawing',
  'Racing', 'Fighting', 'Tower Defense', 'Clicker', 'Adventure', 'Sports',
];

const WORLD_CHIPS = [
  'Space', 'Ocean', 'Forest', 'City', 'Fantasy', 'Candy Land',
  'Dinosaurs', 'Superheroes', 'Pirates', 'Robots', 'Haunted House', 'Ice World',
];

const DIFFICULTIES: { diff: Difficulty; label: string; ages: string; desc: string }[] = [
  { diff: 'easy', label: 'Easy', ages: '3-5', desc: 'Big buttons, slow & gentle' },
  { diff: 'medium', label: 'Medium', ages: '6-8', desc: 'Some challenge' },
  { diff: 'hard', label: 'Hard', ages: '9+', desc: 'Fast & tricky' },
];

const FEATURES = [
  { id: 'score', name: 'Score' },
  { id: 'timer', name: 'Timer' },
  { id: 'levels', name: 'Levels' },
  { id: 'powerups', name: 'Power-ups' },
  { id: 'sounds', name: 'Sounds' },
];

const KNOWN_GAME_TYPES: NonNullable<GameTemplateConfig['gameType']>[] = [
  'platformer', 'puzzle', 'memory', 'runner', 'shooter', 'drawing',
];
const KNOWN_THEMES: NonNullable<GameTemplateConfig['theme']>[] = [
  'space', 'ocean', 'forest', 'city', 'fantasy',
];

export default function GameCreator() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [features, setFeatures] = useState<string[]>(['score', 'levels', 'sounds']);
  const [title, setTitle] = useState('');
  const [devName, setDevName] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLPreElement>(null);

  const totalSteps = 4;

  function addChipText(chip: string, category: 'style' | 'world') {
    setDescription((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return category === 'style'
          ? `A ${chip.toLowerCase()} game`
          : `A game set in ${chip.toLowerCase()}`;
      }
      const sep = /[.!?]$/.test(trimmed) ? ' ' : '. ';
      return category === 'style'
        ? `${trimmed}${sep}With ${chip.toLowerCase()} gameplay.`
        : `${trimmed}${sep}Set in ${chip.toLowerCase()}.`;
    });
    textareaRef.current?.focus();
  }

  function toggleFeature(id: string) {
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  function generate() {
    if (!difficulty || !title.trim()) return;

    const descLower = description.toLowerCase();
    const detectedType = KNOWN_GAME_TYPES.find((t) => descLower.includes(t));
    const detectedTheme = KNOWN_THEMES.find((t) => descLower.includes(t));

    const prompt = generateGamePrompt({
      gameType: detectedType,
      theme: detectedTheme,
      difficulty,
      features,
      title: title.trim(),
      description: description.trim(),
      developerName: devName.trim() || 'Game Developer',
    });
    setGeneratedPrompt(prompt);
    setStep(4);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
    } catch {
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
    setStep(1);
    setDescription('');
    setDifficulty(null);
    setFeatures(['score', 'levels', 'sounds']);
    setTitle('');
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
            Describe your dream game, get an AI prompt, and bring it to life!
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
            Game Creator
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[var(--text)] opacity-50 hover:opacity-100 text-2xl touch-target"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
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

        {/* Step 1: Describe your dream game */}
        {step === 1 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-1">
              What&apos;s your dream game?
            </h3>
            <p className="text-sm text-[var(--text)] opacity-50 mb-4">
              Describe it in your own words &mdash; the more detail, the better the game!
            </p>

            <textarea
              ref={textareaRef}
              placeholder={"Tell us everything!\n\nWhat do you do in the game?\nWho do you play as?\nWhat's the world like?\nWhat makes it fun or special?"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 rounded-xl resize-none text-base leading-relaxed"
              style={{
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                color: 'var(--text)',
                minHeight: '150px',
              }}
              maxLength={1000}
            />
            <div className="text-right text-xs text-[var(--text)] opacity-30 mt-1">
              {description.length}/1000
            </div>

            {/* Inspiration chips */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-[var(--text)] opacity-60 mb-3">
                Need ideas? Tap to add:
              </p>

              <p className="text-xs font-medium text-[var(--text)] opacity-40 mb-1.5 uppercase tracking-wide">
                Game Style
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {STYLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => addChipText(chip, 'style')}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <p className="text-xs font-medium text-[var(--text)] opacity-40 mb-1.5 uppercase tracking-wide">
                World / Theme
              </p>
              <div className="flex flex-wrap gap-2">
                {WORLD_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => addChipText(chip, 'world')}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!description.trim()}
              className="mt-6 w-full btn-primary py-3 rounded-xl font-fredoka font-bold text-lg disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </div>
        )}

        {/* Step 2: Difficulty */}
        {step === 2 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-4">
              How hard should it be?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.diff}
                  onClick={() => {
                    setDifficulty(d.diff);
                    setStep(3);
                  }}
                  className="p-5 rounded-xl text-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: difficulty === d.diff ? 'var(--primary)' : 'var(--surface)',
                    border: '2px solid var(--border)',
                    color: difficulty === d.diff ? '#fff' : 'var(--text)',
                  }}
                >
                  <div className="font-fredoka font-bold text-lg">{d.label}</div>
                  <div className="text-sm opacity-70 mt-1">Ages {d.ages}</div>
                  <div className="text-xs opacity-50 mt-0.5">{d.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-4 text-sm text-[var(--primary)] hover:underline"
            >
              {'\u2190'} Back
            </button>
          </div>
        )}

        {/* Step 3: Title + Features + Generate */}
        {step === 3 && (
          <div>
            <h3 className="font-fredoka font-semibold text-xl text-[var(--text)] mb-4">
              Name it &amp; launch!
            </h3>

            <div className="space-y-3 mb-5">
              <input
                type="text"
                placeholder="Game Title (required)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 rounded-xl font-medium text-lg"
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  color: 'var(--text)',
                }}
                maxLength={50}
              />
              <input
                type="text"
                placeholder="Your Developer Name"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                className="w-full p-3 rounded-xl"
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  color: 'var(--text)',
                }}
                maxLength={30}
              />
            </div>

            {/* Feature chips */}
            <p className="text-sm font-semibold text-[var(--text)] opacity-60 mb-2">
              Features to include:
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {FEATURES.map((f) => {
                const active = features.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className="px-3.5 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: active ? 'var(--primary)' : 'var(--surface)',
                      border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      color: active ? '#fff' : 'var(--text)',
                    }}
                  >
                    {active ? '\u2713 ' : ''}{f.name}
                  </button>
                );
              })}
            </div>

            {/* Summary */}
            <div
              className="p-4 rounded-xl mb-5 text-sm"
              style={{ background: 'var(--border)', color: 'var(--text)' }}
            >
              <div className="font-fredoka font-semibold mb-1">Your Game:</div>
              <div className="line-clamp-2 opacity-70">{description}</div>
              <div className="mt-1 opacity-50">
                Difficulty: {DIFFICULTIES.find((d) => d.diff === difficulty)?.label}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3 rounded-xl font-medium"
                style={{ background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--text)' }}
              >
                {'\u2190'} Back
              </button>
              <button
                onClick={generate}
                disabled={!title.trim()}
                className="flex-1 btn-primary py-3 rounded-xl font-fredoka font-bold text-lg disabled:opacity-40"
              >
                Generate AI Prompt
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Generated Prompt */}
        {step === 4 && (
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
              className="rounded-xl overflow-hidden mb-4"
              style={{ border: '2px solid var(--border)' }}
            >
              <div
                className="px-4 py-2 flex items-center justify-between text-sm font-medium"
                style={{ background: 'var(--border)', color: 'var(--text)' }}
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
                className="flex-1 min-w-[200px] btn-primary py-3 rounded-xl font-fredoka font-bold text-lg transition-all"
                style={copied ? { background: '#22c55e' } : {}}
              >
                {copied ? '\u2705 Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl font-medium"
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
