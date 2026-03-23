import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

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
      player_count TEXT DEFAULT '1 Player',
      controls TEXT DEFAULT 'Mouse / Touch',
      features TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_developers (
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      developer_id INTEGER REFERENCES developers(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'co-author',
      PRIMARY KEY (game_id, developer_id)
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

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'outside_dev'
        CHECK(role IN ('super_admin', 'admin', 'family_dev', 'outside_dev')),
      developer_id INTEGER REFERENCES developers(id),
      is_family INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fee_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fee_type TEXT UNIQUE NOT NULL
        CHECK(fee_type IN ('game_generation', 'game_publishing')),
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ---- Migrations ----
  // Add file_size_bytes column if not present (schema prep for 5MB offline gate)
  const hasFileSizeCol = d.prepare(
    `SELECT COUNT(*) as cnt FROM pragma_table_info('games') WHERE name = 'file_size_bytes'`
  ).get() as { cnt: number };
  if (hasFileSizeCol.cnt === 0) {
    d.exec(`ALTER TABLE games ADD COLUMN file_size_bytes INTEGER`);
  }

  // ---- Seed developers (idempotent) ----
  const insertDev = d.prepare(`
    INSERT OR IGNORE INTO developers (name, slug, avatar_emoji, approved)
    VALUES (?, ?, ?, 1)
  `);
  insertDev.run("Yo\u00EBl", "yoel", "\uD83D\uDC51");
  insertDev.run("Ezekiel", "ezekiel", "\u26A1");
  insertDev.run("Areli", "areli", "\uD83E\uDD81");
  insertDev.run("Chad", "chad", "\uD83D\uDE0E");

  // ---- Look up developer IDs ----
  const yoelDev = d.prepare("SELECT id FROM developers WHERE slug = 'yoel'").get() as { id: number } | undefined;
  const yoelId = yoelDev?.id ?? 1;
  const ezekielDev = d.prepare("SELECT id FROM developers WHERE slug = 'ezekiel'").get() as { id: number } | undefined;
  const ezekielId = ezekielDev?.id ?? 2;
  const areliDev = d.prepare("SELECT id FROM developers WHERE slug = 'areli'").get() as { id: number } | undefined;
  const areliId = areliDev?.id ?? 3;
  const chadDev = d.prepare("SELECT id FROM developers WHERE slug = 'chad'").get() as { id: number } | undefined;
  const chadId = chadDev?.id ?? 4;

  // ---- Seed games (idempotent) ----
  const insertGame = d.prepare(`
    INSERT OR IGNORE INTO games
      (title, slug, description, developer_id, thumbnail_emoji, game_path, category, player_count, controls, features, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertGameDev = d.prepare(`
    INSERT OR IGNORE INTO game_developers (game_id, developer_id, role)
    VALUES (?, ?, ?)
  `);

  // Helper: seed a game and its co-authors
  function seedGame(
    title: string, slug: string, description: string,
    leadDevId: number, emoji: string, gamePath: string, category: string,
    playerCount: string, controls: string, features: string[],
    coAuthors: { devId: number; role: string }[]
  ) {
    insertGame.run(title, slug, description, leadDevId, emoji, gamePath, category, playerCount, controls, JSON.stringify(features));
    const game = d.prepare("SELECT id FROM games WHERE slug = ?").get(slug) as { id: number } | undefined;
    if (game) {
      for (const author of coAuthors) {
        insertGameDev.run(game.id, author.devId, author.role);
      }
    }
  }

  // --- Yoel's solo games ---
  seedGame(
    "Remember Family", "remember-family",
    "Space adventure! Jump on platforms and collect stars!",
    yoelId, "\uD83D\uDE80", "/games/remember-family/index.html", "adventure",
    "1 Player", "Mouse / Touch", ["Score", "Levels"],
    [{ devId: yoelId, role: "lead" }]
  );

  seedGame(
    "Pilot Tollt", "pilot-tollt",
    "Fly your jet over the city and pop the baddies with star blasts!",
    yoelId, "\u2708\uFE0F", "/games/pilot-tollt/index.html", "arcade",
    "1 Player", "Keyboard / Touch", ["Score", "Levels", "Sound"],
    [{ devId: yoelId, role: "lead" }]
  );

  seedGame(
    "LOTI IT0", "loti-it0",
    "Draw before the timer runs out! Pick colors, stamps and brushes to create city art!",
    yoelId, "\uD83C\uDFA8", "/games/loti-it0/index.html", "creative",
    "1 Player", "Mouse / Touch", ["Timer"],
    [{ devId: yoelId, role: "lead" }]
  );

  seedGame(
    "Cute Rescue", "cute-rescue",
    "Shoot magic at fantasy creatures and capture the Gold Bar to complete each level!",
    yoelId, "\u2728", "/games/cute-rescue/index.html", "arcade",
    "1 Player", "Mouse / Touch", ["Score", "Levels", "Powerups"],
    [{ devId: yoelId, role: "lead" }]
  );

  seedGame(
    "Airplane Ocean Adventure", "airplane-ocean",
    "Soar over the ocean in this exciting aerial adventure!",
    yoelId, "\uD83C\uDF0A", "/games/airplane-ocean/index.html", "arcade",
    "1 Player", "Keyboard / Touch", ["Score", "Sound"],
    [{ devId: yoelId, role: "lead" }]
  );

  seedGame(
    "Johnny Trigger Sniper 3D", "johnny-trigger-sniper-3d",
    "Take aim and hit the targets in this action-packed sniper game!",
    chadId, "\uD83C\uDFAF", "/games/johnny-trigger-sniper-3d/index.html", "arcade",
    "1 Player", "Mouse / Touch", ["Score", "Levels"],
    [{ devId: chadId, role: "lead" }]
  );

  // --- Co-authored games (Yoel + Ezekiel) ---
  seedGame(
    "ROBLOX Simon Says", "simon-says",
    "Follow the pattern! A Roblox-themed Simon Says with epic sound effects and difficulty levels!",
    yoelId, "\uD83C\uDFB5", "/games/simon-says/index.html", "puzzle",
    "1 Player", "Mouse / Touch", ["Score", "Levels", "Sound"],
    [{ devId: yoelId, role: "lead" }, { devId: ezekielId, role: "co-author" }]
  );

  seedGame(
    "MEGA ROBOT Sky Battle", "robot-battle",
    "Epic robot battle in the sky! Futuristic neon combat action!",
    yoelId, "\uD83E\uDD16", "/games/robot-battle/index.html", "arcade",
    "1 Player", "Mouse / Touch", ["Score", "Levels", "Powerups"],
    [{ devId: yoelId, role: "lead" }, { devId: ezekielId, role: "co-author" }]
  );

  seedGame(
    "Zombie Road Blaster", "loto",
    "Blast fun zombies with water balloons, fly your car and use autopilot!",
    ezekielId, "\uD83D\uDE97", "/games/loto/index.html", "arcade",
    "1 Player", "Mouse / Touch", ["Score", "Powerups", "Sound"],
    [{ devId: ezekielId, role: "lead" }, { devId: yoelId, role: "co-author" }]
  );

  // --- Ezekiel's solo game ---
  seedGame(
    "Sky Battle", "sky-battle",
    "Epic bird vs airplane sky battle!",
    ezekielId, "\uD83E\uDD85", "/games/sky-battle/index.html", "arcade",
    "1 Player", "Mouse / Touch", ["Score"],
    [{ devId: ezekielId, role: "lead" }]
  );

  // --- Areli's games ---
  seedGame(
    "Lilo & Stitch Chess", "lilo-stitch-chess",
    "Play chess with Lilo & Stitch characters!",
    areliId, "\u265F\uFE0F", "/games/lilo-stitch-chess/index.html", "strategy",
    "2 Players", "Mouse / Touch", ["Score"],
    [{ devId: areliId, role: "lead" }, { devId: yoelId, role: "co-author" }]
  );

  seedGame(
    "Sparkle Shop", "sparkle-shop",
    "Run your own sparkle shop in this fun cashier idle clicker game!",
    areliId, "\u2728", "/games/sparkle-shop/index.html", "creative",
    "1 Player", "Mouse / Touch", ["Score", "Levels"],
    [{ devId: areliId, role: "lead" }]
  );

  seedGame(
    "Drawing Pad", "drawing-pad",
    "Create beautiful art with brushes, glitter, rainbow pens, stamps and more!",
    areliId, "\uD83C\uDFA8", "/games/drawing-pad/index.html", "creative",
    "1 Player", "Mouse / Touch", ["Creative", "Save"],
    [{ devId: areliId, role: "lead" }]
  );

  // ---- Migrate: consolidate Yoel's email to yoeltheg7@gmail.com ----
  const newYoel = d.prepare("SELECT id FROM users WHERE email = 'yoeltheg7@gmail.com'").get();
  if (newYoel) {
    // New email already exists, remove the old one
    d.prepare("DELETE FROM users WHERE email = 'yoel@yoeltheg.com'").run();
  } else {
    // Rename old email to new
    d.prepare("UPDATE users SET email = 'yoeltheg7@gmail.com' WHERE email = 'yoel@yoeltheg.com'").run();
  }

  // ---- Seed family user accounts (idempotent) ----
  const DEFAULT_PASSWORD = "changeme123";
  const defaultHash = bcrypt.hashSync(DEFAULT_PASSWORD, 12);

  const insertUser = d.prepare(`
    INSERT OR IGNORE INTO users
      (email, password_hash, display_name, role, developer_id, is_family, must_change_password)
    VALUES (?, ?, ?, ?, ?, 1, 1)
  `);

  insertUser.run("yoeltheg7@gmail.com", defaultHash, "Yoel", "admin", yoelId);
  insertUser.run("yoeltheg@gmail.com", defaultHash, "Yoel", "admin", yoelId);
  insertUser.run("mia@yoeltheg.com", defaultHash, "Mia", "admin", null);
  insertUser.run("ezekiel@yoeltheg.com", defaultHash, "Ezekiel", "family_dev", ezekielId);
  insertUser.run("areli@yoeltheg.com", defaultHash, "Areli", "family_dev", areliId);
  insertUser.run("wolfganggermain1@gmail.com", defaultHash, "Wolfgang", "super_admin", null);

  // ---- Migrate roles: ensure Wolfgang is the only super_admin ----
  d.prepare(`UPDATE users SET role = 'admin' WHERE email = 'yoeltheg7@gmail.com' AND role = 'super_admin'`).run();
  d.prepare(`UPDATE users SET role = 'admin' WHERE email = 'yoeltheg@gmail.com' AND role = 'super_admin'`).run();

  // ---- Seed outside developer accounts (idempotent) ----
  const insertOutsideUser = d.prepare(`
    INSERT OR IGNORE INTO users
      (email, password_hash, display_name, role, developer_id, is_family, must_change_password)
    VALUES (?, ?, ?, ?, ?, 0, 1)
  `);
  insertOutsideUser.run("chad@yoeltheg.com", defaultHash, "Chad", "outside_dev", chadId);

  // ---- Seed fee configuration (idempotent) ----
  const insertFee = d.prepare(`
    INSERT OR IGNORE INTO fee_config (fee_type, amount_cents, currency, is_active)
    VALUES (?, ?, 'USD', 1)
  `);
  insertFee.run("game_generation", 500);   // $5.00
  insertFee.run("game_publishing", 1000);  // $10.00
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
  player_count: string;
  controls: string;
  features: string | null;
  created_at: string;
}

export interface GameDeveloper {
  game_id: number;
  developer_id: number;
  role: string;
  developer_name: string;
  developer_emoji: string;
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

export type UserRole = "super_admin" | "admin" | "family_dev" | "outside_dev";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  developer_id: number | null;
  is_family: number;
  must_change_password: number;
  created_at: string;
  updated_at: string;
}

export interface FeeConfig {
  id: number;
  fee_type: "game_generation" | "game_publishing";
  amount_cents: number;
  currency: string;
  is_active: number;
  created_at: string;
  updated_at: string;
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
  player_count?: string;
  controls?: string;
  features?: string[];
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
    .prepare(
      `SELECT DISTINCT g.* FROM games g
       LEFT JOIN game_developers gd ON g.id = gd.game_id
       WHERE (g.developer_id = ? OR gd.developer_id = ?)
       AND g.published = 1
       ORDER BY g.title`
    )
    .all(developerId, developerId) as Game[];
}

export function getDevelopersForGame(gameId: number): GameDeveloper[] {
  return getDb()
    .prepare(
      `SELECT gd.game_id, gd.developer_id, gd.role,
              d.name as developer_name, d.avatar_emoji as developer_emoji
       FROM game_developers gd
       JOIN developers d ON gd.developer_id = d.id
       WHERE gd.game_id = ?
       ORDER BY CASE gd.role WHEN 'lead' THEN 0 WHEN 'co-author' THEN 1 ELSE 2 END`
    )
    .all(gameId) as GameDeveloper[];
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
        (title, slug, description, developer_id, thumbnail_emoji, game_path, category, age_min, published, player_count, controls, features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      data.published ?? 0,
      data.player_count ?? "1 Player",
      data.controls ?? "Mouse / Touch",
      data.features ? JSON.stringify(data.features) : null
    );
}

export function addGameDeveloper(gameId: number, developerId: number, role: string = "co-author"): Database.RunResult {
  return getDb()
    .prepare("INSERT OR IGNORE INTO game_developers (game_id, developer_id, role) VALUES (?, ?, ?)")
    .run(gameId, developerId, role);
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

// ---------------------------------------------------------------------------
// User queries
// ---------------------------------------------------------------------------

export function getUserByEmail(email: string): User | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as User | undefined;
}

export function getUserByDeveloperId(developerId: number): User | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE developer_id = ?")
    .get(developerId) as User | undefined;
}

export function getAllUsers(): User[] {
  return getDb()
    .prepare("SELECT * FROM users ORDER BY display_name")
    .all() as User[];
}

export function createUser(
  email: string,
  passwordHash: string,
  displayName: string,
  role: UserRole,
  developerId: number | null,
  isFamily: boolean
): Database.RunResult {
  return getDb()
    .prepare(
      `INSERT INTO users (email, password_hash, display_name, role, developer_id, is_family, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .run(email, passwordHash, displayName, role, developerId, isFamily ? 1 : 0);
}

export function updateUserRole(id: number, role: UserRole): Database.RunResult {
  return getDb()
    .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .run(role, id);
}

export function updateUserPassword(id: number, passwordHash: string): Database.RunResult {
  return getDb()
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?")
    .run(passwordHash, id);
}

export function resetUserPassword(id: number, passwordHash: string): Database.RunResult {
  return getDb()
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ?")
    .run(passwordHash, id);
}

export function deleteUser(id: number): Database.RunResult {
  return getDb()
    .prepare("DELETE FROM users WHERE id = ?")
    .run(id);
}

// ---------------------------------------------------------------------------
// Fee config queries
// ---------------------------------------------------------------------------

export function getFeeConfig(): FeeConfig[] {
  return getDb()
    .prepare("SELECT * FROM fee_config ORDER BY fee_type")
    .all() as FeeConfig[];
}

export function updateFeeConfig(
  feeType: string,
  amountCents: number,
  isActive: boolean
): Database.RunResult {
  return getDb()
    .prepare("UPDATE fee_config SET amount_cents = ?, is_active = ?, updated_at = datetime('now') WHERE fee_type = ?")
    .run(amountCents, isActive ? 1 : 0, feeType);
}
