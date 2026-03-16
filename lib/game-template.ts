// ---------------------------------------------------------------------------
// lib/game-template.ts
// Template prompt generator for AI-assisted HTML5 Canvas game creation.
// Produces a detailed, self-contained prompt that can be pasted into Claude
// (or any LLM) to generate a child-friendly game matching the platform specs.
// ---------------------------------------------------------------------------

export interface GameTemplateConfig {
  gameType?: 'platformer' | 'puzzle' | 'memory' | 'runner' | 'shooter' | 'drawing';
  theme?: 'space' | 'ocean' | 'forest' | 'city' | 'fantasy';
  difficulty: 'easy' | 'medium' | 'hard';
  features: string[]; // subset of: 'score', 'timer', 'levels', 'powerups', 'sounds'
  title: string;
  description: string;
  developerName: string;
}

// ---------------------------------------------------------------------------
// Game type descriptions & mechanics
// ---------------------------------------------------------------------------

type KnownGameType = NonNullable<GameTemplateConfig['gameType']>;
type KnownTheme = NonNullable<GameTemplateConfig['theme']>;

const GAME_TYPE_INFO: Record<
  KnownGameType,
  { label: string; description: string; mechanics: string }
> = {
  platformer: {
    label: 'Platformer',
    description: 'A side-scrolling platform game with jumping and collecting.',
    mechanics: `
- Side-scrolling camera that follows the player character horizontally.
- Gravity and jump physics: the character falls when not on a platform and can jump with a tap/button press.
- Procedurally placed or hand-designed platforms the character can land on.
- Collectible items (coins, stars, gems) that increase the score.
- Obstacles or gaps the player must avoid -- falling off-screen costs a life.
- Moving platforms and simple enemies that patrol back and forth.
- The character should be a cute, colorful sprite drawn on the canvas (no external images).`,
  },
  puzzle: {
    label: 'Puzzle',
    description: 'A grid-based puzzle game with matching or solving mechanics.',
    mechanics: `
- A grid of tiles (e.g. 4x4, 5x5, or 6x6 depending on difficulty).
- Tap a tile to select it; tap another to swap (or match-3 style).
- Matching 3+ tiles of the same color/shape clears them and awards points.
- Cleared tiles are replaced by new ones falling from above.
- Combo / chain reactions when new tiles create additional matches.
- A move counter or timer adds pressure.
- Tiles should be drawn as colorful shapes (circles, squares, stars) on the canvas.`,
  },
  memory: {
    label: 'Memory',
    description: 'A classic card-flipping memory matching game.',
    mechanics: `
- A grid of face-down cards (e.g. 3x4 for easy, 4x4 for medium, 4x6 for hard).
- Tap a card to flip it and reveal an emoji or shape.
- Tap a second card: if it matches the first, both stay revealed and the player scores.
- If they don't match, both flip back after a short delay (~1 second).
- Track the number of moves/attempts.
- Game ends when all pairs are matched.
- Cards drawn as rounded rectangles with a "?" on the back and an emoji/icon on the front.`,
  },
  runner: {
    label: 'Runner',
    description: 'An endless auto-scrolling runner game.',
    mechanics: `
- The world scrolls automatically from right to left at increasing speed.
- The player character runs in place on the left side; tap to jump, swipe down (or second tap while airborne) to duck.
- Obstacles spawn at random intervals: hurdles to jump over, low barriers to duck under.
- Collectible items float in the air or on the ground for bonus points.
- The score increases continuously based on distance traveled.
- Speed gradually increases every 15-20 seconds.
- Collision with an obstacle costs a life or ends the game.`,
  },
  shooter: {
    label: 'Shooter',
    description: 'A simple tap-to-shoot game with enemies and power-ups.',
    mechanics: `
- The player character sits at the bottom-center of the screen.
- Tap/click anywhere on the canvas to shoot a projectile toward that position.
- Enemies (drawn as simple shapes or cute creatures) spawn from the top and sides, drifting downward.
- Hitting an enemy with a projectile destroys it and awards points.
- Enemies that reach the bottom of the screen cost the player a life.
- Occasional power-up drops: rapid fire, shield, score multiplier.
- Boss enemies appear every few waves with more health.`,
  },
  drawing: {
    label: 'Drawing',
    description: 'A free-draw creative canvas with colors and stamps.',
    mechanics: `
- Full-screen drawing canvas the player can draw on with touch or mouse.
- A color palette bar (8-10 bright colors) along one edge, plus an eraser.
- Brush size selector (small, medium, large).
- A set of stamp tools: 5-6 fun emoji stamps the player can place on the canvas.
- An "undo" button and a "clear all" button.
- A "save" button that converts the canvas to an image and offers download.
- No win/lose state -- this is purely creative. XP is awarded for time spent.`,
  },
};

