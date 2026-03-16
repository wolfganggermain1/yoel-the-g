# 007 - Game Submission Standard

## Overview

This document describes the complete game submission pipeline on the YoeltheG platform, from initial creation to publication.

---

## Roles and Permissions

| Action | super_admin | admin | family_dev | outside_dev |
|--------|:-----------:|:-----:|:----------:|:-----------:|
| View dashboard | x | x | x | x |
| Upload games (draft) | x | x | x | x |
| Edit game metadata | x | x | x | - |
| Publish / unpublish games | x | - | - | - |
| Delete games | x | x | - | - |
| Manage developers | x | x | - | - |
| Manage users | x | - | - | - |
| Configure fees | x | - | - | - |

### Role Descriptions

- **super_admin** (Yoel): Full platform control. Only role that can publish games.
- **admin** (Mia): Can manage games and developers but cannot publish or manage users.
- **family_dev** (Ezekiel, Areli): Can upload and view games. Cannot publish, delete, or manage others.
- **outside_dev**: Same as family_dev but subject to platform fees (Phase 4).

---

## Submission Pipeline

### Step 1: Create Game Content

Developers create their game as either:
- A single self-contained HTML file (see [006-multi-asset-game-standard.md](006-multi-asset-game-standard.md))
- A ZIP archive with `index.html` and supporting assets

The Game Plugin Wizard (`/admin/plugin`) can generate AI prompts to help create games.

### Step 2: Upload (family_dev+)

Any authenticated user (family_dev or above) can upload a game:

1. Navigate to `/admin/games`
2. Fill in: title, category, developer, thumbnail emoji, description
3. Select the game file (`.html` or `.zip`)
4. Submit the upload form

The game is registered as a **draft** (unpublished). It undergoes automatic validation:
- File type and size checks
- ZIP security scanning (if applicable)
- Slug generation from title

### Step 3: Review

Admins and super_admins can:
- View game details and metadata
- Play-test the game via the "Play Game" link
- Edit metadata (title, description, category, developer, emoji)
- Re-upload the game file if needed

### Step 4: Publish (super_admin only)

Only the super_admin (Yoel) can publish or unpublish games:

1. Navigate to `/admin/games`
2. Click the publish/unpublish toggle button on the game row
3. Published games appear on the public-facing homepage

This ensures all games are reviewed and approved before going live.

---

## Quality Standards

Before publishing, games should meet these criteria:

- [ ] Game loads without JavaScript errors
- [ ] Game is playable on both desktop and mobile
- [ ] Controls work as described
- [ ] No offensive or inappropriate content
- [ ] No external network requests (fetch, XHR)
- [ ] No use of eval() or dynamic code generation
- [ ] No cookie access or local storage abuse
- [ ] Reasonable file size (under limits)

---

## Co-Authorship

Games can have multiple authors tracked via the `game_developers` junction table:

- **lead**: Primary creator of the game
- **co-author**: Contributed to the game

Co-authored games appear in each developer's portfolio. When a game exists in multiple developer folders, it is co-authored (not duplicated).

---

## Fee Structure (Phase 4 - Planned)

Outside developers (non-family) will be subject to:

| Fee Type | Default Amount | Description |
|----------|---------------|-------------|
| Game Generation | $5.00 | Using the AI Game Plugin Wizard |
| Game Publishing | $10.00 | Publishing a game to the platform |

Family members are exempt from all fees. Fee amounts are configurable by the super_admin via the `fee_config` table.

Payment processing will use Cybersource Microform for PCI-compliant card capture.

---

## Database Tables

### `games` table
Stores game metadata: title, slug, description, developer_id, game_path, category, published status, play count.

### `game_developers` junction table
Maps games to developers with roles (lead/co-author). Enables co-authorship tracking.

### `users` table
Stores user accounts with email, password_hash, role, and developer_id link.

### `fee_config` table
Stores fee amounts and activation status for each fee type.
