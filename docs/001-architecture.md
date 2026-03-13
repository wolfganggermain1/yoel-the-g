# Platform Architecture

## Overview

**Yoel The G** is a family gaming platform where siblings Ezekiel and Areli publish HTML5 Canvas games. Players visit the site, pick a game, earn XP while playing, and level up. The platform is designed for kids ages 3 and up, with a colorful, friendly design and support for mobile devices.

The platform runs as a self-hosted Next.js application with a lightweight SQLite database. Games are self-contained HTML files that run inside iframes, so they can be created independently and dropped into the platform without modifying any application code.

---

## Tech Stack

| Technology       | Purpose                                    |
| ---------------- | ------------------------------------------ |
| **Next.js 14**   | Full-stack React framework (App Router)    |
| **Tailwind CSS** | Utility-first CSS styling                  |
| **SQLite**       | Lightweight database via `better-sqlite3`  |
| **next-pwa**     | Progressive Web App support (offline play) |
| **Docker**       | Container-based deployment                 |
| **Fredoka**      | Primary font (Google Fonts)                |

---

## Project Structure

```
yoel-the-g/
  app/                        # Next.js App Router pages and API routes
    layout.tsx                 # Root layout (font, theme, navbar, particles)
    page.tsx                   # Home page (game grid)
    globals.css                # Global styles and CSS variables
    play/
      [slug]/
        page.tsx               # Game play page (loads game in iframe)
    admin/
      layout.tsx               # Admin layout (wraps pages with AdminGuard)
      AdminNav.tsx             # Admin sidebar/top navigation
      page.tsx                 # Admin dashboard
      games/
        page.tsx               # Manage games (upload, publish, delete)
      developers/
        page.tsx               # Manage developers (add, approve, remove)
      plugin/
        page.tsx               # Game Plugin Wizard (AI prompt generator)
    api/
      games/
        route.ts               # GET published games, POST increment play count
      xp/
        route.ts               # GET player data, POST record XP
      admin/
        login/
          route.ts             # Admin authentication (POST login, DELETE logout)
        games/
          route.ts             # Admin game CRUD operations
        developers/
          route.ts             # Admin developer CRUD operations
  components/                  # Reusable React components
    Navbar.tsx                 # Top navigation bar
    GameCard.tsx               # Game card for the home grid
    GamePlayer.tsx             # Full-screen game player with XP tracking
    AdminGuard.tsx             # Admin login gate component
    ThemeParticles.tsx         # Animated background particles
    ThemeSwitcher.tsx          # Theme toggle button
    PlayerProfile.tsx          # Player stats and level display
  lib/                         # Server-side utilities
    db.ts                      # SQLite database setup and query helpers
    xp.ts                      # XP calculation and nickname generation
  public/
    manifest.json              # PWA manifest
    icons/                     # App icons (192px, 512px)
    games/                     # Game HTML files
      [slug]/
        index.html             # Each game is a self-contained HTML file
  data/                        # SQLite database storage (Docker volume)
    yoel-the-g.db              # The database file
  docs/                        # Project documentation
  Dockerfile                   # Docker build instructions
  docker-compose.yml           # Docker Compose configuration
  .env.local                   # Environment variables (ADMIN_PASSWORD)
```

---

## Database

The platform uses SQLite with 4 tables. The database file lives at `data/yoel-the-g.db` and is created automatically on first run.

### Tables

#### `developers`

Stores game creators (Ezekiel, Areli, and any Yoel-approved developers).

| Column         | Type    | Description                              |
| -------------- | ------- | ---------------------------------------- |
| `id`           | INTEGER | Primary key, auto-increment              |
| `name`         | TEXT    | Developer display name                   |
| `avatar_emoji` | TEXT    | Emoji avatar (e.g. "🦊")                |
| `approved`     | INTEGER | 1 = approved, 0 = pending                |
| `created_at`   | TEXT    | Timestamp when the developer was added   |

#### `games`

Stores metadata about each game.

| Column            | Type    | Description                              |
| ----------------- | ------- | ---------------------------------------- |
| `id`              | INTEGER | Primary key, auto-increment              |
| `title`           | TEXT    | Game title                               |
| `slug`            | TEXT    | URL-safe identifier (unique)             |
| `description`     | TEXT    | Short description of the game            |
| `developer_id`    | INTEGER | Foreign key to `developers.id`           |
| `thumbnail_emoji` | TEXT    | Emoji used as thumbnail                  |
| `game_path`       | TEXT    | Path to the HTML file in `/public/games` |
| `category`        | TEXT    | Arcade, Puzzle, Adventure, or Creative   |
| `age_min`         | INTEGER | Minimum recommended age (default: 3)     |
| `published`       | INTEGER | 1 = visible, 0 = hidden                  |
| `play_count`      | INTEGER | Total times played                       |
| `created_at`      | TEXT    | Timestamp when the game was added        |