// ---------------------------------------------------------------------------
// Theme descriptions & visual guidance
// ---------------------------------------------------------------------------

const THEME_INFO: Record<
  KnownTheme,
  { label: string; description: string; visuals: string }
> = {
  space: {
    label: 'Space',
    description: 'An outer-space adventure among stars and planets.',
    visuals: `
- Dark navy/black background with twinkling star particles.
- Planets, moons, asteroids as background elements.
- Neon glowing colors for UI elements (cyan, magenta, lime).
- The player character could be a small rocket or astronaut.
- Collectibles: glowing orbs, crystals, satellite parts.
- Particle trails behind moving objects.`,
  },
  ocean: {
    label: 'Ocean',
    description: 'An underwater ocean world full of sea life.',
    visuals: `
- Gradient background from light blue (top) to deep blue (bottom).
- Animated bubble particles floating upward.
- Coral, seaweed, and rocks along the bottom.
- Fish, jellyfish, seahorses as characters or obstacles.
- Collectibles: pearls, shells, treasure chests.
- Wavy, fluid animations for a calming underwater feel.`,
  },
  forest: {
    label: 'Forest',
    description: 'A lush green forest filled with woodland creatures.',
    visuals: `
- Green gradient background with layered tree silhouettes (parallax).
- Ground with grass, flowers, mushrooms.
- Woodland animals: rabbits, birds, foxes, squirrels.
- Collectibles: acorns, berries, leaves, flowers.
- Sunbeams or firefly particles for atmosphere.
- Earthy, warm color palette: greens, browns, golden yellows.`,
  },
  city: {
    label: 'City',
    description: 'A colorful cartoon cityscape with buildings and vehicles.',
    visuals: `
- Skyline background with colorful buildings of different heights.
- Roads, crosswalks, traffic lights.
- Cars, buses, bicycles as obstacles or decorations.
- Collectibles: coins, keys, pizza slices, balloons.
- Day or sunset sky gradient in warm tones.
- Bold, primary colors for a fun urban feel.`,
  },
  fantasy: {
    label: 'Fantasy',
    description: 'A magical fantasy kingdom with castles and dragons.',
    visuals: `
- Purple/pink gradient sky with floating islands or a castle backdrop.
- Castles, towers, bridges as platforms or background.
- Friendly dragons, unicorns, fairies as characters.
- Collectibles: gems, magic potions, crowns, wands.
- Sparkle/glitter particle effects.
- Vibrant, saturated colors: purple, gold, teal, magenta.`,
  },
};

// ---------------------------------------------------------------------------
// Difficulty parameters
// ---------------------------------------------------------------------------

const DIFFICULTY_PARAMS: Record<
  GameTemplateConfig['difficulty'],
  { lives: number; speed: string; complexity: string; ageRange: string; controls: string }
> = {
  easy: {
    lives: 5,
    speed: 'Slow and gentle. Objects move at roughly 60-80 pixels per second.',
    complexity: 'Very simple. Minimal obstacles, large targets, generous timing. Grids should be small (3x4 or 4x4).',
    ageRange: '3-5',
    controls: 'Simple one-tap controls only. Large, forgiving hit areas (min 64px). No multi-button combos.',
  },
  medium: {
    lives: 3,
    speed: 'Moderate pace. Objects move at roughly 120-160 pixels per second.',
    complexity: 'Some challenge. More obstacles appear, moderate target sizes, grids can be 4x4 or 5x5.',
    ageRange: '6-8',
    controls: 'Tap plus optional swipe. Two action types at most. Touch targets at least 48px.',
  },
  hard: {
    lives: 2,
    speed: 'Fast-paced. Objects move at roughly 200-260 pixels per second.',
    complexity: 'Challenging. Many obstacles, smaller targets, complex patterns. Grids can be 5x6 or 6x6.',
    ageRange: '9+',
    controls: 'Multiple control types (tap, swipe, hold). Smaller but still accessible touch targets (min 44px).',
  },
};

