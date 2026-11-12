#!/usr/bin/env node
/**
 * apply-auto-start-v5.mjs  (run from the Nexora repo root, branch "Animation")
 *
 *   node apply-auto-start-v5.mjs
 *
 * What it does:
 *   1. REMOVES the "ENTER" gate screen completely (button + "SOUND ON · BEST WITH HEADPHONES" text).
 *      The intro now starts by itself the moment the site opens: logos 3.8s -> fog zoom -> homepage lands.
 *   2. Turns the soundtrack on automatically:
 *        - the audio engine is created and resumed immediately on page load
 *        - if the browser still blocks sound (Chrome/Safari rule: no sound before a user gesture), the FIRST
 *          tap / click / key press / touch-release starts it instantly, with the ambient bed catching up
 *        - mobile fix: audio is also unlocked on touchend / pointerup / click (touchstart alone is not accepted by browsers)
 *   3. Deletes the old v4 script (it would put the ENTER screen back if it were ever run again).
 *
 * Safe to run more than once. Refuses to run unless the git branch is "Animation".
 * It only edits: src/components/intro/IntroAnimation.tsx and src/components/intro/IntroSoundController.tsx
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
const SOUND = 'src/components/intro/IntroSoundController.tsx';
for (const f of [ANIM, SOUND]) if (!fs.existsSync(f)) die('Missing file: ' + f);

/** read a file as LF text and remember its original line ending */
const load = (f) => {
  const raw = fs.readFileSync(f, 'utf8');
  return { eol: raw.includes('\r\n') ? '\r\n' : '\n', text: raw.replace(/\r\n/g, '\n') };
};
const save = (f, { eol, text }) => fs.writeFileSync(f, eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text, 'utf8');

/** replace exactly one occurrence of `from` (string) with `to`; die if the anchor is missing */
const swap = (doc, label, from, to) => {
  const first = doc.text.indexOf(from);
  if (first === -1) die('Anchor not found for step "' + label + '". The file differs from what this script expects. Do not edit by hand, show me this error.');
  if (doc.text.indexOf(from, first + 1) !== -1) die('Anchor is not unique for step "' + label + '".');
  doc.text = doc.text.slice(0, first) + to + doc.text.slice(first + from.length);
  log('  patched: ' + label);
};

/* ======================= IntroAnimation.tsx ======================= */
const a = load(ANIM);
const alreadyDone = !a.text.includes('TAP_TO_ENTER') && !a.text.includes('BEST WITH HEADPHONES');

