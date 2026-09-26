'use client';

/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { GameThumb, VideoThumb } from './Thumb';
import { loadYouTubeApi, YTState } from './youtubeApi';
import { formatDuration, type FeedItem, type TubeGame, type TubeVideo } from '@/lib/tube';

const AD_DELAY_S = 15; // overlay ad appears this far into each video
const AD_VISIBLE_MS = 12000;
const COUNTDOWN_S = 8;
const IDLE_MS = 2500;
const RING = 2 * Math.PI * 26;

const ERROR_TEXT: Record<number, string> = {
  2: 'This video link is broken.',
  5: 'This video could not play in this browser.',
  100: 'This video was removed or made private.',
  101: 'The owner turned off playing this video on other sites.',
  150: 'The owner turned off playing this video on other sites.',
};

interface TubePlayerProps {
  video: TubeVideo;
  /** Bumped by the parent each time the kid picks something to watch (means "play", not just "show"). */
  playToken: number;
  startAt: number;
  /** False while a game is on stage: the player pauses and hides but keeps its iframe. */
  active: boolean;
  upNext: TubeVideo | null;
  suggestions: FeedItem[];
  autoplayNext: boolean;
  onToggleAutoplay: () => void;
  onSelect: (item: FeedItem) => void;
  onNext: () => void;
  onProgress: (youtubeId: string, seconds: number) => void;
  onApiFailed: () => void;
  adGame: TubeGame | null;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleTheater: () => void;
}

