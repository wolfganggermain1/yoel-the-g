'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon, TubeLogo } from './icons';
import { avatarColor, GameThumb, VideoThumb } from './Thumb';
import TubePlayer from './TubePlayer';
import GameStage from './GameStage';
import {
  TUBE_CATEGORIES,
  TUBE_PATH,
  categoryLabel,
  feedKey,
  formatDuration,
  type FeedItem,
  type TubeGame,
  type TubeVideo,
} from '@/lib/tube';

const PREFS_KEY = 'ytg-tube-prefs';
const LIKES_KEY = 'ytg-tube-likes';
const AD_ROTATE_MS = 10000; // sidebar "sponsored" game changes this often
const GAME_EVERY = 3; // one game card after every N videos in the "All" feed

interface Prefs {
  dark: boolean;
  theater: boolean;
  autoplay: boolean;
}

interface Likes {
  liked: string[];
  subs: string[];
}

function readJson<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode) — preference just won't persist
  }
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function authorsText(game: TubeGame): string {
  return game.authors.map((a) => a.developer_name).join(' & ') || 'YTG';
}

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------------------
// Feed cards
// ---------------------------------------------------------------------------

function FeedCard({ item, onSelect, disabled }: { item: FeedItem; onSelect: (i: FeedItem) => void; disabled?: boolean }) {
  if (item.kind === 'video') {
    const v = item.video;
    return (
      <button className="tube-card" onClick={() => onSelect(item)} title={v.title}>
        <div className="tube-card__thumb">
          <VideoThumb youtubeId={v.youtube_id} />
          {v.duration_seconds ? <span className="tube-badge">{formatDuration(v.duration_seconds)}</span> : null}
        </div>
        <div className="tube-card__meta">
          <h3 className="tube-card__title">{v.title}</h3>
          <div className="tube-card__line">
            <span>{v.channel}</span>
            <Icon name="verified" size={12} style={{ flexShrink: 0 }} />
          </div>
          <div className="tube-card__line">
            <span>{categoryLabel(v.category)} &middot; Parent approved</span>
          </div>
        </div>
      </button>
    );
  }

  const g = item.game;
  return (
    <button
      className={`tube-card${disabled ? ' tube-card--disabled' : ''}`}
      onClick={() => !disabled && onSelect(item)}
      disabled={disabled}
      title={disabled ? `${g.title} needs internet the first time` : g.title}
    >
      <div className="tube-card__thumb">
        <GameThumb game={g} />
        <span className="tube-badge tube-badge--game">
          <Icon name="game" size={14} /> GAME
        </span>
      </div>
      <div className="tube-card__meta">
        <h3 className="tube-card__title">{g.title}</h3>
        <div className="tube-card__line">
          <span>YTG Games</span>
          <Icon name="verified" size={12} style={{ flexShrink: 0 }} />
        </div>
        <div className="tube-card__line">
          <span>{disabled ? 'Needs internet the first time' : `by ${authorsText(g)} · ${plural(g.play_count, 'play')}`}</span>
        </div>
      </div>
    </button>
  );
}

