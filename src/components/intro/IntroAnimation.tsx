import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './IntroSoundController';

interface IntroAnimationProps {
  autoPlay?: boolean;
  onComplete?: () => void;
}

/* ===================== TWEAKABLE SETTINGS ===================== */
const SCENE_S = 3.8; // logos + glow phase (seconds)
const ZOOM_S = 1.2; // zoom into the fog (seconds)
const REVEAL_S = 1.2; // homepage fades in smoothly (seconds)
const FINISH_MS = Math.round((SCENE_S + ZOOM_S) * 1000); // 5000 -> reveal starts
const ZOOM_SCALE = 22; // how far the camera flies into the scene
// exponential keyframes = constant perceived speed of flight
const ZOOM_KEYS = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.pow(ZOOM_SCALE, p));
const SHOW_TAP_FOR_SOUND_HINT = true; // show tap hint on mobile so users know to tap for sound
const TYPING_DELAY_MS = 800; // wait before the instruction line starts typing
const TYPING_SPEED_MS = 55; // time per typed character (about 2 seconds for the whole line)
const LAUNCH_MS = 380; // length of the logo flash after the click, before the intro starts
const ASSET_VERSION = 3; // bump this number when you replace a logo file (busts the browser cache)
const TAGLINE = 'BEYOND A CLUB  ·  THE BEGINNING OF A NEW TECH ERA';
const MAIN_LOGO_W = 'clamp(200px, 32vw, 340px)'; // larger on mobile
const TEXT_LOGO_W = 'clamp(280px, 48vw, 600px)'; // larger on mobile
const MOBILE_PARTICLE_COUNT = 18; // fewer particles on mobile for smoother performance
const DESKTOP_PARTICLE_COUNT = 36;
/* ============================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;
const MAIN_LOGO = `/images/intro/NEXORA%20LOGO.png?v=${ASSET_VERSION}`;
const TEXT_LOGO = `/images/intro/nexora-bvm-text-logo.png?v=${ASSET_VERSION}`;
// deterministic "random" star particles (desktop atmospheric background)
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Desktop star particles for the atmospheric background
const DESKTOP_PARTICLES = (() => {
  const r = mulberry32(7);
  return Array.from({ length: 280 }, () => ({
    left: r() * 100,
    top: r() * 100,
    size: 0.6 + r() * 1.8,
    delay: r() * 4,
    dur: 18 + r() * 30,
    drift: 15 + r() * 25,
    alpha: 0.3 + r() * 0.5,
    twinkle: 2 + r() * 4,
  }));
})();

// soft procedural FOG texture, violet-tinted (generated once, no image files needed)
// Oversized 2048px texture with edge-to-zero alpha fade so boundaries stay invisible
// even when scaled during animation transforms. Larger source canvas ensures the edge fade
// covers the full viewport regardless of scale factor.
const makeFogTexture = (seed: number, size = 1024): string => {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    // Use oversized canvas so edge fade covers full viewport even at max scale
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const img = ctx.createImageData(size, size);
    const rnd = mulberry32(seed);
    const G = 64;
    const lat = new Float32Array(G * G);
    for (let i = 0; i < lat.length; i++) lat[i] = rnd();
    const sm = (t: number) => t * t * (3 - 2 * t);
    const step = (a: number, b: number, x: number) => sm(Math.min(1, Math.max(0, (x - a) / (b - a))));
    const noise = (x: number, y: number) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = sm(x - xi), yf = sm(y - yi);
      const x0 = ((xi % G) + G) % G, y0 = ((yi % G) + G) % G;
      const x1 = (x0 + 1) % G, y1 = (y0 + 1) % G;
      const a = lat[y0 * G + x0], b = lat[y0 * G + x1], c = lat[y1 * G + x0], d = lat[y1 * G + x1];
      const top = a + (b - a) * xf;
      return top + (c + (d - c) * xf - top) * yf;
    };
    const fbm = (u: number, v: number) => {
      let amp = 0.5, freq = 3, sum = 0, norm = 0;
      for (let o = 0; o < 6; o++) {
        sum += amp * noise(u * freq, v * freq);
        norm += amp;
        amp *= 0.5;
        freq *= 2;
      }
      return sum / norm;
    };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const n = fbm(u, v);
        const dx = u - 0.5, dy = v - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;
        // A corner-only radial fade leaves nonzero pixels halfway along straight
        // canvas edges. Fade against the NEAREST of all four edges instead.
        const edgeDistance = Math.min(u, v, 1 - u, 1 - v);
        const edgeFade = step(0, 0.20, edgeDistance);
        let a = step(0.25, 0.70, n) * 0.6 * edgeFade;
        a *= 0.30 + 0.70 * step(0.02, 0.45, r); // soft central flight tunnel
        const shade = 0.78 + 0.22 * step(0.45, 0.85, fbm(u + 0.3, v + 0.17));
        const i = (y * size + x) * 4;
        img.data[i] = 118 * shade + 60; // violet-lavender mist, deliberately not white
        img.data[i + 1] = 96 * shade + 50;
        img.data[i + 2] = 255;
        // No nonzero alpha on ANY side, including edge midpoints
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
};

// three fog layers drifting toward the camera at different speeds (parallax = depth)
// Desktop: smooth zoom into fog. Mobile: tiny scale, no rotation — prevents crashes.
const isMobileDevice = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 768px)').matches;
const FOG_LAYERS = isMobileDevice
  ? [
      { seed: 11, start: 3.9, s0: 1.0, s1: 1.5, rot: 0, peak: 0.4 },
      { seed: 23, start: 4.05, s0: 1.0, s1: 1.8, rot: 0, peak: 0.45 },
      { seed: 37, start: 4.2, s0: 1.0, s1: 2.0, rot: 0, peak: 0.5 },
    ]
  : [
      { seed: 11, start: 3.9, s0: 1.0, s1: 3.6, rot: -6, peak: 0.7 },
      { seed: 23, start: 4.05, s0: 1.0, s1: 6.5, rot: 5, peak: 0.8 },
      { seed: 37, start: 4.2, s0: 1.2, s1: 12, rot: -9, peak: 0.85 },
    ];
const END_S = SCENE_S + ZOOM_S + REVEAL_S; // 6.2

type ExitMode = 'normal' | 'fast' | 'reduced';
const rootVariants = {
  exit: (mode: ExitMode) => ({
    opacity: 0,
    transition: { duration: mode === 'fast' ? 0.35 : mode === 'reduced' ? 0.5 : REVEAL_S, ease: 'easeOut' as const },
  }),
};

const SoundIcon: React.FC<{ off?: boolean }> = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
    {off ? (
      <>
        <line x1="22" y1="9" x2="16" y2="15" />
        <line x1="16" y1="9" x2="22" y2="15" />
      </>
    ) : (
      <>
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </>
    )}
  </svg>
);

const glassButton: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.5)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
};

const Backdrop: React.FC<{ reduced: boolean }> = ({ reduced }) => (
  <>
    {/* Near-black galaxy from the supplied reference: violet haze ONLY in two
        broad, edge-free clouds. No bright centralized gradient and no color bands. */}
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: '#020105',
    }} />
    <motion.div aria-hidden="true" style={{
      position: 'absolute', inset: '-14%', pointerEvents: 'none',
      background:
        'radial-gradient(ellipse 34% 41% at 19% 27%, rgba(68,20,112,0.23) 0%, rgba(42,12,80,0.12) 40%, transparent 82%), radial-gradient(ellipse 38% 36% at 82% 72%, rgba(71,31,120,0.19) 0%, rgba(41,15,76,0.09) 45%, transparent 85%)',
      filter: 'blur(30px)',
    }}
      animate={reduced ? undefined : { opacity: [0.78, 1, 0.82], x: [0, 8, 0] }}
      transition={reduced ? undefined : { duration: 22, repeat: Infinity, ease: 'easeInOut' }}
    />
    {/* Sparse, subdued starlight scattered across the entire viewport. */}
    {DESKTOP_PARTICLES.filter((_, i) => [4, 22, 51, 89, 136, 174, 217].includes(i)).map((p, i) => (
      <motion.span key={i} aria-hidden="true" style={{
        position: 'absolute',
        left: `${p.left}%`, top: `${p.top}%`,
        width: Math.min(p.size, 1.25), height: Math.min(p.size, 1.25),
        borderRadius: '50%',
        background: i % 13 === 0 ? '#eed4ff' : '#9d84c5',
        opacity: p.alpha * 0.37,
        boxShadow: i % 9 === 0 ? '0 0 4px rgba(172,122,232,0.23)' : 'none',
      }}
        initial={false}
        animate={reduced ? undefined : { opacity: [p.alpha * 0.20, p.alpha * 0.48, p.alpha * 0.20] }}
        transition={reduced ? undefined : { duration: p.twinkle + 8, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
  </>
);

/* NX_START_GATE_V6 - "click the logo to start" screen */
/* NX_LOGO_ONLY_V8 - only the logo glows (no disc, no circle behind it), no Skip button */
const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;

const GATE_CSS = [
  '.nx-gate-logo{-webkit-tap-highlight-color:transparent;outline:none;transition:filter .35s ease}',
  '.nx-gate-logo:hover,.nx-gate-logo:focus-visible{filter:brightness(1.3)}',
  '.nx-gate-logo:focus-visible{outline:2px solid rgba(196,181,253,.75);outline-offset:4px}',
].join('');

const MOBILE_CSS = [
  '.nx-intro-container{height:100dvh;width:100%;overflow:hidden;min-height:100vh;background:#080313}',
  '@media (max-width: 768px) {',
  '  .nx-gate-logo{min-width:clamp(200px,45vw,340px);min-height:clamp(200px,45vw,340px);padding:clamp(44px,12vw,90px)}',
  '  .nx-gate-logo img{width:clamp(180px,32vw,280px)}',
  '  .nx-typing-line{font-size:clamp(11px,3vw,15px);padding-bottom:env(safe-area-inset-bottom)}',
  '  .nx-mute-btn{top:max(20px,env(safe-area-inset-top));left:16px}',
  '}',
].join('');

const TypingLine: React.FC<{ text: string }> = ({ text }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let i = 0;
    let iv: number | undefined;
    const t = window.setTimeout(() => {
      iv = window.setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length && iv !== undefined) window.clearInterval(iv);
      }, TYPING_SPEED_MS);
    }, TYPING_DELAY_MS);
    return () => {
      window.clearTimeout(t);
      if (iv !== undefined) window.clearInterval(iv);
    };
  }, [text]);

  const font: React.CSSProperties = {
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
    fontSize: 'clamp(10px, 2.8vw, 15px)',
    letterSpacing: '0.2em',
    whiteSpace: 'pre-wrap',
    color: '#DDD6FE',
    textShadow: '0 0 16px rgba(139,92,246,0.85)',
  };
  return (
    <div role="status" aria-label={text} style={{ display: 'inline-grid', ...font }}>
      {/* invisible full-length copy reserves the width so the line never shifts while typing */}
      <span aria-hidden="true" style={{ gridArea: '1 / 1', visibility: 'hidden' }}>{'> ' + text + ' '}</span>
      <span aria-hidden="true" style={{ gridArea: '1 / 1', textAlign: 'left' }}>
        <span style={{ color: '#A78BFA' }}>{'> '}</span>
        {text.slice(0, count)}
        <motion.span
          style={{ display: 'inline-block', width: '0.55em', height: '1.05em', marginLeft: '0.15em', verticalAlign: '-0.15em', background: '#C4B5FD', boxShadow: '0 0 10px rgba(196,181,253,0.9)' }}
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: 'linear' }}
        />
      </span>
    </div>
  );
};

