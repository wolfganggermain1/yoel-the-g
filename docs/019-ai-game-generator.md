# 019 — AI Game Generator

The game wizards (home page "Describe your dream game" and `/admin/plugin`) used to stop at a
prompt the developer had to paste into Claude themselves. They now also have a
**"Make my game!"** button that generates the game on the server and saves it as a draft.

## Flow

1. A logged-in developer (`family_dev` or above) finishes the wizard and clicks **Make my game!**.
2. `POST /api/generate` sends the wizard prompt (`lib/game-template.ts`) to Claude with a
   system prompt that restates the platform scanner rules (`lib/game-scan.ts`).
3. The returned HTML is scanned. If it fails, the model gets one automatic fix round.
4. The game is written to `data/generated/<slug>/index.html` and registered in `games`
   as **unpublished**, credited to the developer linked to the account (`users.developer_id`).
5. The developer can play the draft at `/play/<slug>` right away. An admin publishes it from
   **Admin → Games** like any other game.

The response is a newline-delimited JSON stream (`status`, `progress`, `done`, `error`) so the
page can show progress during the 1–3 minute generation and proxies don't time out.

## Storage

`public/games/` is baked into the Docker image and wiped on every deploy, so generated games
live under `data/` (the persistent volume) and are served by `GET /api/generated/<slug>`.
`games.game_path` for a generated game is `/api/generated/<slug>`.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes (for generation only) | — | Claude API key. Without it the button returns "not set up yet"; the rest of the site is unaffected. |
| `GENERATOR_MODEL` | no | `claude-opus-5-5` | `claude-sonnet-5-5` is about half the cost per game. |
| `GENERATOR_DAILY_LIMIT` | no | `5` | Generations per account per rolling 24 h, failed attempts included. |

Requests opt into Anthropic's server-side refusal fallback (`fallbacks: "default"`), so a
safety-classifier decline is retried on a fallback model inside the same call.

## Cost

Every attempt is logged in the `generations` table (`model`, tokens, `cost_cents`, `status`,
`error`, `duration_ms`). Typical cost per game: $0.50–0.90 on Opus 5.5, $0.25–0.45 on
Sonnet 5.5; roughly double when the fix round runs. The estimate is shown to the developer
after a successful run.

## Admin roles

With this change the `admin` role (Yoël) can also publish/unpublish games and manage users.
Only a `super_admin` can create, change, reset or delete `super_admin` accounts or grant that role.

## Local testing

`ANTHROPIC_API_KEY=... npm run dev`, log in at `/admin` as a `family_dev` whose user row has a
`developer_id`, open the home page wizard and click **Make my game!**.