function embedSrc(id: string, start: number): string {
  const params = new URLSearchParams({
    enablejsapi: '1',
    controls: '0',
    rel: '0',
    iv_load_policy: '3',
    playsinline: '1',
    disablekb: '1',
    fs: '0',
    cc_load_policy: '0',
    origin: window.location.origin,
    widget_referrer: window.location.origin,
  });
  if (start > 0) params.set('start', String(Math.floor(start)));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default function TubePlayer(props: TubePlayerProps) {
  const { video, playToken, startAt, active, upNext, suggestions, autoplayNext, fullscreen } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const loadedRef = useRef({ id: video.youtube_id, token: playToken });
  const [src] = useState(() => embedSrc(video.youtube_id, startAt));

  const [ready, setReady] = useState(false);
  const [state, setState] = useState<number>(YTState.UNSTARTED);
  // Once anything has played in this iframe we can drive it with our own controls
  // (iOS needs the very first play to be a tap inside YouTube's own player).
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(startAt);
  const [duration, setDuration] = useState(video.duration_seconds ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [idle, setIdle] = useState(false);
  const [flash, setFlash] = useState<{ icon: 'play' | 'pause'; key: number } | null>(null);
  const [scrub, setScrub] = useState<{ frac: number; dragging: boolean } | null>(null);
  const [adShown, setAdShown] = useState<TubeGame | null>(null);
  const adShownRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastProgressRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  const playing = state === YTState.PLAYING || state === YTState.BUFFERING;
  const ended = state === YTState.ENDED;

  function handleState(s: number) {
    setState(s);
    if (s === YTState.PLAYING) {
      setStarted(true);
      setErrorCode(null);
      setCountdown(null);
      poke(); // start the auto-hide timer for the controls
    } else if (s === YTState.ENDED) {
      const { autoplayNext: auto, upNext: next } = propsRef.current;
      setCountdown(auto && next ? COUNTDOWN_S : null);
    }
  }

  // ---- Create the YouTube player on our own sandboxed iframe ----
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || playerRef.current || !iframeRef.current) return;
        playerRef.current = new YT.Player(iframeRef.current, {
          host: 'https://www.youtube-nocookie.com',
          events: {
            onReady: () => {
              const p = playerRef.current;
              setVolume(p.getVolume?.() ?? 100);
              setMuted(p.isMuted?.() ?? false);
              setReady(true);
            },
            onStateChange: (e: { data: number }) => handleState(e.data),
            onError: (e: { data: number }) => setErrorCode(e.data),
          },
        });
      })
      .catch(() => {
        if (!cancelled) propsRef.current.onApiFailed();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Load / cue whenever the chosen video or play request changes ----
  useEffect(() => {
    const p = playerRef.current;
    if (!ready || !p) return;
    const last = loadedRef.current;
    if (last.id === video.youtube_id && last.token === playToken) return;
    const shouldPlay = playToken !== last.token;
    loadedRef.current = { id: video.youtube_id, token: playToken };
    setErrorCode(null);
    setCountdown(null);
    setTime(startAt);
    setDuration(video.duration_seconds ?? 0);
    setBuffered(0);
    setAdShown(null);
    adShownRef.current = false;
    lastProgressRef.current = startAt;
    if (shouldPlay) p.loadVideoById({ videoId: video.youtube_id, startSeconds: startAt });
    else p.cueVideoById({ videoId: video.youtube_id, startSeconds: startAt });
  }, [ready, video.youtube_id, playToken]);

  // ---- Pause when a game takes the stage ----
  useEffect(() => {
    if (active || !ready) return;
    try {
      playerRef.current?.pauseVideo();
    } catch {
      // player not ready yet
    }
    setAdShown(null);
    setCountdown(null);
  }, [active, ready]);

  // ---- Poll time / buffer while playing; trigger the overlay ad ----
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      const t = p.getCurrentTime() || 0;
      const d = p.getDuration() || 0;
      setTime(t);
      if (d) setDuration(d);
      setBuffered(p.getVideoLoadedFraction?.() || 0);
      if (Math.abs(t - lastProgressRef.current) >= 1) {
        lastProgressRef.current = t;
        propsRef.current.onProgress(loadedRef.current.id, t);
      }
      if (playing && !adShownRef.current && propsRef.current.adGame && t >= AD_DELAY_S) {
        adShownRef.current = true;
        setAdShown(propsRef.current.adGame);
      }
    };
    tick();
    if (!playing) return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [ready, playing]);

  useEffect(() => {
    if (!adShown) return;
    const t = setTimeout(() => setAdShown(null), AD_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [adShown]);

  // ---- "Up next" countdown ----
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      propsRef.current.onNext();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ---- Skip broken videos when autoplay is on ----
  useEffect(() => {
    if (errorCode === null) return;
    const { autoplayNext: auto, upNext: next } = propsRef.current;
    if (!auto || !next) return;
    const t = setTimeout(() => propsRef.current.onNext(), 4000);
    return () => clearTimeout(t);
  }, [errorCode]);

  // ---- Controls ----
  const poke = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (playing) {
      p.pauseVideo();
      setFlash({ icon: 'pause', key: Date.now() });
    } else {
      if (ended) p.seekTo(0, true);
      p.playVideo();
      setFlash({ icon: 'play', key: Date.now() });
    }
  }

  function seekTo(seconds: number) {
    const p = playerRef.current;
    if (!p || !duration) return;
    const t = clamp(seconds, 0, duration - 0.5);
    p.seekTo(t, true);
    setTime(t);
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      if (volume === 0) {
        p.setVolume(50);
        setVolume(50);
      }
    } else {
      p.mute();
    }
    setMuted(!muted);
  }

  function changeVolume(v: number) {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    setVolume(v);
    if (v > 0 && muted) {
      p.unMute();
      setMuted(false);
    } else if (v === 0 && !muted) {
      p.mute();
      setMuted(true);
    }
  }

  // Keyboard shortcuts, YouTube-style (only while a video is on stage)
  useEffect(() => {
    if (!active || !started) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.key === ' ' || e.key === 'Enter') && el.closest('button, a')) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(time - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(time + 5);
          break;
        case 'j':
          seekTo(time - 10);
          break;
        case 'l':
          seekTo(time + 10);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          propsRef.current.onToggleFullscreen();
          break;
        case 't':
          propsRef.current.onToggleTheater();
          break;
        case 'N':
          if (upNext) propsRef.current.onNext();
          break;
        default:
          return;
      }
      poke();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fracAt = (clientX: number) => {
    const r = barRef.current?.getBoundingClientRect();
    return r ? clamp((clientX - r.left) / r.width, 0, 1) : 0;
  };

  const controlsVisible = started && !ended && errorCode === null && (!playing || !idle || !!scrub?.dragging);
  const playFrac = scrub?.dragging ? scrub.frac : duration ? clamp(time / duration, 0, 1) : 0;
  const adAuthors = adShown?.authors.map((a) => a.developer_name).join(' & ');

  return (
    <div
      className={`tube-player${controlsVisible ? '' : ' tube-stage--idle'}`}
      style={{ position: 'absolute', inset: 0, display: active ? 'block' : 'none' }}
      onPointerMove={poke}
    >
      {/* Sandbox without allow-popups / allow-top-navigation: YouTube links inside the player cannot open. */}
      <iframe
        ref={iframeRef}
        className="tube-yt"
        src={src}
        title={video.title}
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />

      {/* Click shield: after the first play, every tap goes to our controls, never to YouTube's UI */}
      {started && !ended && (
        <div
          className="tube-shield"
          onPointerUp={(e) => {
            if (e.pointerType === 'touch' && !controlsVisible) {
              poke();
              return;
            }
            togglePlay();
            poke();
          }}
          onDoubleClick={() => propsRef.current.onToggleFullscreen()}
        />
      )}

      {started && state === YTState.BUFFERING && <div className="tube-spinner" />}
      {flash && (
        <div key={flash.key} className="tube-flash" onAnimationEnd={() => setFlash(null)}>
          <Icon name={flash.icon} size={32} />
        </div>
      )}

      {/* In-video overlay ad (advertises YTG games) */}
      {adShown && !ended && (
        <div
          className="tube-overlay-ad"
          style={controlsVisible ? undefined : { bottom: 16 }}
          role="button"
          tabIndex={0}
          onClick={() => props.onSelect({ kind: 'game', game: adShown })}
          onKeyDown={(e) => e.key === 'Enter' && props.onSelect({ kind: 'game', game: adShown })}
        >
          <div className="tube-overlay-ad__thumb">
            <GameThumb game={adShown} />
          </div>
          <div className="tube-overlay-ad__body">
            <div className="tube-overlay-ad__title">{adShown.title}</div>
            <div className="tube-overlay-ad__meta">
              <span className="tube-ad-badge">Ad</span>
              <span>Play free on YTG{adAuthors ? ` · by ${adAuthors}` : ''}</span>
            </div>
          </div>
          <button
            className="tube-overlay-ad__close"
            aria-label="Close ad"
            onClick={(e) => {
              e.stopPropagation();
              setAdShown(null);
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Controls */}
      {started && (
        <div
          className={`tube-controls${controlsVisible ? '' : ' tube-controls--hidden'}`}
          onPointerMove={poke}
        >
          <div
            ref={barRef}
            className={`tube-progress${scrub?.dragging ? ' tube-progress--drag' : ''}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setScrub({ frac: fracAt(e.clientX), dragging: true });
            }}
            onPointerMove={(e) => setScrub({ frac: fracAt(e.clientX), dragging: !!scrub?.dragging })}
            onPointerUp={(e) => {
              if (scrub?.dragging) seekTo(fracAt(e.clientX) * duration);
              setScrub(null);
            }}
            onPointerLeave={() => !scrub?.dragging && setScrub(null)}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
          >
            <div className="tube-progress__track">
              <div className="tube-progress__buffer" style={{ width: `${buffered * 100}%` }} />
              {scrub && <div className="tube-progress__hover" style={{ width: `${scrub.frac * 100}%` }} />}
              <div className="tube-progress__play" style={{ width: `${playFrac * 100}%` }} />
              <div className="tube-progress__scrubber" style={{ left: `${playFrac * 100}%` }} />
            </div>
            {scrub && (
              <div className="tube-progress__tip" style={{ left: `clamp(24px, ${scrub.frac * 100}%, calc(100% - 24px))` }}>
                {formatDuration(scrub.frac * duration)}
              </div>
            )}
          </div>

          <div className="tube-controls__bar">
            <div className="tube-controls__left">
              <button className="tube-cbtn" onClick={togglePlay} aria-label={playing ? 'Pause (k)' : 'Play (k)'} title={playing ? 'Pause (k)' : 'Play (k)'}>
                <Icon name={playing ? 'pause' : 'play'} size={30} />
              </button>
              {upNext && (
                <button className="tube-cbtn" onClick={props.onNext} aria-label="Next video" title={`Next: ${upNext.title}`}>
                  <Icon name="next" size={26} />
                </button>
              )}
              <div className="tube-volume">
                <button className="tube-cbtn" onClick={toggleMute} aria-label={muted ? 'Unmute (m)' : 'Mute (m)'} title={muted ? 'Unmute (m)' : 'Mute (m)'}>
                  <Icon name={muted || volume === 0 ? 'mute' : 'volume'} size={26} />
                </button>
                <div className="tube-volume__slider tube-controls__hide-sm">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    aria-label="Volume"
                  />
                </div>
              </div>
              <div className="tube-time">
                <span>{formatDuration(time)}</span>
                <span className="tube-time__sep">/</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            <div className="tube-controls__right">
              <button
                className={`tube-autoplay${autoplayNext ? ' tube-autoplay--on' : ''}`}
                onClick={props.onToggleAutoplay}
                aria-pressed={autoplayNext}
                aria-label={autoplayNext ? 'Autoplay is on' : 'Autoplay is off'}
                title={autoplayNext ? 'Autoplay is on' : 'Autoplay is off'}
              >
                <span className="tube-autoplay__track">
                  <span className="tube-autoplay__knob">
                    <Icon name={autoplayNext ? 'play' : 'pause'} size={12} />
                  </span>
                </span>
              </button>
              {!fullscreen && (
                <button className="tube-cbtn tube-controls__hide-md" onClick={props.onToggleTheater} aria-label="Theater mode (t)" title="Theater mode (t)">
                  <Icon name="theater" size={26} />
                </button>
              )}
              <button
                className="tube-cbtn"
                onClick={props.onToggleFullscreen}
                aria-label={fullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
                title={fullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
              >
                <Icon name={fullscreen ? 'fullscreenExit' : 'fullscreen'} size={28} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End screen: covers YouTube's own suggestions completely */}
      {ended && (
        <div className="tube-endscreen">
          <div
            className="tube-endscreen__bg"
            style={{ backgroundImage: `url(https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg)` }}
          />
          {countdown !== null && upNext ? (
            <>
              <div className="tube-endscreen__label">Up next in {countdown}</div>
              <button className="tube-endscreen__card" onClick={props.onNext}>
                <div className="tube-endscreen__thumb">
                  <VideoThumb youtubeId={upNext.youtube_id} hq />
                  <div className="tube-countdown">
                    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                      <circle cx="32" cy="32" r="26" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="4"
                        strokeDasharray={RING}
                        strokeDashoffset={RING * (countdown / COUNTDOWN_S)}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <Icon name="play" size={28} style={{ position: 'absolute' }} />
                  </div>
                </div>
                <div className="tube-endscreen__title">{upNext.title}</div>
                <div className="tube-endscreen__sub">{upNext.channel}</div>
              </button>
              <div className="tube-endscreen__actions">
                <button className="tube-endscreen__btn" onClick={() => setCountdown(null)}>
                  Cancel
                </button>
                <button className="tube-endscreen__btn tube-endscreen__btn--primary" onClick={props.onNext}>
                  Play now
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="tube-endscreen__grid">
                {suggestions.slice(0, 4).map((item) => (
                  <button
                    key={item.kind === 'video' ? item.video.youtube_id : item.game.slug}
                    className="tube-endscreen__card"
                    style={{ width: '100%' }}
                    onClick={() => props.onSelect(item)}
                  >
                    <div className="tube-endscreen__thumb">
                      {item.kind === 'video' ? <VideoThumb youtubeId={item.video.youtube_id} /> : <GameThumb game={item.game} />}
                      {item.kind === 'game' && (
                        <span className="tube-badge tube-badge--game">
                          <Icon name="game" size={14} /> GAME
                        </span>
                      )}
                    </div>
                    <div className="tube-endscreen__title" style={{ fontSize: 14, lineHeight: '20px' }}>
                      {item.kind === 'video' ? item.video.title : item.game.title}
                    </div>
                  </button>
                ))}
              </div>
              <div className="tube-endscreen__actions">
                <button className="tube-endscreen__btn tube-endscreen__btn--primary" onClick={togglePlay}>
                  <Icon name="replay" size={20} /> Replay
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {errorCode !== null && (
        <div className="tube-endscreen">
          <Icon name="videos" size={48} />
          <div style={{ fontSize: 18, fontWeight: 500 }}>This video can&rsquo;t play right now</div>
          <div className="tube-endscreen__label">{ERROR_TEXT[errorCode] ?? 'Something went wrong with this video.'}</div>
          {upNext && (
            <button className="tube-endscreen__btn tube-endscreen__btn--primary" onClick={props.onNext}>
              Play next video
            </button>
          )}
        </div>
      )}
    </div>
  );
}
