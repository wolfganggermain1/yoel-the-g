// Shared (client + server) definitions for YTG Tube — Areli's video & games hub.

export const TUBE_PATH = "/tube";

export const TUBE_CATEGORIES = [
  { id: "drawing", label: "Drawing" },
  { id: "science", label: "Science" },
  { id: "animals", label: "Animals" },
  { id: "learning", label: "Learning" },
  { id: "cartoons", label: "Cartoons" },
  { id: "music", label: "Music" },
  { id: "movement", label: "Yoga & Dance" },
  { id: "other", label: "Other" },
] as const;

export type TubeCategory = (typeof TUBE_CATEGORIES)[number]["id"];

export function isTubeCategory(value: unknown): value is TubeCategory {
  return TUBE_CATEGORIES.some((c) => c.id === value);
}

export function categoryLabel(id: string): string {
  return TUBE_CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

export interface TubeVideo {
  id: number;
  youtube_id: string;
  title: string;
  channel: string;
  category: TubeCategory;
  duration_seconds: number | null;
  visible: number;
  created_at: string;
}

export interface TubeGame {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_emoji: string;
  game_path: string;
  category: string;
  play_count: number;
  player_count: string;
  controls: string;
  authors: { developer_name: string; developer_emoji: string; role: string }[];
  /** Screenshot thumbnail under /tube/thumbs, when one exists. */
  thumb?: string | null;
}

export type FeedItem = { kind: "video"; video: TubeVideo } | { kind: "game"; game: TubeGame };

export function feedKey(item: FeedItem): string {
  return item.kind === "video" ? `v:${item.video.youtube_id}` : `g:${item.game.slug}`;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract an 11-character YouTube video id from a raw id or any common
 * YouTube URL shape (watch, youtu.be, shorts, embed, live). Returns null
 * when nothing valid is found.
 */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (YT_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else {
      const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      candidate = m ? m[2] : null;
    }
  }

  return candidate && YT_ID.test(candidate) ? candidate : null;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !isFinite(totalSeconds) || totalSeconds < 0) return "";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
