'use client';

import { useState, useCallback, useRef } from 'react';
import {
  generateGamePrompt,
  type GameTemplateConfig,
} from '@/lib/game-template';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GameType = GameTemplateConfig['gameType'];
type Theme = GameTemplateConfig['theme'];
type Difficulty = GameTemplateConfig['difficulty'];
type Feature = 'score' | 'timer' | 'levels' | 'powerups' | 'sounds';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6;

const GAME_TYPES: { type: GameType; emoji: string; name: string; desc: string }[] = [
  { type: 'platformer', emoji: '\u{1F3C3}', name: 'Platformer', desc: 'Jump & run across platforms!' },
  { type: 'puzzle', emoji: '\u{1F9E9}', name: 'Puzzle', desc: 'Match tiles & solve puzzles!' },
  { type: 'memory', emoji: '\u{1F0CF}', name: 'Memory', desc: 'Flip cards & find matches!' },
  { type: 'runner', emoji: '\u{1F3C3}\u200D\u2642\uFE0F', name: 'Runner', desc: 'Run, jump & dodge obstacles!' },
  { type: 'shooter', emoji: '\u{1F3AF}', name: 'Shooter', desc: 'Aim, shoot & defeat baddies!' },
  { type: 'drawing', emoji: '\u{1F3A8}', name: 'Drawing', desc: 'Draw, stamp & create art!' },
];

const THEMES: { theme: Theme; emoji: string; name: string; bg: string }[] = [
  { theme: 'space', emoji: '\u{1F680}', name: 'Space', bg: '#1a1a3e' },
  { theme: 'ocean', emoji: '\u{1F30A}', name: 'Ocean', bg: '#0e4a6e' },
  { theme: 'forest', emoji: '\u{1F332}', name: 'Forest', bg: '#1a4a1a' },
  { theme: 'city', emoji: '\u{1F3D9}\uFE0F', name: 'City', bg: '#4a3a2e' },
  { theme: 'fantasy', emoji: '\u{1F3F0}', name: 'Fantasy', bg: '#3e1a5e' },
];

const DIFFICULTIES: {
  level: Difficulty;
  stars: string;
  name: string;
  ages: string;
  desc: string;
}[] = [
  { level: 'easy', stars: '\u2B50', name: 'Easy', ages: 'Ages 3-5', desc: 'Simple taps, very forgiving' },
  { level: 'medium', stars: '\u2B50\u2B50', name: 'Medium', ages: 'Ages 6-8', desc: 'Some challenge, basic controls' },
  { level: 'hard', stars: '\u2B50\u2B50\u2B50', name: 'Hard', ages: 'Ages 9+', desc: 'Fast-paced, multiple controls' },
];

