// ============================================
// XP System - Level Calculation & Nickname Generation
// ============================================

/**
 * Calculate level from total XP.
 * Formula: level = floor(sqrt(totalXP / 100)) + 1
 * Level 1 starts at 0 XP, Level 2 at 100 XP, Level 3 at 400 XP, etc.
 */
export function calculateLevel(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * XP needed to reach the next level.
 * Formula: nextLevelXP = level^2 * 100
 * e.g. To reach level 2 you need 100 XP, level 3 needs 400 XP total, etc.
 */
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * currentLevel * 100;
}

/**
 * XP progress within current level as a 0-1 ratio.
 * Returns how far the player is between their current level threshold
 * and the next level threshold.
 */
export function xpProgress(xp: number): number {
  if (xp < 0) return 0;
  const level = calculateLevel(xp);
  const currentLevelXP = (level - 1) * (level - 1) * 100; // XP needed for current level
  const nextLevelXP = level * level * 100; // XP needed for next level
  const range = nextLevelXP - currentLevelXP;
  if (range <= 0) return 0;
  const progress = (xp - currentLevelXP) / range;
  return Math.min(Math.max(progress, 0), 1);
}

// --- Fun Nickname Generator ---

const adjectives = [
  'Blue', 'Red', 'Fire', 'Ice', 'Lightning',
  'Shadow', 'Golden', 'Crystal', 'Storm', 'Cosmic',
  'Blazing', 'Frozen', 'Mystic', 'Thunder', 'Star',
];

const animals = [
  'Lion', 'Dragon', 'Phoenix', 'Wolf', 'Eagle',
  'Tiger', 'Falcon', 'Shark', 'Bear', 'Panther',
  'Hawk', 'Fox', 'Jaguar', 'Cobra', 'Raven',
];

/**
 * Generate a fun random nickname like "BlueLion42"
 * Combines a random adjective + animal + 2-digit number.
 */
export function generateNickname(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${adj}${animal}${num}`;
}

// --- Level Titles ---

/**
 * Get a fun level title based on player level.
 */
export function getLevelTitle(level: number): string {
  if (level >= 11) return 'Legend';
  if (level >= 9) return 'Champion';
  if (level >= 7) return 'Pro';
  if (level >= 5) return 'Gamer';
  if (level >= 3) return 'Player';
  return 'Rookie';
}