// ---------------------------------------------------------------------------
// Feature descriptions
// ---------------------------------------------------------------------------

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  score: `
- Display a score counter in the top-right corner of the canvas.
- Use a large, bold, kid-friendly font rendered on the canvas.
- Increment the score for collecting items, defeating enemies, or clearing tiles.
- Show a brief "+N" floating text animation when points are earned.`,
  timer: `
- Display a countdown or count-up timer in the top-left corner.
- For countdown: start at a value appropriate to the difficulty and game type.
- For count-up: show elapsed time as mm:ss.
- Timer text should be large and readable.`,
  levels: `
- Implement at least 3 progressively harder levels.
- Show a "Level N" title card between levels with a brief 2-second pause.
- Each level increases speed, adds obstacles, or introduces new mechanics.
- Display the current level number on screen during gameplay.`,
  powerups: `
- Spawn a random power-up every 20-30 seconds of gameplay.
- Power-up types: speed boost, shield/invincibility (3 seconds), score multiplier (2x for 10 seconds), extra life.
- Power-ups should visually pulse/glow so they are easy to spot.
- Show an icon in the corner when a power-up is active with a shrinking duration bar.`,
  sounds: `
- Use the Web Audio API (AudioContext + OscillatorNode) to generate simple sound effects.
- Sounds needed: collect item (short rising tone), jump (quick blip), hit/damage (low buzz), game over (descending tone), level complete (ascending arpeggio).
- Keep sounds short (< 300ms) and pleasant.
- Add a mute/unmute toggle button (speaker icon) in the corner.`,
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function getGameTypeDescription(type: string): string {
  const info = GAME_TYPE_INFO[type as KnownGameType];
  return info ? info.description : 'Unknown game type.';
}

export function getThemeDescription(theme: string): string {
  const info = THEME_INFO[theme as KnownTheme];
  return info ? info.description : 'Unknown theme.';
}

export function getDifficultyParams(
  difficulty: string,
): { lives: number; speed: string; complexity: string } {
  const params = DIFFICULTY_PARAMS[difficulty as GameTemplateConfig['difficulty']];
  return params
    ? { lives: params.lives, speed: params.speed, complexity: params.complexity }
    : { lives: 3, speed: 'Moderate', complexity: 'Standard' };
}

// ---------------------------------------------------------------------------
// Main prompt generator
// ---------------------------------------------------------------------------