const StartGate: React.FC<{ reduced: boolean; launching: boolean; onStart: () => void }> = ({ reduced, launching, onStart }) => {
  const [touch] = useState(isTouchDevice);
  const label = (touch ? 'TAP' : 'CLICK') + ' LOGO TO START EXPERIENCE';

  // A click on the already-visible HTML boot gate is queued until React's
  // real clickable logo mounts; no oversized interim logo or lost click.
  useEffect(() => {
    if (document.documentElement.dataset.nxIntroPending === '1') {
      delete document.documentElement.dataset.nxIntroPending;
      onStart();
    }
  }, [onStart]);

  // Enter / Space also starts it (keyboard users)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.code !== 'Space') return;
      const el = e.target as HTMLElement | null;
      const btn = el && el.closest ? el.closest('button') : null;
      if (btn && !btn.classList.contains('nx-gate-logo')) return; // e.g. the mute button handles its own key
      e.preventDefault();
      onStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <>
      <style>{GATE_CSS}</style>
      <style>{MOBILE_CSS}</style>
      <Backdrop reduced={reduced} />

      {/* white-violet flash when the logo is clicked */}
      {launching && (
        <motion.div
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(circle at 50% 45%, rgba(237,233,254,0.95), rgba(139,92,246,0.4) 38%, transparent 70%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: LAUNCH_MS / 1000, ease: 'easeOut' }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(8px, 2vh, 24px)',
          padding: 'clamp(16px, 4vw, 24px)',
          boxSizing: 'border-box',
        }}
      >
        <motion.button
          type="button"
          className="nx-gate-logo"
          onClick={onStart}
          aria-label="Start NEXORA experience"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(44px, 10vw, 90px)',
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            minWidth: 'clamp(200px, 40vw, 340px)',
            minHeight: 'clamp(200px, 40vw, 340px)',
            touchAction: 'manipulation',
          }}
          initial={{ opacity: 1, scale: 1 }}
          animate={launching ? { opacity: 1, scale: 1.25 } : { opacity: 1, scale: 1 }}
          transition={launching ? { duration: LAUNCH_MS / 1000, ease: 'easeIn' } : { duration: 1.2, ease: EASE }}
          whileHover={launching ? undefined : { scale: 1.06 }}
          whileTap={launching ? undefined : { scale: 0.96 }}
        >
          <motion.img
            src={MAIN_LOGO}
            alt=""
            draggable={false}
            style={{ position: 'relative', width: 'clamp(180px, 30vw, 280px)', height: 'auto', pointerEvents: 'none', userSelect: 'none' }}
            animate={
              launching
                ? { filter: 'drop-shadow(0 0 60px rgba(237,233,254,1)) brightness(1.8)' }
                : {
                    filter: [
                      'drop-shadow(0 0 8px rgba(167,139,250,0.55)) drop-shadow(0 0 22px rgba(139,92,246,0.45)) brightness(1)',
                      'drop-shadow(0 0 14px rgba(196,181,253,0.95)) drop-shadow(0 0 44px rgba(139,92,246,0.8)) brightness(1.15)',
                      'drop-shadow(0 0 8px rgba(167,139,250,0.55)) drop-shadow(0 0 22px rgba(139,92,246,0.45)) brightness(1)',
                    ],
                  }
            }
            transition={launching ? { duration: LAUNCH_MS / 1000, ease: 'easeOut' } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.button>

        <motion.div className="nx-typing-line" animate={{ opacity: launching ? 0 : 1 }} transition={{ duration: 0.2 }}>
          <TypingLine text={label} />
        </motion.div>
      </div>
    </>
  );
};