#### `players`

Stores player profiles. Players are identified by a UUID stored in their browser's localStorage.

| Column     | Type    | Description                              |
| ---------- | ------- | ---------------------------------------- |
| `id`       | TEXT    | UUID (generated on first visit)          |
| `nickname` | TEXT    | Fun auto-generated nickname              |
| `xp`       | INTEGER | Total XP earned across all games         |
| `level`    | INTEGER | Current level (calculated from XP)       |

#### `play_sessions`

Records each game session for history and stats.

| Column      | Type    | Description                              |
| ----------- | ------- | ---------------------------------------- |
| `id`        | INTEGER | Primary key, auto-increment              |
| `player_id` | TEXT    | Foreign key to `players.id`              |
| `game_id`   | INTEGER | Foreign key to `games.id`                |
| `duration`  | INTEGER | Session length in seconds                |
| `xp_earned` | INTEGER | XP earned during the session             |
| `played_at` | TEXT    | Timestamp when the session occurred      |

---

## How Games Work

Games are **self-contained HTML files** that use HTML5 Canvas for rendering. Each game lives in its own folder under `public/games/[slug]/index.html`.

When a player clicks a game on the home page:

1. The browser navigates to `/play/[slug]`.
2. The `PlayPage` server component looks up the game by slug in the database.
3. The `GamePlayer` client component renders a **full-screen iframe** pointing to the game's HTML file.
4. The `GamePlayer` starts a 60-second XP timer. Every minute the player is active, they earn 10 XP.
5. Games can also report XP via `postMessage` (see the Game Plugin Guide).
6. When the player leaves (navigates away or closes the tab), accumulated XP is flushed to the server using `navigator.sendBeacon` for reliability.

The iframe runs with the sandbox attribute `allow-scripts allow-same-origin allow-popups allow-forms`, so games can execute JavaScript but are isolated from the parent page.

---

## Theme System

The platform supports 4 visual themes, controlled by a `data-theme` attribute on the `<html>` element:

| Theme          | `data-theme` value | Description                |
| -------------- | ------------------- | -------------------------- |
| Blue Light     | `blue-light`        | Default, bright blue tones |
| Blue Dark      | `blue-dark`         | Dark mode with blue accent |
| Red Light      | `red-light`         | Warm light with red accent |
| Red Dark       | `red-dark`          | Dark mode with red accent  |

Themes are implemented using **CSS custom properties** (variables) defined in `globals.css`. Each theme sets values for `--bg`, `--surface`, `--text`, `--primary`, `--border`, `--card-shadow`, and more.

The active theme is saved to `localStorage` and restored before first paint using an inline script in the root layout, which prevents a flash of the wrong theme on page load.

Players can switch themes using the `ThemeSwitcher` component in the navbar.

---

## XP System

Players earn XP by playing games. The XP system works like this:

- **XP Rate**: 10 XP per minute of active play time.
- **Active Play**: XP only accumulates when the browser tab is visible (pauses when hidden).
- **Game Reporting**: Games can also report XP via `postMessage` for bonus points.

### Level Formula

The level is calculated from total XP:

```
level = floor(sqrt(xp / 100)) + 1
```

This means:
- Level 1: 0 XP
- Level 2: 100 XP (10 minutes of play)
- Level 3: 400 XP (40 minutes of play)
- Level 4: 900 XP (90 minutes of play)
- Level 5: 1,600 XP

Each level takes progressively longer to reach, giving players a sense of ongoing progress.

### Nicknames

When a player first visits the platform, they get an auto-generated fun nickname (e.g., "Cosmic Penguin" or "Turbo Fox"). Players can change their nickname from their profile.

---

## Authentication

The platform uses a **single admin password** for administration. There are no user accounts -- players are tracked by a UUID stored in their browser.

### How Admin Auth Works

1. The admin password is set via the `ADMIN_PASSWORD` environment variable.
2. When someone visits `/admin`, the `AdminGuard` component shows a login form.
3. The password is sent to `POST /api/admin/login` for verification.
4. On success, an HTTP-only cookie is set to maintain the session.
5. `GET /api/admin/login` checks if the cookie is valid.
6. `DELETE /api/admin/login` logs out by clearing the cookie.

This keeps things simple -- Yoel is the only admin, and the password protects all admin functions.