if (alreadyDone) {
  log('IntroAnimation.tsx: already patched (no ENTER gate found) - skipping.');
} else {
  log('Patching IntroAnimation.tsx ...');

  // 1. settings constant: remove TAP_TO_ENTER, add the optional hint switch
  const lineStart = a.text.indexOf('const TAP_TO_ENTER = true;');
  if (lineStart === -1) die('TAP_TO_ENTER constant not found (expected "const TAP_TO_ENTER = true;").');
  const lineEnd = a.text.indexOf('\n', lineStart);
  a.text =
    a.text.slice(0, lineStart) +
    'const SHOW_TAP_FOR_SOUND_HINT = true; // small "TAP ANYWHERE FOR SOUND" line, shown ONLY if the browser blocks autoplay audio. false = never show it' +
    a.text.slice(lineEnd);
  log('  patched: settings constant');

  // 2. gate state
  swap(a, 'gate state',
    "  const gate = TAP_TO_ENTER && !reduced && autoPlay;\n\n  const [started, setStarted] = useState(!gate);\n",
    '');

  // 3. audio starts immediately
  swap(a, 'eager audio', 'eager: !gate && !reduced,', 'eager: !reduced,');
  swap(a, 'useSound destructure', 'const { unlock, playSound,', 'const { playSound,');
  swap(a, 'fog comment', '// generate the fog textures once (during the "tap to enter" screen)', '// generate the fog textures once');

  // 4. remove handleEnter
  swap(a, 'handleEnter removed',
    "  const handleEnter = () => {\n    unlock(); // must happen inside the click so the browser allows sound\n    setStarted(true);\n  };\n\n",
    '');

  // 5. timeline starts right away + remembers its start time
  swap(a, 'timeline start',
    "    if (!autoPlay || !started) return;\n    const timers: number[] = [];",
    "    if (!autoPlay) return;\n    introStartRef.current = performance.now();\n    const timers: number[] = [];");
  swap(a, 'timeline deps', '[autoPlay, started, reduced, finish, playSound]', '[autoPlay, reduced, finish, playSound]');

  // 6. start-time ref + late-unlock catch-up effect
  swap(a, 'start ref',
    "  const finishedRef = useRef(false);\n",
    "  const finishedRef = useRef(false);\n  const introStartRef = useRef(0);\n  const caughtUpRef = useRef(false);\n");
  swap(a, 'late-unlock catch-up',
    "  const topInset = 'max(20px, env(safe-area-inset-top))';\n",
    "  // browsers may block sound until the first tap/click/key. If audio starts a moment late, bring in the ambient bed so it is never silent.\n" +
    "  useEffect(() => {\n" +
    "    if (!audioRunning || reduced || caughtUpRef.current) return;\n" +
    "    caughtUpRef.current = true;\n" +
    "    const elapsed = performance.now() - introStartRef.current;\n" +
    "    if (elapsed > 120 && elapsed < FINISH_MS - 400) playSound('drone');\n" +
    "  }, [audioRunning, reduced, playSound]);\n\n" +
    "  const topInset = 'max(20px, env(safe-area-inset-top))';\n");

  // 7. remove the ENTER gate screen (button + headphones text) completely
  const gateStart = a.text.indexOf('{!started ? (');
  const seqMarker = '/* ---------------- the cinematic sequence ---------------- */';
  const seqIdx = a.text.indexOf(seqMarker);
  if (gateStart === -1 || seqIdx === -1) die('ENTER gate block not found in the JSX.');
  const fragIdx = a.text.indexOf('<>', seqIdx);
  if (fragIdx === -1) die('Could not find the opening fragment of the cinematic sequence.');
  a.text = a.text.slice(0, gateStart) + '<>' + a.text.slice(fragIdx + 2);
  log('  patched: ENTER gate screen removed');

  swap(a, 'close ternary',
    "            </>\n          )}\n\n          {/* mute toggle (top-left) */}",
    "            </>\n\n          {/* mute toggle (top-left) */}");
  swap(a, 'mute button', '{!reduced && started && (', '{!reduced && (');
  swap(a, 'sound hint switch', '{!reduced && !audioRunning && !muted && (', '{SHOW_TAP_FOR_SOUND_HINT && !reduced && !audioRunning && !muted && (');

  // 8. final safety checks
  for (const bad of ['TAP_TO_ENTER', 'handleEnter', 'setStarted', 'started', 'BEST WITH HEADPHONES', 'Enter NEXORA', '> ENTER', 'ENTER\n']) {
    if (a.text.includes(bad)) die('Leftover "' + bad.trim() + '" still present in IntroAnimation.tsx after patching. Nothing was written.');
  }
  save(ANIM, a);
  log('WROTE ' + ANIM);
}

/* ===================== IntroSoundController.tsx ==================== */
const s = load(SOUND);
if (s.text.includes('AUTOPLAY_UNLOCK_V5')) {
  log('IntroSoundController.tsx: already patched - skipping.');
} else {
  log('Patching IntroSoundController.tsx ...');

  swap(s, 'resume on create',
    "      ctx.onstatechange = sync;\n      sync();\n",
    "      ctx.onstatechange = sync;\n      sync();\n      // AUTOPLAY_UNLOCK_V5: try to start immediately (works wherever the browser allows autoplay audio)\n      if (ctx.state === 'suspended') {\n        ctx.resume().catch(() => {});\n      }\n");

  swap(s, 'gesture unlock',
    "    const events = ['pointerdown', 'keydown', 'touchstart'] as const;\n    events.forEach((e) => window.addEventListener(e, unlock, { once: true }));\n",
    "    // (touchstart alone is NOT accepted by mobile browsers, so touchend / pointerup / click are listened to as well)\n" +
    "    const events = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchstart', 'touchend'] as const;\n" +
    "    events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));\n");

  if (!s.text.includes("window.removeEventListener(e, unlock)")) die('Cleanup of the gesture listeners not found.');
  save(SOUND, s);
  log('WROTE ' + SOUND);
}

/* ===================== remove the old v4 script ==================== */
if (fs.existsSync('apply-intro-fix-v4.mjs')) {
  fs.rmSync('apply-intro-fix-v4.mjs');
  log('REMOVED apply-intro-fix-v4.mjs (it would bring the ENTER screen back)');
}

log('\nDONE. The intro now starts automatically. No ENTER button, no headphones text.');