/**
 * Cinematic NEXORA intro (fixed overlay above the always-mounted <App />).
 * Timeline: 0-3.8s logos + glow | 3.8-5.0s zoom into the fog |
 * 5.0-6.2s homepage fades in. onComplete fires exactly once.
 */
export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  autoPlay = true,
  onComplete,
}) => {
  const reduced =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const gate = !reduced && autoPlay; // show the "click the logo" screen first
  const [started, setStarted] = useState(!gate);
  const [launching, setLaunching] = useState(false);
  const launchingRef = useRef(false);
  const [visible, setVisible] = useState(true);
  const [exitMode, setExitMode] = useState<ExitMode>(reduced ? 'reduced' : 'normal');
  const [fog, setFog] = useState<string[]>([]);
  const finishedRef = useRef(false);
  const introStartRef = useRef(0);
  const caughtUpRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const { unlock, playSound, fadeOutAndStop, stopLater, toggleMute, muted, audioRunning } = useSound({
    eager: !reduced,
    enabled: !reduced,
  });

  // generate the fog textures once
  useEffect(() => {
    if (reduced) return;
    setFog(FOG_LAYERS.map((l) => makeFogTexture(l.seed)));
  }, [reduced]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  const finish = useCallback(
    (fast = false) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (fast) {
        setExitMode('fast');
        fadeOutAndStop(300);
      } else {
        stopLater(2300); // let the "arrive" chord and wind ring out
      }
      setVisible(false); // reveal: overlay fades out, AnimatePresence then calls complete()
      window.setTimeout(complete, fast ? 800 : reduced ? 1000 : 200); // safety net if the exit animation never reports back
    },
    [fadeOutAndStop, stopLater, complete, reduced]
  );

  const handleStart = useCallback(() => {
    if (launchingRef.current) return;
    launchingRef.current = true;
    unlock(); // must run inside the click/key press so the browser allows sound
    setLaunching(true);
    window.setTimeout(() => setStarted(true), LAUNCH_MS);
  }, [unlock]);

  // timeline: sounds + auto finish (starts when the intro starts)
  useEffect(() => {
    if (!autoPlay || !started) return;
    introStartRef.current = performance.now();
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (!reduced) {
      at(380, () => playSound('whoosh'));
      at(1400, () => playSound('impact'));
      at(2500, () => playSound('shimmer'));
      at(3700, () => playSound('warp'));
      at(4800, () => playSound('wind'));
      at(FINISH_MS, () => playSound('arrive'));
    }
    at(reduced ? 1200 : FINISH_MS, () => finish());
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [autoPlay, started, reduced, finish, playSound]);

  // starts the ambient bed once the intro is running AND audio is unlocked (immediately after the logo click, or a moment later if the browser is slow to resume)
  useEffect(() => {
    if (!started || !audioRunning || reduced || caughtUpRef.current) return;
    caughtUpRef.current = true;
    const elapsed = performance.now() - introStartRef.current;
    if (elapsed < FINISH_MS - 400) playSound('drone');
  }, [started, audioRunning, reduced, playSound]);

  const topInset = 'max(20px, env(safe-area-inset-top))';

  return (
    <AnimatePresence onExitComplete={complete} custom={exitMode}>
      {visible && (
        <motion.div
          key="nexora-intro"
          role="presentation"
          custom={exitMode}
          variants={rootVariants}
          initial={{ opacity: 1 }}
          exit="exit"
          className="nx-intro-container"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100dvh',
            // Fallback for browsers that don't support dvh
            minHeight: '100vh',
            background:
              'radial-gradient(ellipse at 50% 50%, #211044 0%, #130a2a 48%, #080313 100%)',
            zIndex: 9999,
            overflow: 'hidden',
            touchAction: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {!started ? (
            <StartGate reduced={reduced} launching={launching} onStart={handleStart} />
          ) : (
          <>
              {/* FIXED BACKGROUND: stays at screen size, never scales — outside the zoom camera */}
              <Backdrop reduced={reduced} />

              {/* CAMERA: only logos + tagline fly toward the viewer during the zoom */}
              <motion.div
                style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', willChange: 'transform, opacity' }}
                initial={{ scale: 1, opacity: 1 }}
                animate={reduced ? undefined : { scale: ZOOM_KEYS, opacity: [1, 1, 0] }}
                transition={{
                  scale: { delay: SCENE_S, duration: ZOOM_S, times: [0, 0.25, 0.5, 0.75, 1], ease: 'linear' },
                  opacity: { delay: SCENE_S, duration: ZOOM_S, times: [0, 0.6, 1], ease: 'linear' },
                }}
              >
                {/* impact flash + shockwave rings */}
                {!reduced && (
                  <>
                    <motion.div
                      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 50%, rgba(196,181,253,0.55), transparent 55%)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ delay: 1.4, duration: 0.7, ease: 'easeOut' }}
                    />
                    {[0, 0.18].map((d, i) => (
                      <div key={i} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <motion.div
                          style={{ width: 300, height: 300, borderRadius: '50%', border: '1.5px solid rgba(167,139,250,0.75)' }}
                          initial={{ scale: 0.2, opacity: 0 }}
                          animate={{ scale: 3.4, opacity: [0, 0.8, 0] }}
                          transition={{ delay: 1.4 + d, duration: 1.7, ease: 'easeOut' }}
                        />
                      </div>
                    ))}
                  </>
                )}

                {/* central purple glow */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <motion.div
                    style={{ width: 640, height: 640, maxWidth: '95vw', maxHeight: '95vw', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.38) 0%, transparent 65%)' }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.9, 0.45, 0.85, 0.5], scale: [0.8, 1.15, 1, 1.12, 1.05] }}
                    transition={{ duration: SCENE_S, delay: 0.3, ease: 'easeInOut' }}
                  />
                </div>

                {/* logos + tagline */}
                <div
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
                    {/* main logo with orbit rings */}
                    <motion.div
                      style={{ position: 'relative', width: MAIN_LOGO_W, flex: '0 0 auto', minWidth: 'clamp(160px, 28vw, 300px)' }}
                      animate={reduced ? undefined : { scale: [1, 1.035, 1] }}
                      transition={{ delay: 1.5, duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {!reduced && (
                        <>
                          <motion.div
                            style={{ position: 'absolute', inset: '-9%', borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'rgba(196,181,253,0.95)', borderRightColor: 'rgba(139,92,246,0.35)' }}
                            initial={{ opacity: 0, rotate: 0 }}
                            animate={{ opacity: 1, rotate: 360 }}
                            transition={{ opacity: { delay: 1.4, duration: 0.6 }, rotate: { repeat: Infinity, duration: 3.2, ease: 'linear' } }}
                          />
                          <motion.div
                            style={{ position: 'absolute', inset: '-18%', borderRadius: '50%', border: '1.5px solid transparent', borderBottomColor: 'rgba(167,139,250,0.7)', borderLeftColor: 'rgba(139,92,246,0.25)' }}
                            initial={{ opacity: 0, rotate: 0 }}
                            animate={{ opacity: 1, rotate: -360 }}
                            transition={{ opacity: { delay: 1.6, duration: 0.6 }, rotate: { repeat: Infinity, duration: 5.2, ease: 'linear' } }}
                          />
                        </>
                      )}
                      <motion.img
                        src={MAIN_LOGO}
                        alt="NEXORA logo"
                        draggable={false}
                        style={{ display: 'block', width: '100%', height: 'auto', filter: 'drop-shadow(0 0 26px rgba(139,92,246,0.6))' }}
                        initial={{ x: reduced ? 0 : 160, opacity: 0, scale: reduced ? 1 : 0.9 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: reduced ? 0 : 0.4, duration: reduced ? 0.5 : 1.0, ease: EASE }}
                      />
                    </motion.div>

                    {/* text logo with a light sweep clipped to the letters */}
                    <div style={{ position: 'relative', width: TEXT_LOGO_W, flex: '0 0 auto', minWidth: 'clamp(240px, 42vw, 540px)' }}>
                      <motion.img
                        src={TEXT_LOGO}
                        alt="NEXORA"
                        draggable={false}
                        style={{ display: 'block', width: '100%', height: 'auto' }}
                        initial={{ x: reduced ? 0 : -160, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: reduced ? 0 : 0.4, duration: reduced ? 0.5 : 1.0, ease: EASE }}
                      />
                      {!reduced && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            overflow: 'hidden',
                            WebkitMaskImage: `url("${TEXT_LOGO}")`,
                            maskImage: `url("${TEXT_LOGO}")`,
                            WebkitMaskSize: '100% 100%',
                            maskSize: '100% 100%',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                          }}
                        >
                          <motion.div
                            style={{ position: 'absolute', top: 0, left: 0, width: '45%', height: '100%', background: 'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.9) 50%, transparent 100%)' }}
                            initial={{ x: '-110%' }}
                            animate={{ x: '330%' }}
                            transition={{ delay: 2.1, duration: 1.2, ease: 'easeInOut' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {!reduced && (
                    <motion.p
                      style={{
                        marginTop: 34,
                        textAlign: 'center',
                        color: '#DDD6FE',
                        fontSize: 'clamp(10px, 1.4vw, 14px)',
                        fontFamily: 'var(--font-display, system-ui, sans-serif)',
                        fontWeight: 500,
                        textShadow: '0 0 12px rgba(139,92,246,0.6)',
                        letterSpacing: isMobileDevice ? '0.1em' : '0.3em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        padding: '0 clamp(4px, 2vw, 16px)',
                        boxSizing: 'border-box',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.3, duration: 1.4, ease: 'easeOut' }}
                    >
                      {TAGLINE}
                    </motion.p>
                  )}
                </div>
              </motion.div>

              {/* ===== FOG (3.8s - 6.2s): dark violet mist the camera flies into. NOT inside the camera ===== */}
              {!reduced && (
                <>
                  {/* deep violet haze: thickens while we fly in, thins out for the homepage */}
                  <motion.div
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, rgba(76,42,160,0.55) 0%, rgba(30,16,78,0.85) 55%, rgba(12,6,34,0.95) 100%)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.75, 0.9, 0.7, 0] }}
                    transition={{ delay: SCENE_S, duration: END_S - SCENE_S, times: [0, 0.25, 0.5, 0.72, 1], ease: 'linear' }}
                  />

                  {/* fog banks: 200% size + tiled so scaling/rotation never exposes a texture boundary; smooth edge fade prevents seams */}
                  {FOG_LAYERS.map((l, i) =>
                    fog[i] ? (
                      <motion.div
                        key={l.seed}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          pointerEvents: 'none',
                          // Use an edge-faded fog texture so the alpha goes to ZERO on every side
                          // while cover sizing keeps the fog plane fully covered during zoom.
                          // Do not replace this with a corner-only radial fade.
                          backgroundImage: `url(${fog[i]})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          transformOrigin: '50% 50%',
                          willChange: 'transform, opacity',
                          imageRendering: 'auto',
                        }}
                        initial={{ opacity: 0, scale: l.s0, rotate: 0 }}
                        animate={{ opacity: [0, l.peak, l.peak * 0.9, 0], scale: l.s1, rotate: l.rot }}
                        transition={{ delay: l.start, duration: END_S - l.start, ease: [0.4, 0, 0.9, 0.6], opacity: { delay: l.start, duration: END_S - l.start, times: [0, 0.3, 0.62, 1], ease: 'linear' } }}
                      />
                    ) : null
                  )}
                </>
              )}

              {/* progress bar removed - horizontal line artifact fix */}
              {!reduced && (
                <motion.div
                  style={{ position: 'absolute', left: 0, bottom: 0, height: 0, width: '100%', transformOrigin: 'left', background: 'linear-gradient(90deg, #6D28D9, #A78BFA, #C4B5FD)' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: FINISH_MS / 1000, ease: 'linear' }}
                />
              )}

              {/* tap-for-sound hint (only if the browser is still blocking audio) */}
              {SHOW_TAP_FOR_SOUND_HINT && !reduced && !audioRunning && !muted && (
                <motion.div
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 'max(28px, env(safe-area-inset-bottom))', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: '0.2em', pointerEvents: 'none' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.5, 1] }}
                  transition={{ delay: 0.8, duration: 2 }}
                >
                  TAP ANYWHERE FOR SOUND
                </motion.div>
              )}
            </>
          )}

          {/* mute toggle (top-left) */}
          {!reduced && started && (
            <button
              type="button"
              className="nx-mute-btn"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute intro sound' : 'Mute intro sound'}
              title={muted ? 'Unmute' : 'Mute'}
              style={{ ...glassButton, position: 'absolute', top: topInset, left: 20, padding: '8px 10px', zIndex: 2, display: 'flex' }}
            >
              <SoundIcon off={muted} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
