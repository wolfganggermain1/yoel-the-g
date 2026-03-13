import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "yoel-the-g.db");

let db: Database.Database;

// ---------------------------------------------------------------------------
// Database connection & initialization
// ---------------------------------------------------------------------------

export function getDb(): Database.Database {
  if (!db) {
    // Ensure the data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeDb();
  }
  return db;
}

function initializeDb(): void {
  const d = db;

  // ---- Schema ----
  d.exec(`
    CREATE TABLE IF NOT EXISTS developers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      avatar_emoji TEXT DEFAULT '🎮',
      approved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      developer_id INTEGER REFERENCES developers(id),
      thumbnail_emoji TEXT DEFAULT '🎮',
      game_path TEXT NOT NULL,
      category TEXT DEFAULT 'arcade',
      age_min INTEGER DEFAULT 3,
      published INTEGER DEFAULT 0,
      play_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      nickname TEXT DEFAULT 'Player',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS play_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT REFERENCES players(id),
      game_id INTEGER REFERENCES games(id),
      duration_seconds INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      played_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ---- Seed developers (idempotent) ----
  const insertDev = d.prepare(`
    INSERT OR IGNORE INTO developers (name, slug, avatar_emoji, approved)
    VALUES (?, ?, ?, 1)
  `);
  insertDev.run("Yo\u00EBl", "yoel", "\uD83D\uDC51");
  insertDev.run("Ezekiel", "ezekiel", "\u26A1");
  insertDev.run("Areli", "areli", "\uD83E\uDD81");

  // ---- Seed games (idempotent) ----
  // Look up Yoël's developer ID for his games
  const yoelDev = d.prepare("SELECT id FROM developers WHERE slug = 'yoel'").get() as { id: number } | undefined;
  const yoelId = yoelDev?.id ?? 1;

  const insertGame = d.prepare(`
    INSERT OR IGNORE INTO games
      (title, slug, description, developer_id, thumbnail_emoji, game_path, category, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertGame.run(
    "ROBLOX Simon Says",
    "simon-says",
    "Follow the pattern!",
    yoelId,
    "\uD83C\uDFB5",
    "/games/simon-says/index.html",
    "puzzle"
  );
  insertGame.run(
    "MEGA ROBOT Sky Battle",
    "robot-battle",
    "Epic robot battle in the sky!",
    yoelId,
    "\uD83E\uDD16",
    "/games/robot-battle/index.html",
    "arcade"
  );
  insertGame.run(
    "Remember Family",
    "remember-family",
    "Space adventure! Jump on platforms and collect stars!",
    yoelId,
    "\uD83D\uDE80",
    "/games/remember-family/index.html",
    "adventure"
  );
  insertGame.run(
    "Pilot Tollt",
    "pilot-tollt",
    "Fly your jet over the city and pop the baddies with star blasts!",
    yoelId,
    "\u2708\uFE0F",
    "/games/pilot-tollt/index.html",
    "arcade"
  );

  insertGame.run(
    "LOTI IT0",
    "loti-it0",
    "Draw before the timer runs out! Pick colors, stamps and brushes to create city art!",
    yoelId,
    "\uD83C\uDFA8",
    "/games/loti-it0/index.html",
    "creative"
  );

  insertGame.run(
    "Cute Rescue",
    "cute-rescue",
    "Shoot magic at fantasy creatures and capture the Gold Bar to complete each level!",
    yoelId,
    "\u2728",
    "/games/cute-rescue/index.html",
    "arcade"
  );

  // ---- Seed Ezekiel's games ----
  const ezekielDev = d.prepare("SELECT id FROM developers WHERE slug = 'ezekiel'").get() as { id: number } | undefined;
  const ezekielId = ezekielDev?.id ?? 2;

  insertGame.run(
    "Zombie Road Blaster",
    "loto",
    "Blast fun zombies with water balloons, fly your car and use autopilot! (with Yo\u00EBl)",
    ezekielId,
    "\uD83D\uDE97",
    "/games/loto/index.html",
    "arcade"
  );

  // Also list under Yoël's games (same game file, different slug for DB uniqueness)
  insertGame.run(
    "Zombie Road Blaster",
    "loto-yoel",
    "Blast fun zombies with water balloons, fly your car and use autopilot! (with Ezekiel)",
    yoelId,
    "\uD83D\uDE97",
    "/games/loto/index.html",
    "arcade"
  );
}

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface Developer {
  id: number;
  name: string;
  slug: string;
  avatar_emoji: string;
  approved: number;
  created_at: string;
}

export interface Game {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  developer_id: number;
  thumbnail_emoji: string;
  game_path: string;
  category: string;
  age_min: number;
  published: number;
  play_count: number;
  created_at: string;
}

export interface Player {
  id: string;
  nickname: string;
  xp: number;
  level: number;
  created_at: string;
}

export interface PlaySession {
  id: number;
  player_id: string;
  game_id: number;
  duration_seconds: number;
  xp_earned: number;
  played_at: string;
}

export interface Stats {
  totalGames: number;
  totalDevelopers: number;
  totalPlaySessions: number;
}

export interface AddGameData {
  title: string;
  slug: string;
  description?: string;
  developer_id: number;
  thumbnail_emoji?: string;
  game_path: string;
  category?: string;
  age_min?: number;
  published?: number;
}

// ---------------------------------------------------------------------------
// Developer queries
// ---------------------------------------------------------------------------

export function getAllDevelopers(): Developer[] {
  return getDb().prepare("SELECT * FROM developers ORDER BY name").all() as Developer[];
}

export function getApprovedDevelopers(): Developer[] {
  return getDb()
    .prepare("SELECT * FROM developers WHERE approved = 1 ORDER BY name")
    .all() as Developer[];
}

export function addDeveloper(name: string, slug: string, emoji: string): Database.RunResult {
  return getDb()
    .prepare("INSERT INTO developers (name, slug, avatar_emoji) VALUES (?, ?, ?)")
    .run(name, slug, emoji);
}

export function approveDeveloper(id: number): Database.RunResult {
  return getDb()
    .prepare("UPDATE developers SET approved = 1 WHERE id = ?")
    .run(id);
}

export function removeDeveloper(id: number): Database.RunResult {
  return getDb().prepare("DELETE FROM developers WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Game queries
// ---------------------------------------------------------------------------

export function getGamesByDeveloper(developerId: number): Game[] {
  return getDb()
    .prepare("SELECT * FROM games WHERE developer_id = ? ORDER BY title")
    .all(developerId) as Game[];
}

export function getAllPublishedGames(): Game[] {
  return getDb()
    .prepare("SELECT * FROM games WHERE published = 1 ORDER BY title")
    .all() as Game[];
}

export function getGameBySlug(slug: string): Game | undefined {
  return getDb()
    .prepare("SELECT * FROM games WHERE slug = ?")
    .get(slug) as Game | undefined;
}

export function addGame(data: AddGameData): Database.RunResult {
  return getDb()
    .prepare(
      `INSERT INTO games
        (title, slug, description, developer_id, thumbnail_emoji, game_path, category, age_min, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.title,
      data.slug,
      data.description ?? null,
      data.developer_id,
      data.thumbnail_emoji ?? "\uD83C\uDFAE",
      data.game_path,
      data.category ?? "arcade",
      data.age_min ?? 3,
      data.published ?? 0
    );
}

export function toggleGamePublished(id: number): Database.RunResult {
  return getDb()
    .prepare("UPDATE games SET published = CASE WHEN published = 1 THEN 0 ELSE 1 END WHERE id = ?")
    .run(id);
}

export interface UpdateGameData {
  title?: string;
  description?: string;
  category?: string;
  developer_id?: number;
  thumbnail_emoji?: string;
  game_path?: string;
}

export function updateGame(id: number, data: UpdateGameData): Database.RunResult {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.developer_id !== undefined) { fields.push('developer_id = ?'); values.push(data.developer_id); }
  if (data.thumbnail_emoji !== undefined) { fields.push('thumbnail_emoji = ?'); values.push(data.thumbnail_emoji); }
  if (data.game_path !== undefined) { fields.push('game_path = ?'); values.push(data.game_path); }

  if (fields.length === 0) {
    return { changes: 0, lastInsertRowid: 0 } as Database.RunResult;
  }

  values.push(id);
  return getDb()
    .prepare(`UPDATE games SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values);
}

export function getGameById(id: number): Game | undefined {
  return getDb()
    .prepare("SELECT * FROM games WHERE id = ?")
    .get(id) as Game | undefined;
}

export function incrementPlayCount(gameId: number): Database.RunResult {
  return getDb()
    .prepare("UPDATE games SET play_count = play_count + 1 WHERE id = ?")
    .run(gameId);
}

// ---------------------------------------------------------------------------
// Player queries
// ---------------------------------------------------------------------------

export function getPlayer(id: string): Player | undefined {
  return getDb()
    .prepare("SELECT * FROM players WHERE id = ?")
    .get(id) as Player | undefined;
}

export function upsertPlayer(
  id: string,
  nickname: string,
  xp: number,
  level: number
): Database.RunResult {
  return getDb()
    .prepare(
      `INSERT INTO players (id, nickname, xp, level)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET nickname = ?, xp = ?, level = ?`
    )
    .run(id, nickname, xp, level, nickname, xp, level);
}

// ---------------------------------------------------------------------------
// Play session queries
// ---------------------------------------------------------------------------

export function recordPlaySession(
  playerId: string,
  gameId: number,
  duration: number,
  xp: number
): Database.RunResult {
  return getDb()
    .prepare(
      `INSERT INTO play_sessions (player_id, game_id, duration_seconds, xp_earned)
       VALUES (?, ?, ?, ?)`
    )
    .run(playerId, gameId, duration, xp);
}

// ---------------------------------------------------------------------------
// Admin / stats queries
// ---------------------------------------------------------------------------

export function getStats(): Stats {
  const d = getDb();
  const totalGames = (d.prepare("SELECT COUNT(*) as c FROM games").get() as { c: number }).c;
  const totalDevelopers = (d.prepare("SELECT COUNT(*) as c FROM developers").get() as { c: number }).c;
  const totalPlaySessions = (d.prepare("SELECT COUNT(*) as c FROM play_sessions").get() as { c: number }).c;
  return { totalGames, totalDevelopers, totalPlaySessions };
}
