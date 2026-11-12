#!/usr/bin/env node
/**
 * apply-logo-start-v6.mjs  (run from the Nexora repo root, branch "Animation")
 *
 *   node apply-logo-start-v6.mjs
 *
 * Adds the "click the logo to start" screen in front of the intro:
 *   - black screen, faint violet stars, the NEXORA logo glowing with a slow professional pulse
 *   - the logo IS the button (real <button>, big tap area, pointer cursor, hover glow, keyboard Enter/Space works)
 *   - a typing-animation line under it: "> CLICK LOGO TO START EXPERIENCE_"  (says TAP on touch screens)
 *   - on click: logo flash, text fades, then logos (3.8s) -> fog zoom -> homepage, with the soundtrack starting
 *     at the same moment (the click unlocks audio in every browser, so sound is guaranteed)
 *
 * Requires v5 to be applied already (no ENTER screen present). Safe to run more than once.
 * Refuses to run unless the git branch is "Animation". Only edits src/components/intro/IntroAnimation.tsx
 */
import fs from 'fs';
import { execSync } from 'child_process';

const log = (m) => console.log(m);
const die = (m) => { console.error('ERROR: ' + m); process.exit(1); };

if (!fs.existsSync('package.json') || !fs.existsSync('src/components/intro')) {
  die('Run this from the Nexora repo root (package.json and src/components/intro must exist).');
}
let branch = '';
try { branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch { die('git not available'); }
if (branch !== 'Animation') die('Current branch is "' + branch + '". Run: git checkout Animation');

const ANIM = 'src/components/intro/IntroAnimation.tsx';
if (!fs.existsSync(ANIM)) die('Missing file: ' + ANIM);

const raw = fs.readFileSync(ANIM, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const doc = { text: raw.replace(/\r\n/g, '\n') };

if (doc.text.includes('NX_START_GATE_V6')) {
  log('IntroAnimation.tsx: logo start screen already installed - nothing to do.');
  if (fs.existsSync('apply-logo-start-v6.mjs')) log('(you can delete apply-logo-start-v6.mjs)');
  process.exit(0);
}
if (doc.text.includes('TAP_TO_ENTER') || doc.text.includes('BEST WITH HEADPHONES')) {
  die('The old ENTER screen is still in the file. Apply apply-auto-start-v5.mjs first (or restore the Animation branch).');
}

const swap = (label, from, to) => {
  const first = doc.text.indexOf(from);
  if (first === -1) die('Anchor not found for step "' + label + '". The file differs from what this script expects. Do not edit by hand, show me this error.');
  if (doc.text.indexOf(from, first + 1) !== -1) die('Anchor is not unique for step "' + label + '".');
  doc.text = doc.text.slice(0, first) + to + doc.text.slice(first + from.length);
  log('  patched: ' + label);
};

log('Patching IntroAnimation.tsx ...');

/* 1. settings */
swap('settings',
  'const SHOW_TAP_FOR_SOUND_HINT = true; // small "TAP ANYWHERE FOR SOUND" line, shown ONLY if the browser blocks autoplay audio. false = never show it\n',
  'const SHOW_TAP_FOR_SOUND_HINT = false; // the logo click already unlocks sound. true = also show a "TAP ANYWHERE FOR SOUND" line if the browser still blocks audio\n' +
  'const TYPING_DELAY_MS = 800; // wait before the instruction line starts typing\n' +
  'const TYPING_SPEED_MS = 55; // time per typed character (about 2 seconds for the whole line)\n' +
  'const LAUNCH_MS = 380; // length of the logo flash after the click, before the intro starts\n');

/* 2. the start screen components (inserted before the main component) */
const GATE_CODE = String.raw`/* NX_START_GATE_V6 - "click the logo to start" screen */
const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;

const GATE_CSS = [
  '.nx-gate-logo{-webkit-tap-highlight-color:transparent;outline:none}',
  '.nx-gate-halo{transition:filter .35s ease}',
  '.nx-gate-logo:hover .nx-gate-halo,.nx-gate-logo:focus-visible .nx-gate-halo{filter:brightness(1.7) saturate(1.2)}',
  '.nx-gate-logo:focus-visible{outline:2px solid rgba(196,181,253,.75);outline-offset:4px}',
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

  // Enter / Space also starts it (keyboard users)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.code !== 'Space') return;
      const el = e.target as HTMLElement | null;
      const btn = el && el.closest ? el.closest('button') : null;
      if (btn && !btn.classList.contains('nx-gate-logo')) return; // e.g. the Skip button handles its own key
      e.preventDefault();
      onStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <>
      <style>{GATE_CSS}</style>
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
        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(4px, 1.5vh, 16px)', padding: 24 }}
      >
        <motion.button
          type="button"
          className="nx-gate-logo"
          onClick={onStart}
          aria-label="Start NEXORA experience"
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px, 9vw, 80px)', background: 'transparent', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={launching ? { opacity: 1, scale: 1.25 } : { opacity: 1, scale: 1 }}
          transition={launching ? { duration: LAUNCH_MS / 1000, ease: 'easeIn' } : { duration: 1.2, ease: EASE }}
          whileHover={launching ? undefined : { scale: 1.06 }}
          whileTap={launching ? undefined : { scale: 0.96 }}
        >
          {/* soft breathing halo behind the logo */}
          <div className="nx-gate-halo" style={{ position: 'absolute', inset: '-6%', pointerEvents: 'none' }}>
            <motion.div
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(109,40,217,0.25) 38%, transparent 68%)' }}
              animate={{ scale: [1, 1.14, 1], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* one thin ring that expands and fades (sonar pulse) */}
          <motion.span
            style={{ position: 'absolute', inset: '14%', borderRadius: '50%', border: '1px solid rgba(196,181,253,0.55)', pointerEvents: 'none' }}
            animate={{ scale: [0.9, 1.45], opacity: [0.55, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut' }}
          />

          <motion.img
            src={MAIN_LOGO}
            alt=""
            draggable={false}
            style={{ position: 'relative', width: 'clamp(150px, 24vw, 250px)', height: 'auto', pointerEvents: 'none', userSelect: 'none' }}
            animate={
              launching
                ? { filter: 'drop-shadow(0 0 60px rgba(237,233,254,1)) brightness(1.8)' }
                : {
                    filter: [
                      'drop-shadow(0 0 14px rgba(139,92,246,0.45)) brightness(1)',
                      'drop-shadow(0 0 36px rgba(167,139,250,0.9)) brightness(1.12)',
                      'drop-shadow(0 0 14px rgba(139,92,246,0.45)) brightness(1)',
                    ],
                  }
            }
            transition={launching ? { duration: LAUNCH_MS / 1000, ease: 'easeOut' } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.button>

        <motion.div animate={{ opacity: launching ? 0 : 1 }} transition={{ duration: 0.2 }}>
          <TypingLine text={label} />
        </motion.div>
      </div>
    </>
  );
};

`;
swap('start screen components',
  '/**\n * Cinematic NEXORA intro (fixed overlay above the always-mounted <App />).',
  GATE_CODE + '/**\n * Cinematic NEXORA intro (fixed overlay above the always-mounted <App />).');

/* 3. state */
swap('state',
  '  const [visible, setVisible] = useState(true);\n',
  '  const gate = !reduced && autoPlay; // show the "click the logo" screen first\n' +
  '  const [started, setStarted] = useState(!gate);\n' +
  '  const [launching, setLaunching] = useState(false);\n' +
  '  const launchingRef = useRef(false);\n' +
  '  const [visible, setVisible] = useState(true);\n');

/* 4. sound unlock function is needed again */
swap('useSound destructure', 'const { playSound,', 'const { unlock, playSound,');

/* 5. start handler (the click unlocks the audio, then the intro starts after the flash) */
swap('start handler',
  '  // timeline: sounds + auto finish (starts when the intro starts)\n',
  '  const handleStart = useCallback(() => {\n' +
  '    if (launchingRef.current) return;\n' +
  '    launchingRef.current = true;\n' +
  '    unlock(); // must run inside the click/key press so the browser allows sound\n' +
  '    setLaunching(true);\n' +
  '    window.setTimeout(() => setStarted(true), LAUNCH_MS);\n' +
  '  }, [unlock]);\n\n' +
  '  // timeline: sounds + auto finish (starts when the intro starts)\n');

/* 6. timeline waits for the click; the ambient bed is started by the effect below */
swap('timeline start', '    if (!autoPlay) return;\n    introStartRef.current', '    if (!autoPlay || !started) return;\n    introStartRef.current');
swap('timeline drone', "      at(0, () => playSound('drone'));\n", '');
swap('timeline deps', '[autoPlay, reduced, finish, playSound]', '[autoPlay, started, reduced, finish, playSound]');
swap('ambient bed effect',
  "  // browsers may block sound until the first tap/click/key. If audio starts a moment late, bring in the ambient bed so it is never silent.\n" +
  "  useEffect(() => {\n" +
  "    if (!audioRunning || reduced || caughtUpRef.current) return;\n" +
  "    caughtUpRef.current = true;\n" +
  "    const elapsed = performance.now() - introStartRef.current;\n" +
  "    if (elapsed > 120 && elapsed < FINISH_MS - 400) playSound('drone');\n" +
  "  }, [audioRunning, reduced, playSound]);\n",
  "  // starts the ambient bed once the intro is running AND audio is unlocked (immediately after the logo click, or a moment later if the browser is slow to resume)\n" +
  "  useEffect(() => {\n" +
  "    if (!started || !audioRunning || reduced || caughtUpRef.current) return;\n" +
  "    caughtUpRef.current = true;\n" +
  "    const elapsed = performance.now() - introStartRef.current;\n" +
  "    if (elapsed < FINISH_MS - 400) playSound('drone');\n" +
  "  }, [started, audioRunning, reduced, playSound]);\n");

/* 7. JSX: show the start screen until the click, then the cinematic sequence */
swap('show start screen',
  "        >\n          <>\n              {/* CAMERA: everything in here flies toward the viewer during the zoom */}",
  "        >\n          {!started ? (\n            <StartGate reduced={reduced} launching={launching} onStart={handleStart} />\n          ) : (\n          <>\n              {/* CAMERA: everything in here flies toward the viewer during the zoom */}");
swap('close sequence',
  "            </>\n\n          {/* mute toggle (top-left) */}\n          {!reduced && (",
  "            </>\n          )}\n\n          {/* mute toggle (top-left) */}\n          {!reduced && started && (");

/* 8. safety checks before writing anything */
for (const need of ['NX_START_GATE_V6', 'const StartGate', 'const TypingLine', 'handleStart', 'LAUNCH_MS', 'TYPING_SPEED_MS']) {
  if (!doc.text.includes(need)) die('Check failed: "' + need + '" missing after patching. Nothing was written.');
}
for (const bad of ['TAP_TO_ENTER', 'BEST WITH HEADPHONES', 'Enter NEXORA']) {
  if (doc.text.includes(bad)) die('Check failed: leftover "' + bad + '". Nothing was written.');
}
const open = (doc.text.match(/<StartGate /g) || []).length;
if (open !== 1) die('Check failed: StartGate is used ' + open + ' times, expected 1. Nothing was written.');

fs.writeFileSync(ANIM, eol === '\r\n' ? doc.text.replace(/\n/g, '\r\n') : doc.text, 'utf8');
log('WROTE ' + ANIM);
log('\nDONE. Black screen + glowing clickable logo + typing line, then logos -> fog zoom -> homepage with sound.');