export function generateGamePrompt(config: GameTemplateConfig): string {
  const gameInfo = config.gameType ? GAME_TYPE_INFO[config.gameType] : null;
  const themeInfo = config.theme ? THEME_INFO[config.theme] : null;
  const diffParams = DIFFICULTY_PARAMS[config.difficulty];

  const featureSections = config.features
    .filter((f) => FEATURE_DESCRIPTIONS[f])
    .map((f) => FEATURE_DESCRIPTIONS[f])
    .join('\n');

  // Build game type section
  const gameTypeSection = gameInfo
    ? `
================================================================================
1. GAME TYPE: ${gameInfo.label}
================================================================================

${gameInfo.description}

Game-Specific Mechanics:
${gameInfo.mechanics}`
    : `
================================================================================
1. GAME DESIGN (from developer's description)
================================================================================

The developer has described their game vision above. Use their description as
the PRIMARY guide for game mechanics, controls, and gameplay loop. Design
appropriate mechanics that bring their vision to life. If the description is
vague, choose mechanics that are fun, intuitive, and age-appropriate.

General guidelines:
- Determine the best control scheme (tap, swipe, joystick, etc.) based on the game concept.
- Design a clear win/lose condition or gameplay loop.
- Include a scoring system that rewards skillful play.
- Add variety through procedural generation, multiple enemy types, or escalating challenge.
- The character/player avatar should be a cute, colorful sprite drawn on the canvas (no external images).`;

  // Build theme section
  const themeSection = themeInfo
    ? `
================================================================================
2. THEME & SETTING: ${themeInfo.label}
================================================================================

${themeInfo.description}

Visual Style Guidelines:
${themeInfo.visuals}`
    : `
================================================================================
2. THEME & VISUAL STYLE (from developer's description)
================================================================================

Use the developer's game description to determine the visual theme and setting.
Design a cohesive, visually appealing world that matches their vision.

General visual guidelines:
- Use bright, saturated, kid-friendly colors throughout.
- Create a layered background with at least 2-3 depth layers for visual richness.
- Add ambient particles or effects (sparkles, bubbles, leaves, stars) for atmosphere.
- Characters and objects should be drawn as cute, simple shapes using Canvas 2D API.
- Collectibles should glow or pulse so they are easy to spot.
- Use a consistent color palette that ties the whole game together.`;

  const isDrawing = config.gameType === 'drawing' ||
    config.description.toLowerCase().includes('drawing');

  const prompt = `
================================================================================
GAME GENERATION PROMPT
================================================================================

Create a complete, self-contained HTML5 Canvas game in a SINGLE HTML file.
The game should be fun, polished, and fully playable with no external dependencies.

Game Title: "${config.title}"
Developer: ${config.developerName}

================================================================================
DEVELOPER'S GAME VISION
================================================================================

"${config.description}"

THIS IS THE MOST IMPORTANT SECTION. The developer (a kid!) has described
exactly what they want their game to be. Read this carefully and make sure
the final game matches their vision as closely as possible. Every detail
they mentioned should be reflected in the game.
${gameTypeSection}
${themeSection}

================================================================================
3. DIFFICULTY: ${diffParams.ageRange} age range
================================================================================

- Lives: ${diffParams.lives}
- Speed: ${diffParams.speed}
- Complexity: ${diffParams.complexity}
- Controls: ${diffParams.controls}

================================================================================
4. REQUESTED FEATURES
================================================================================
${featureSections || '\n(No additional features selected -- keep it simple.)'}

================================================================================
5. TECHNICAL REQUIREMENTS (MANDATORY)
================================================================================

Structure:
- Single HTML file with all CSS in a <style> tag and all JS in a <script> tag.
- HTML5 <canvas> element for ALL rendering (do not use DOM elements for game graphics).
- No external libraries, CDNs, images, or fonts. Everything self-contained.

Canvas & Rendering:
- Create one full-viewport <canvas> element.
- Use requestAnimationFrame for the game loop with delta-time calculations.
- Handle window resize: re-calculate canvas dimensions on resize events.
- Draw ALL game graphics using Canvas 2D API (fillRect, arc, beginPath, etc.).
- Use bright, high-contrast colors that look good on both light and dark screens.

Game States -- implement these three screens:
1. START SCREEN: Game title, "Tap to Start" prompt, brief instructions, developer credit.
2. PLAYING: The active game with HUD (score, lives, etc.).
3. GAME OVER: Final score, "Tap to Play Again" prompt. ${!isDrawing ? '' : '(For drawing mode: no game-over state. Show a "New Canvas" button instead.)'}

Performance:
- Target 60 FPS. Keep draw calls efficient.
- Object-pool enemies/projectiles instead of creating/destroying rapidly.
- Limit particle counts to ~50 max to avoid frame drops on mobile.

================================================================================
6. MOBILE-FIRST CONTROLS (CRITICAL -- THIS IS THE #1 PRIORITY)
================================================================================

The primary audience plays on phones and tablets. Mobile controls MUST feel
smooth, responsive, and intuitive -- not like an afterthought. A game with
bad mobile controls is a broken game. Get this right above all else.

Viewport:
- Include: <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
- Canvas must fill the entire viewport (100vw x 100vh) with no scrollbars.
- Set body margin/padding to 0, overflow hidden.

Touch Controls (MUST BE EXCELLENT):
- Register touchstart, touchmove, touchend event listeners on the canvas.
- Prevent default on touch events to stop page scrolling/zooming during gameplay.
- Controls must have ZERO perceptible lag -- respond instantly to touch input.
- For movement: implement a virtual joystick (translucent circle in bottom-left corner, ~120px diameter) that follows the thumb naturally, OR tap-to-move/swipe depending on game type.
- For actions: large, clearly visible on-screen buttons (minimum 64px touch targets, ideally 80px) placed where thumbs naturally rest.
- Buttons must have visual feedback (scale/color change) when pressed.
- Multi-touch: support simultaneous movement + action (e.g. joystick + fire button at the same time).
- AVOID tiny UI elements, close-together buttons, or controls that require precision tapping.
- Test that controls work well for small hands (ages 3+) -- bigger targets, simpler gestures.
- Also support mouse events (mousedown, mousemove, mouseup) for desktop play.
- Support keyboard input where appropriate (arrow keys, spacebar).

Orientation:
- Design for portrait orientation first, but adapt gracefully to landscape.
- If the game strongly benefits from landscape, show a brief "Rotate your device" message in portrait.
- Controls must reposition correctly when orientation changes.

================================================================================
7. PLATFORM INTEGRATION (MANDATORY)
================================================================================

This game runs inside an iframe on the "Yoel The G" platform.
The platform uses a Blue/Red theme system with dark mode. The game MUST
integrate with the parent theme by reading CSS variables from the parent.

THEME INTEGRATION -- include this code at the top of your <script>:

  // Read theme from parent or default to blue-light
  let platformTheme = 'blue-light';
  try {
    platformTheme = window.parent.document.documentElement.getAttribute('data-theme') || 'blue-light';
  } catch(e) {}

  // Theme color palettes the game can use for UI elements (menus, buttons, HUD)
  const THEMES = {
    'blue-light':  { primary: '#3b82f6', dark: '#1e40af', bg: '#f0f7ff', surface: '#ffffff', text: '#1e293b', accent: '#93c5fd', glow: 'rgba(59,130,246,0.4)' },
    'blue-dark':   { primary: '#60a5fa', dark: '#2563eb', bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', accent: '#1e3a5f', glow: 'rgba(96,165,250,0.3)' },
    'red-light':   { primary: '#ef4444', dark: '#991b1b', bg: '#fff5f5', surface: '#ffffff', text: '#1e293b', accent: '#fca5a5', glow: 'rgba(239,68,68,0.4)' },
    'red-dark':    { primary: '#f87171', dark: '#dc2626', bg: '#1a0a0a', surface: '#2d1515', text: '#fecaca', accent: '#4a1515', glow: 'rgba(248,113,113,0.3)' },
  };
  const theme = THEMES[platformTheme] || THEMES['blue-light'];

  // Use theme.primary, theme.bg, theme.text, etc. for:
  // - Start screen / Game Over screen backgrounds and text
  // - Button colors and hover states
  // - HUD text colors
  // - Score display accent color
  // The actual GAMEPLAY visuals should still use the chosen game theme colors
  // (space, ocean, etc.), but UI overlays should match the platform theme.

XP Reporting -- include this code to report XP to the parent window:

  // Report XP every 60 seconds of active gameplay
  let xpTimer = 0;
  function reportXP() {
    try {
      window.parent.postMessage({ type: 'xp', amount: 10 }, '*');
    } catch(e) {}
  }
  // Call reportXP() every 60 seconds from inside the game loop or via setInterval.

  // On game over, report the final score:
  function onGameOver(finalScore) {
    try {
      window.parent.postMessage({ type: 'gameOver', score: finalScore }, '*');
    } catch(e) {}
  }

================================================================================
8. AGE-APPROPRIATE CONTENT (MANDATORY)
================================================================================

This game is for children ages ${diffParams.ageRange}. Strict content rules:

- Keep ALL visuals colorful, cute, and friendly. No dark/scary imagery.
- No violence. Enemies "pop" or "disappear" with a fun effect -- no blood, no weapons.
- No complex text. Use short words and simple instructions a young child can understand.
- No ads, external links, data collection, or social features.
- Characters should be cheerful and non-threatening.
${config.difficulty === 'easy' ? '- EASY MODE: Use only single-tap controls. Make hit/collision areas very large and forgiving. Add visual guides (arrows, highlights) to show the player what to do.' : ''}

================================================================================
9. POLISH & JUICE
================================================================================

Make the game feel alive and fun:
- Add screen-shake on impacts (subtle, 2-3 pixel offset for 100ms).
- Particle effects for: collecting items, explosions/pops, level-ups.
- Smooth easing on menus and transitions (ease-in-out).
- Score numbers should "pop" briefly when they change (scale up then back).
- Animate the start screen title (gentle floating or pulsing).
- Use at least 2-3 background layers with parallax scrolling where applicable.

================================================================================
10. COMPLETE CODE REQUIREMENTS
================================================================================

The final output must be:
- A single, complete HTML file that works when opened directly in a browser.
- Fully functional with no "TODO" comments or placeholder code.
- Well-structured with clear sections: HTML, CSS (in <style>), JS (in <script>).
- Include brief code comments explaining key game logic sections.
- The game must be PLAYABLE and FUN from the moment the file is opened.

================================================================================
END OF PROMPT
================================================================================
`.trim();

  return prompt;
}