function CompanionAd({ game, tick, onPlay }: { game: TubeGame; tick: number; onPlay: (g: TubeGame) => void }) {
  return (
    <div className="tube-companion">
      <button className="tube-companion__media" onClick={() => onPlay(game)} aria-label={`Play ${game.title}`}>
        <div key={game.slug} style={{ position: 'absolute', inset: 0, animation: 'tube-fade 0.5s ease' }}>
          <GameThumb game={game} big />
        </div>
        <span key={`timer-${tick}`} className="tube-companion__timer" style={{ animationDuration: `${AD_ROTATE_MS}ms` }} />
      </button>
      <div className="tube-companion__body">
        <div className="tube-companion__icon">{game.thumbnail_emoji}</div>
        <div className="tube-companion__text">
          <div className="tube-companion__title">{game.title}</div>
          <div className="tube-companion__desc">{game.description || `A game by ${authorsText(game)}`}</div>
          <div className="tube-companion__sponsor">
            <b>Sponsored</b> &middot; YTG Games &middot; by {authorsText(game)}
          </div>
        </div>
      </div>
      <button className="tube-companion__cta" onClick={() => onPlay(game)}>
        <Icon name="game" size={20} /> Play now
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

export default function TubeApp({ videos, games }: { videos: TubeVideo[]; games: TubeGame[] }) {
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(true);
  const [ytFailed, setYtFailed] = useState(false);

  const [current, setCurrent] = useState<FeedItem | null>(() =>
    videos[0] ? { kind: 'video', video: videos[0] } : null,
  );
  const [stageVideo, setStageVideo] = useState<TubeVideo | null>(videos[0] ?? null);
  const [playToken, setPlayToken] = useState(0);
  const resumeRef = useRef<Record<string, number>>({});
  const [lastVideo, setLastVideo] = useState<TubeVideo | null>(null);
  const [lastGame, setLastGame] = useState<TubeGame | null>(null);

  const [chip, setChip] = useState('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ dark: false, theater: false, autoplay: true });
  const [likes, setLikes] = useState<Likes>({ liked: [], subs: [] });
  const [nativeFs, setNativeFs] = useState(false);
  const [fakeFs, setFakeFs] = useState(false);
  const [cachedGames, setCachedGames] = useState<Set<string> | null>(null);
  const [adOrder, setAdOrder] = useState(games);
  const [adTick, setAdTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  const videosAvailable = online && !ytFailed;
  const fullscreen = nativeFs || fakeFs;

  // ---- Mount: preferences, deep link, online/offline ----
  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    const platformDark = (document.documentElement.getAttribute('data-theme') ?? '').endsWith('-dark');
    setPrefs(readJson<Prefs>(PREFS_KEY, { dark: platformDark, theater: false, autoplay: true }));
    setLikes(readJson<Likes>(LIKES_KEY, { liked: [], subs: [] }));
    setAdOrder(shuffle(games));

    const params = new URLSearchParams(window.location.search);
    const g = games.find((x) => x.slug === params.get('g'));
    const v = videos.find((x) => x.youtube_id === params.get('v'));
    if (g) setCurrent({ kind: 'game', game: g });
    else if (v) {
      setCurrent({ kind: 'video', video: v });
      setStageVideo(v);
    }

    const goOnline = () => {
      setOnline(true);
      setYtFailed(false);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [games, videos]);

  // ---- Offline: only offer games the service worker has cached ----
  useEffect(() => {
    if (online) {
      setCachedGames(null);
      return;
    }
    if (!('caches' in window)) return;
    let cancelled = false;
    Promise.all(
      games.map((g) =>
        caches
          .match(g.game_path)
          .then((r) => (r ? g.slug : null))
          .catch(() => null),
      ),
    ).then((list) => {
      if (!cancelled) setCachedGames(new Set(list.filter((s): s is string => !!s)));
    });
    return () => {
      cancelled = true;
    };
  }, [online, games]);

  const gameAvailable = useCallback(
    (g: TubeGame) => online || !cachedGames || cachedGames.has(g.slug),
    [online, cachedGames],
  );

  // ---- Rotating game ads ----
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setAdTick((t) => t + 1);
    }, AD_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const adPool = adOrder.filter(
    (g) => gameAvailable(g) && !(current?.kind === 'game' && current.game.slug === g.slug),
  );
  const companionAd = adPool.length ? adPool[adTick % adPool.length] : null;
  const overlayAd = adPool.length ? adPool[(adTick + Math.ceil(adPool.length / 2)) % adPool.length] : null;

  // ---- Fullscreen (native where possible, CSS fallback for iPhone) ----
  useEffect(() => {
    const onChange = () => {
      const d = document as any;
      setNativeFs(!!(d.fullscreenElement || d.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  useEffect(() => {
    if (!fakeFs) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFakeFs(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fakeFs]);

  const toggleFullscreen = useCallback(() => {
    const d = document as any;
    const el = stageRef.current as any;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
      return;
    }
    if (fakeFs) {
      setFakeFs(false);
      return;
    }
    const request = el?.requestFullscreen || el?.webkitRequestFullscreen;
    if (request) Promise.resolve(request.call(el)).catch(() => setFakeFs(true));
    else setFakeFs(true);
  }, [fakeFs]);

  // ---- Preferences ----
  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      writeJson(PREFS_KEY, next);
      return next;
    });
  }, []);

  const toggleLike = (key: string, list: keyof Likes) => {
    setLikes((l) => {
      const has = l[list].includes(key);
      const next = { ...l, [list]: has ? l[list].filter((k) => k !== key) : [...l[list], key] };
      writeJson(LIKES_KEY, next);
      return next;
    });
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };

  // ---- Feed ----
  const categories = useMemo(
    () => TUBE_CATEGORIES.filter((c) => videos.some((v) => v.category === c.id)),
    [videos],
  );

  const currentKey = current ? feedKey(current) : '';

  const feed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (...fields: (string | null | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));

    let vs = videosAvailable ? videos.filter((v) => hit(v.title, v.channel, categoryLabel(v.category))) : [];
    let gs = games.filter((g) => hit(g.title, g.description, 'game', ...g.authors.map((a) => a.developer_name)));
    if (!videosAvailable) {
      // offline: games only
    } else if (chip === 'videos') gs = [];
    else if (chip === 'games') vs = [];
    else if (chip !== 'all') {
      vs = vs.filter((v) => v.category === chip);
      gs = [];
    }

    const items: FeedItem[] = [];
    let gi = 0;
    vs.forEach((video, i) => {
      items.push({ kind: 'video', video });
      if ((i + 1) % GAME_EVERY === 0 && gi < gs.length) items.push({ kind: 'game', game: gs[gi++] });
    });
    while (gi < gs.length) items.push({ kind: 'game', game: gs[gi++] });

    // Rotate so whatever comes after the current item is "up next", then drop the current item.
    const at = items.findIndex((it) => feedKey(it) === currentKey);
    return at < 0 ? items : [...items.slice(at + 1), ...items.slice(0, at)];
  }, [videos, games, chip, query, videosAvailable, currentKey]);

  const upNext = useMemo(() => {
    if (current?.kind !== 'video') return null;
    const next = feed.find((it): it is Extract<FeedItem, { kind: 'video' }> => it.kind === 'video');
    return next?.video ?? null;
  }, [feed, current]);

  // ---- Selection / switching between watching and playing ----
  const resumeFor = (v: TubeVideo) => {
    const t = resumeRef.current[v.youtube_id] ?? 0;
    const d = v.duration_seconds ?? Infinity;
    return t > 5 && t < d - 15 ? t : 0;
  };

  const select = useCallback((item: FeedItem) => {
    const prev = currentRef.current;
    if (prev?.kind === 'video' && item.kind === 'game') setLastVideo(prev.video);
    if (prev?.kind === 'game' && item.kind === 'video') setLastGame(prev.game);
    if (item.kind === 'video') {
      setStageVideo(item.video);
      setPlayToken((t) => t + 1);
    }
    setCurrent(item);
    setGuideOpen(false);
    setSearchOpen(false);
    const qs = item.kind === 'video' ? `?v=${item.video.youtube_id}` : `?g=${item.game.slug}`;
    window.history.replaceState(null, '', `${TUBE_PATH}${qs}`);
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const playNext = useCallback(() => {
    if (upNext) select({ kind: 'video', video: upNext });
  }, [upNext, select]);

  const exitGame = () => {
    if (videosAvailable && stageVideo) select({ kind: 'video', video: stageVideo });
    else setCurrent(null);
  };

  const onProgress = useCallback((id: string, seconds: number) => {
    resumeRef.current[id] = seconds;
  }, []);

  useEffect(() => {
    const title =
      current?.kind === 'video' && videosAvailable ? current.video.title : current?.kind === 'game' ? current.game.title : null;
    document.title = title ? `${title} - YTG Tube` : 'YTG Tube';
  }, [current, videosAvailable]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied');
    } catch {
      showToast('Could not copy the link');
    }
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    searchRef.current?.blur();
    setChip('all');
  };

  // ---- Render helpers ----
  const offlineGames = games.filter(gameAvailable).slice(0, 4);
  const showOfflineStage =
    mounted &&
    ((current?.kind !== 'game' && (!videosAvailable || !stageVideo)) ||
      (current?.kind === 'game' && !gameAvailable(current.game)));

  const rootClass = ['tube', prefs.dark && 'tube--dark', prefs.theater && 'tube--theater'].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {/* ================= Masthead ================= */}
      <header className={`tube-masthead${searchOpen ? ' tube-masthead--searching' : ''}`}>
        <div className="tube-masthead__start">
          <button className="tube-icon-btn" onClick={() => setGuideOpen(true)} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <Link href={TUBE_PATH} aria-label="YTG Tube home" onClick={() => { setChip('all'); setQuery(''); }}>
            <TubeLogo />
          </Link>
        </div>

        <div className="tube-masthead__center">
          {searchOpen && (
            <button className="tube-icon-btn" onClick={() => setSearchOpen(false)} aria-label="Back">
              <Icon name="back" />
            </button>
          )}
          <form className="tube-search" role="search" onSubmit={onSearch}>
            <div className="tube-search__box">
              <input
                ref={searchRef}
                className="tube-search__input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={videosAvailable ? 'Search videos and games' : 'Search games'}
                aria-label="Search"
                enterKeyHint="search"
              />
              {query && (
                <button type="button" className="tube-icon-btn" onClick={() => setQuery('')} aria-label="Clear search">
                  <Icon name="close" size={22} />
                </button>
              )}
            </div>
            <button type="submit" className="tube-search__btn" aria-label="Search">
              <Icon name="search" />
            </button>
          </form>
        </div>

        <div className="tube-masthead__end">
          <button
            className="tube-icon-btn tube-masthead__search-toggle"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchRef.current?.focus(), 0);
            }}
            aria-label="Search"
          >
            <Icon name="search" />
          </button>
          {mounted && !online && (
            <span className="tube-pill-offline">
              <Icon name="wifiOff" size={16} /> Offline
            </span>
          )}
          <button
            className="tube-icon-btn"
            onClick={() => updatePrefs({ dark: !prefs.dark })}
            aria-label={prefs.dark ? 'Light theme' : 'Dark theme'}
            title={prefs.dark ? 'Light theme' : 'Dark theme'}
          >
            <Icon name={prefs.dark ? 'sun' : 'moon'} />
          </button>
          <Link href="/" className="tube-icon-btn" aria-label="Back to YTG games" title="Back to YTG">
            <Icon name="home" />
          </Link>
          <Link href="/profile" className="tube-icon-btn" aria-label="Your profile" title="Profile">
            <span className="tube-avatar" style={{ background: '#ff4f9a' }}>
              <Icon name="person" size={20} />
            </span>
          </Link>
        </div>
      </header>

      {/* ================= Guide drawer ================= */}
      {guideOpen && (
        <>
          <div className="tube-guide-backdrop" onClick={() => setGuideOpen(false)} />
          <nav className="tube-guide" aria-label="Guide">
            <div className="tube-guide__head">
              <button className="tube-icon-btn" onClick={() => setGuideOpen(false)} aria-label="Close menu">
                <Icon name="menu" />
              </button>
              <TubeLogo />
            </div>
            <div className="tube-guide__section">
              {[
                { id: 'all', label: 'Home', icon: 'home' as const },
                { id: 'videos', label: 'Videos', icon: 'videos' as const },
                { id: 'games', label: 'Games', icon: 'game' as const },
              ].map((entry) => (
                <button
                  key={entry.id}
                  className={`tube-guide__item${chip === entry.id ? ' tube-guide__item--active' : ''}`}
                  onClick={() => {
                    setChip(entry.id);
                    setGuideOpen(false);
                  }}
                >
                  <Icon name={entry.icon} /> {entry.label}
                </button>
              ))}
            </div>
            <div className="tube-guide__section">
              <div className="tube-guide__title">YTG</div>
              <Link href="/" className="tube-guide__item">
                <Icon name="back" /> Back to YTG games
              </Link>
              <Link href="/admin/tube" className="tube-guide__item">
                <Icon name="shield" /> Parents: approve videos
              </Link>
            </div>
            <div className="tube-guide__foot">
              YTG Tube &middot; designed by Areli {'\u{1F981}'}
              <br />
              Only parent-approved videos play here. Games work offline.
            </div>
          </nav>
        </>
      )}

      {/* ================= Watch page ================= */}
      <div className="tube-scroller" ref={scrollerRef}>
        <div className="tube-watch">
          {/* ---- Stage ---- */}
          <div className="tube-stage-wrap">
            <div
              ref={stageRef}
              className={`tube-stage${current?.kind === 'game' ? ' tube-stage--game' : ''}${fakeFs ? ' tube-stage--fake-fs' : ''}`}
            >
              {!mounted && <div className="tube-spinner" />}

              {mounted && videosAvailable && stageVideo && (
                <TubePlayer
                  video={stageVideo}
                  playToken={playToken}
                  startAt={resumeFor(stageVideo)}
                  active={current?.kind === 'video'}
                  upNext={upNext}
                  suggestions={feed}
                  autoplayNext={prefs.autoplay}
                  onToggleAutoplay={() => updatePrefs({ autoplay: !prefs.autoplay })}
                  onSelect={select}
                  onNext={playNext}
                  onProgress={onProgress}
                  onApiFailed={() => setYtFailed(true)}
                  adGame={overlayAd}
                  fullscreen={fullscreen}
                  onToggleFullscreen={toggleFullscreen}
                  onToggleTheater={() => updatePrefs({ theater: !prefs.theater })}
                />
              )}

              {mounted && current?.kind === 'game' && gameAvailable(current.game) && (
                <GameStage
                  game={current.game}
                  fullscreen={fullscreen}
                  onToggleFullscreen={toggleFullscreen}
                  onExit={exitGame}
                />
              )}

              {showOfflineStage && (
                <div className="tube-offline-stage">
                  <Icon name={videosAvailable ? 'game' : 'wifiOff'} size={48} />
                  <div className="tube-offline-stage__title">
                    {videosAvailable ? 'Pick something to watch or play' : online ? 'Videos can’t load right now' : 'You’re offline'}
                  </div>
                  <div className="tube-offline-stage__sub">
                    {videosAvailable
                      ? 'Choose a video or a game from the list.'
                      : 'Videos need the internet, but your YTG games still work. Pick one!'}
                  </div>
                  {online && ytFailed && (
                    <button className="tube-endscreen__btn" onClick={() => setYtFailed(false)}>
                      <Icon name="replay" size={18} /> Try videos again
                    </button>
                  )}
                  <div className="tube-offline-stage__games">
                    {offlineGames.map((g) => (
                      <button key={g.slug} className="tube-offline-stage__game" onClick={() => select({ kind: 'game', game: g })}>
                        <div className="tube-endscreen__thumb">
                          <GameThumb game={g} />
                        </div>
                        <span>{g.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---- Title, channel row, description ---- */}
          <div className="tube-primary__info">
            {current?.kind === 'video' && videosAvailable && (
              <>
                <h1 className="tube-title">{current.video.title}</h1>
                <div className="tube-owner-row">
                  <div className="tube-owner">
                    <div className="tube-owner__avatar" style={{ background: avatarColor(current.video.channel) }}>
                      {current.video.channel.charAt(0).toUpperCase()}
                    </div>
                    <div className="tube-owner__text">
                      <div className="tube-owner__name">
                        <span>{current.video.channel}</span>
                        <Icon name="verified" size={14} style={{ color: 'var(--t-text-2)', flexShrink: 0 }} />
                      </div>
                      <div className="tube-owner__sub">Parent-approved channel</div>
                    </div>
                    <button
                      className={`tube-subscribe${likes.subs.includes(current.video.channel) ? ' tube-subscribe--on' : ''}`}
                      onClick={() => toggleLike(current.video.channel, 'subs')}
                    >
                      {likes.subs.includes(current.video.channel) ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>
                  <div className="tube-actions">
                    <button className="tube-action" onClick={() => toggleLike(currentKey, 'liked')} aria-pressed={likes.liked.includes(currentKey)}>
                      <Icon name={likes.liked.includes(currentKey) ? 'liked' : 'like'} size={20} />
                      {likes.liked.includes(currentKey) ? 'Liked' : 'Like'}
                    </button>
                    <button className="tube-action" onClick={share}>
                      <Icon name="share" size={20} /> Share
                    </button>
                  </div>
                </div>
                <div className="tube-description">
                  <div className="tube-description__meta">
                    <span>{categoryLabel(current.video.category)}</span>
                    {current.video.duration_seconds ? <span>{formatDuration(current.video.duration_seconds)}</span> : null}
                    <span className="tube-description__tag">#YTGTube</span>
                  </div>
                  <p>
                    From {current.video.channel}. A YTG parent watched and approved this video for YTG Tube.
                  </p>
                  <div className="tube-safe-note">
                    <Icon name="shield" size={16} /> Only videos your family approved can play here.
                  </div>
                </div>
              </>
            )}

            {current?.kind === 'game' && (
              <>
                <h1 className="tube-title">{current.game.title}</h1>
                <div className="tube-owner-row">
                  <div className="tube-owner">
                    <div className="tube-owner__avatar" style={{ background: 'linear-gradient(135deg, #ff4f9a, #ff1f1f)' }}>
                      {current.game.authors[0]?.developer_emoji ?? current.game.thumbnail_emoji}
                    </div>
                    <div className="tube-owner__text">
                      <div className="tube-owner__name">
                        <span>YTG Games</span>
                        <Icon name="verified" size={14} style={{ color: 'var(--t-text-2)', flexShrink: 0 }} />
                      </div>
                      <div className="tube-owner__sub">Made by {authorsText(current.game)}</div>
                    </div>
                    <button
                      className={`tube-subscribe${likes.subs.includes('YTG Games') ? ' tube-subscribe--on' : ''}`}
                      onClick={() => toggleLike('YTG Games', 'subs')}
                    >
                      {likes.subs.includes('YTG Games') ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>
                  <div className="tube-actions">
                    <button className="tube-action tube-action--primary" onClick={toggleFullscreen}>
                      <Icon name="fullscreen" size={20} /> Full screen
                    </button>
                    <button className="tube-action" onClick={() => toggleLike(currentKey, 'liked')} aria-pressed={likes.liked.includes(currentKey)}>
                      <Icon name={likes.liked.includes(currentKey) ? 'liked' : 'like'} size={20} />
                      {likes.liked.includes(currentKey) ? 'Liked' : 'Like'}
                    </button>
                    <button className="tube-action" onClick={share}>
                      <Icon name="share" size={20} /> Share
                    </button>
                  </div>
                </div>
                <div className="tube-description">
                  <div className="tube-description__meta">
                    <span>{plural(current.game.play_count, 'play')}</span>
                    <span>{current.game.player_count}</span>
                    <span>{current.game.controls}</span>
                    <span className="tube-description__tag">#YTGGames</span>
                  </div>
                  {current.game.description && <p>{current.game.description}</p>}
                  <div className="tube-safe-note">
                    <Icon name="wifiOff" size={16} /> YTG games keep working even without internet.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ---- Sidebar: switch-back, sponsored game, chips, up next ---- */}
          <aside className="tube-secondary">
            {mounted && !videosAvailable && (
              <div className="tube-banner-offline" role="status">
                <Icon name="wifiOff" size={24} style={{ flexShrink: 0 }} />
                <div>
                  <b>{online ? 'Videos are unavailable' : 'You’re offline'}</b>
                  No videos right now, but these games still work!
                </div>
              </div>
            )}

            {current?.kind === 'game' && lastVideo && videosAvailable && (
              <div className="tube-switchback">
                <div className="tube-switchback__label">Continue watching</div>
                <button className="tube-card" onClick={() => select({ kind: 'video', video: lastVideo })}>
                  <div className="tube-card__thumb">
                    <VideoThumb youtubeId={lastVideo.youtube_id} />
                    <span className="tube-badge tube-badge--now">
                      <Icon name="play" size={14} /> Resume
                    </span>
                    {lastVideo.duration_seconds && resumeRef.current[lastVideo.youtube_id] ? (
                      <div className="tube-resume-bar">
                        <div
                          style={{
                            width: `${Math.min(100, (resumeRef.current[lastVideo.youtube_id] / lastVideo.duration_seconds) * 100)}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="tube-card__meta">
                    <h3 className="tube-card__title">{lastVideo.title}</h3>
                    <div className="tube-card__line">
                      <span>{lastVideo.channel}</span>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {current?.kind === 'video' && lastGame && (
              <div className="tube-switchback">
                <div className="tube-switchback__label">Back to your game</div>
                <FeedCard item={{ kind: 'game', game: lastGame }} onSelect={select} />
              </div>
            )}

            {companionAd && (
              <CompanionAd game={companionAd} tick={adTick} onPlay={(g) => select({ kind: 'game', game: g })} />
            )}

            {videosAvailable && (
              <div className="tube-chips-wrap">
                <div className="tube-chips" role="tablist" aria-label="Filter">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'videos', label: 'Videos' },
                    { id: 'games', label: 'Games' },
                    ...categories,
                  ].map((c) => (
                    <button
                      key={c.id}
                      role="tab"
                      aria-selected={chip === c.id}
                      className={`tube-chip${chip === c.id ? ' tube-chip--on' : ''}`}
                      onClick={() => setChip(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query.trim() && <div className="tube-feed__heading">Results for &ldquo;{query.trim()}&rdquo;</div>}

            <div className="tube-feed">
              {feed.length === 0 ? (
                <div className="tube-feed__empty">Nothing here yet. Try another search or filter.</div>
              ) : (
                feed.map((item) => (
                  <FeedCard
                    key={feedKey(item)}
                    item={item}
                    onSelect={select}
                    disabled={item.kind === 'game' && !gameAvailable(item.game)}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {toast && (
        <div className="tube-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