const FEATURES: { id: Feature; emoji: string; name: string; defaultOn: boolean }[] = [
  { id: 'score', emoji: '\u{1F4CA}', name: 'Score System', defaultOn: true },
  { id: 'timer', emoji: '\u23F1\uFE0F', name: 'Timer', defaultOn: true },
  { id: 'levels', emoji: '\u{1F4C8}', name: 'Multiple Levels', defaultOn: true },
  { id: 'powerups', emoji: '\u26A1', name: 'Power-ups', defaultOn: true },
  { id: 'sounds', emoji: '\u{1F50A}', name: 'Sound Effects', defaultOn: false },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PluginWizardPage() {
  // Wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animating, setAnimating] = useState(false);

  // Selections
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [features, setFeatures] = useState<Feature[]>(
    FEATURES.filter((f) => f.defaultOn).map((f) => f.id),
  );
  const [title, setTitle] = useState('');
  const [developerName, setDeveloperName] = useState('');

  // Prompt output
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1: return gameType !== null;
      case 2: return theme !== null;
      case 3: return difficulty !== null;
      case 4: return true; // features are optional
      case 5: return title.trim().length > 0 && developerName.trim().length > 0;
      default: return false;
    }
  }, [step, gameType, theme, difficulty, title, developerName]);

  function goTo(target: number) {
    if (target === step || animating) return;
    setDirection(target > step ? 'forward' : 'backward');
    setAnimating(true);
    setTimeout(() => {
      setStep(target);
      setAnimating(false);
    }, 200);
  }

  function next() {
    if (!canProceed() || step >= TOTAL_STEPS) return;

    // If advancing from step 5 to step 6, generate the prompt
    if (step === 5) {
      const config: GameTemplateConfig = {
        gameType: gameType!,
        theme: theme!,
        difficulty: difficulty!,
        features,
        title: title.trim(),
        developerName: developerName.trim(),
      };
      setGeneratedPrompt(generateGamePrompt(config));
    }

    goTo(step + 1);
  }

  function back() {
    if (step <= 1) return;
    goTo(step - 1);
  }

  function reset() {
    setStep(1);
    setDirection('forward');
    setGameType(null);
    setTheme(null);
    setDifficulty(null);
    setFeatures(FEATURES.filter((f) => f.defaultOn).map((f) => f.id));
    setTitle('');
    setDeveloperName('');
    setGeneratedPrompt('');
    setCopied(false);
  }

  // -----------------------------------------------------------------------
  // Clipboard
  // -----------------------------------------------------------------------

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = generatedPrompt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  // -----------------------------------------------------------------------
  // Feature toggle
  // -----------------------------------------------------------------------

  function toggleFeature(id: Feature) {
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  // Shared card base styles
  const cardBase =
    'rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none ' +
    'hover:scale-[1.03] active:scale-[0.97]';

  const selectedRing = 'border-[var(--primary)] shadow-[0_0_0_3px_var(--primary)]';
  const unselectedBorder = 'border-[var(--border)]';

  // -----------------------------------------------------------------------
  // Step content
  // -----------------------------------------------------------------------

  function renderStep() {
    switch (step) {
      // -------------------------------------------------------------------
      // STEP 1 -- Game Type
      // -------------------------------------------------------------------
      case 1:
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-fredoka font-bold mb-2" style={{ color: 'var(--text)' }}>
              Choose Your Game Type
            </h2>
            <p className="mb-6 opacity-60 text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              What kind of game do you want to create?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {GAME_TYPES.map((g) => (
                <button
                  key={g.type}
                  onClick={() => setGameType(g.type)}
                  className={`${cardBase} p-5 sm:p-6 text-left ${
                    gameType === g.type ? selectedRing : unselectedBorder
                  }`}
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div className="text-4xl sm:text-5xl mb-3">{g.emoji}</div>
                  <div className="font-fredoka font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                    {g.name}
                  </div>
                  <div className="text-sm mt-1 opacity-60" style={{ color: 'var(--text)' }}>
                    {g.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      // -------------------------------------------------------------------
      // STEP 2 -- Theme
      // -------------------------------------------------------------------
      case 2:
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-fredoka font-bold mb-2" style={{ color: 'var(--text)' }}>
              Pick a Theme
            </h2>
            <p className="mb-6 opacity-60 text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              What world will your game live in?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {THEMES.map((t) => (
                <button
                  key={t.theme}
                  onClick={() => setTheme(t.theme)}
                  className={`${cardBase} p-5 sm:p-6 text-center ${
                    theme === t.theme ? selectedRing : unselectedBorder
                  }`}
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  {/* Color hint strip */}
                  <div
                    className="w-full h-2 rounded-full mb-4 mx-auto"
                    style={{ backgroundColor: t.bg, maxWidth: '80px' }}
                  />
                  <div className="text-4xl sm:text-5xl mb-2">{t.emoji}</div>
                  <div className="font-fredoka font-bold text-lg" style={{ color: 'var(--text)' }}>
                    {t.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      // -------------------------------------------------------------------
      // STEP 3 -- Difficulty
      // -------------------------------------------------------------------
      case 3:
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-fredoka font-bold mb-2" style={{ color: 'var(--text)' }}>
              Set the Difficulty
            </h2>
            <p className="mb-6 opacity-60 text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              Who is this game for?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.level}
                  onClick={() => setDifficulty(d.level)}
                  className={`${cardBase} p-6 sm:p-8 text-center ${
                    difficulty === d.level ? selectedRing : unselectedBorder
                  }`}
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div className="text-3xl sm:text-4xl mb-3">{d.stars}</div>
                  <div className="font-fredoka font-bold text-xl sm:text-2xl" style={{ color: 'var(--text)' }}>
                    {d.name}
                  </div>
                  <div
                    className="text-sm font-semibold mt-1 px-3 py-1 rounded-full inline-block"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    {d.ages}
                  </div>
                  <div className="text-sm mt-3 opacity-60" style={{ color: 'var(--text)' }}>
                    {d.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      // -------------------------------------------------------------------
      // STEP 4 -- Features
      // -------------------------------------------------------------------
      case 4:
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-fredoka font-bold mb-2" style={{ color: 'var(--text)' }}>
              Choose Features
            </h2>
            <p className="mb-6 opacity-60 text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              Toggle the features you want in your game.
            </p>
            <div className="space-y-3 max-w-lg mx-auto">
              {FEATURES.map((f) => {
                const active = features.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className={`${cardBase} w-full flex items-center gap-4 p-4 sm:p-5 ${
                      active ? selectedRing : unselectedBorder
                    }`}
                    style={{ backgroundColor: 'var(--surface)' }}
                  >
                    <span className="text-2xl sm:text-3xl">{f.emoji}</span>
                    <span className="flex-1 text-left font-fredoka font-semibold text-lg" style={{ color: 'var(--text)' }}>
                      {f.name}
                    </span>
                    {/* Toggle switch */}
                    <div
                      className="relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0"
                      style={{
                        backgroundColor: active ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
                        style={{
                          transform: active ? 'translateX(22px)' : 'translateX(2px)',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      // -------------------------------------------------------------------
      // STEP 5 -- Details
      // -------------------------------------------------------------------
      case 5:
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-fredoka font-bold mb-2" style={{ color: 'var(--text)' }}>
              Game Details
            </h2>
            <p className="mb-6 opacity-60 text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              Name your game and add your developer credit.
            </p>

            <div className="max-w-lg mx-auto space-y-5">
              {/* Title input */}
              <div>
                <label
                  htmlFor="game-title"
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  Game Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="game-title"
                  type="text"
                  placeholder="e.g. Space Jump Adventures"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                  className="w-full px-4 py-3 rounded-xl text-lg outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Developer name input */}
              <div>
                <label
                  htmlFor="dev-name"
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  Developer Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="dev-name"
                  type="text"
                  placeholder="Your name"
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  maxLength={40}
                  className="w-full px-4 py-3 rounded-xl text-lg outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Selection summary */}
              <div
                className="rounded-xl p-4 mt-4"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <h3 className="font-fredoka font-bold text-base mb-3" style={{ color: 'var(--text)' }}>
                  Your Selections
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm" style={{ color: 'var(--text)' }}>
                  <span className="opacity-60">Type:</span>
                  <span className="font-semibold">
                    {GAME_TYPES.find((g) => g.type === gameType)?.emoji}{' '}
                    {GAME_TYPES.find((g) => g.type === gameType)?.name}
                  </span>
                  <span className="opacity-60">Theme:</span>
                  <span className="font-semibold">
                    {THEMES.find((t) => t.theme === theme)?.emoji}{' '}
                    {THEMES.find((t) => t.theme === theme)?.name}
                  </span>
                  <span className="opacity-60">Difficulty:</span>
                  <span className="font-semibold">
                    {DIFFICULTIES.find((d) => d.level === difficulty)?.stars}{' '}
                    {DIFFICULTIES.find((d) => d.level === difficulty)?.name}
                  </span>
                  <span className="opacity-60">Features:</span>
                  <span className="font-semibold">
                    {features.length > 0
                      ? features
                          .map((fid) => FEATURES.find((f) => f.id === fid)?.name)
                          .join(', ')
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      // -------------------------------------------------------------------
      // STEP 6 -- Generated Prompt
      // -------------------------------------------------------------------
      case 6:
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-fredoka font-bold mb-2" style={{ color: 'var(--text)' }}>
              Your Game Prompt is Ready!
            </h2>
            <p className="mb-4 opacity-60 text-base sm:text-lg" style={{ color: 'var(--text)' }}>
              Copy this prompt and paste it into Claude or your favorite AI to generate your game!
            </p>

            {/* Copy button */}
            <button
              onClick={copyPrompt}
              className={`
                w-full sm:w-auto
                px-8 py-4
                rounded-xl
                font-fredoka font-bold text-lg
                transition-all duration-200
                hover:scale-[1.02] active:scale-[0.97]
                mb-4
                ${copied ? 'bg-green-500 text-white' : ''}
              `}
              style={
                copied
                  ? {}
                  : {
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                    }
              }
            >
              {copied ? '\u2705  Copied!' : '\u{1F4CB}  Copy to Clipboard'}
            </button>

            {/* Prompt code block */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-2 text-xs font-mono"
                style={{
                  backgroundColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                <span>game-prompt.txt</span>
                <span className="opacity-40">{generatedPrompt.length} chars</span>
              </div>
              <pre
                ref={promptRef}
                className="p-4 text-xs sm:text-sm overflow-auto max-h-[50vh] leading-relaxed whitespace-pre-wrap"
                style={{
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                {generatedPrompt}
              </pre>
            </div>

            {/* Hint */}
            <p className="text-xs mt-4 opacity-40 text-center" style={{ color: 'var(--text)' }}>
              Paste this prompt into Claude or your favorite AI to generate your game!
            </p>

            {/* Start over */}
            <div className="flex justify-center mt-6">
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl font-fredoka font-semibold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-4 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-fredoka font-bold" style={{ color: 'var(--text)' }}>
          <span className="text-4xl sm:text-5xl mr-2">{'\u{1F3AE}'}</span>
          Game Creator
        </h1>
        <p className="mt-2 text-base sm:text-lg opacity-60 font-fredoka" style={{ color: 'var(--text)' }}>
          Design your dream game in a few simple steps
        </p>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isDone = stepNum < step;
            return (
              <button
                key={stepNum}
                onClick={() => {
                  // Allow clicking to revisit completed steps only
                  if (stepNum < step) goTo(stepNum);
                }}
                disabled={stepNum >= step}
                className={`
                  w-9 h-9 sm:w-10 sm:h-10
                  rounded-full
                  flex items-center justify-center
                  font-fredoka font-bold text-sm sm:text-base
                  transition-all duration-300
                  ${stepNum < step ? 'cursor-pointer hover:scale-110' : ''}
                  ${stepNum > step ? 'opacity-30' : ''}
                `}
                style={{
                  backgroundColor: isActive || isDone ? 'var(--primary)' : 'var(--surface)',
                  color: isActive || isDone ? 'white' : 'var(--text)',
                  border: `2px solid ${isActive || isDone ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                {isDone ? '\u2713' : stepNum}
              </button>
            );
          })}
        </div>
        {/* Progress track */}
        <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: 'var(--primary)',
            }}
          />
        </div>
        <p className="text-center text-xs mt-1.5 font-mono opacity-40" style={{ color: 'var(--text)' }}>
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step content */}
      <div className="max-w-3xl mx-auto px-4">
        <div
          className={`transition-all duration-200 ${
            animating
              ? direction === 'forward'
                ? 'opacity-0 translate-x-8'
                : 'opacity-0 -translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {renderStep()}
        </div>
      </div>

      {/* Bottom navigation */}
      {step < TOTAL_STEPS && (
        <div
          className="fixed bottom-0 inset-x-0 z-40"
          style={{
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            {/* Back button */}
            {step > 1 ? (
              <button
                onClick={back}
                className="px-5 py-3 rounded-xl font-fredoka font-semibold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                Back
              </button>
            ) : (
              <div /> /* spacer */
            )}

            {/* Next button */}
            <button
              onClick={next}
              disabled={!canProceed()}
              className="px-8 py-3 rounded-xl font-fredoka font-bold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
              }}
            >
              {step === 5 ? 'Generate Prompt' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
