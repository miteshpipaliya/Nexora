#!/usr/bin/env node
/**
 * apply-black-noskip-v7.mjs  (run from the Nexora repo root, branch "anitest")
 *
 *   node apply-black-noskip-v7.mjs
 *
 *   1. REMOVES the Skip button completely (button, prop, wiring).
 *   2. Makes the "click the logo" screen PURE BLACK: no violet haze, no stars, no expanding ring.
 *      Only the NEXORA logo glows (breathing halo + pulsing glow), plus the typing instruction line.
 *
 * Requires v6 (the logo start screen) to be applied already. Safe to run more than once.
 * Refuses to run unless the git branch is "anitest" (so Animation and main are never touched).
 * Edits: src/components/intro/IntroAnimation.tsx and src/components/intro/IntroWrapper.tsx
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
if (branch !== 'anitest') die('Current branch is "' + branch + '". This script only runs on the anitest branch. Run: git checkout anitest');

const ANIM = 'src/components/intro/IntroAnimation.tsx';
const WRAP = 'src/components/intro/IntroWrapper.tsx';
for (const f of [ANIM, WRAP]) if (!fs.existsSync(f)) die('Missing file: ' + f);

const load = (f) => {
  const raw = fs.readFileSync(f, 'utf8');
  return { eol: raw.includes('\r\n') ? '\r\n' : '\n', text: raw.replace(/\r\n/g, '\n') };
};
const save = (f, d) => fs.writeFileSync(f, d.eol === '\r\n' ? d.text.replace(/\n/g, '\r\n') : d.text, 'utf8');
const swap = (doc, label, from, to) => {
  const first = doc.text.indexOf(from);
  if (first === -1) die('Anchor not found for step "' + label + '". The file differs from what this script expects. Do not edit by hand, show me this error.');
  if (doc.text.indexOf(from, first + 1) !== -1) die('Anchor is not unique for step "' + label + '".');
  doc.text = doc.text.slice(0, first) + to + doc.text.slice(first + from.length);
  log('  patched: ' + label);
};

const a = load(ANIM);
const w = load(WRAP);

if (a.text.includes('NX_BLACK_GATE_V7')) {
  log('Already installed (pure black start screen, no Skip button) - nothing to do.');
  process.exit(0);
}
if (!a.text.includes('NX_START_GATE_V6')) die('The logo start screen (v6) is not in this branch. Create anitest from the Animation branch after v6 was committed.');

log('Patching IntroAnimation.tsx ...');

/* marker */
swap(a, 'marker',
  '/* NX_START_GATE_V6 - "click the logo to start" screen */\n',
  '/* NX_START_GATE_V6 - "click the logo to start" screen */\n/* NX_BLACK_GATE_V7 - pure black background (only the logo glows), no Skip button */\n');

/* 1. pure black start screen: remove the violet haze + stars, and the expanding ring */
swap(a, 'black background',
  '      <style>{GATE_CSS}</style>\n      <Backdrop reduced={reduced} />\n',
  '      <style>{GATE_CSS}</style>\n');
swap(a, 'remove ring',
  "          {/* one thin ring that expands and fades (sonar pulse) */}\n" +
  "          <motion.span\n" +
  "            style={{ position: 'absolute', inset: '14%', borderRadius: '50%', border: '1px solid rgba(196,181,253,0.55)', pointerEvents: 'none' }}\n" +
  "            animate={{ scale: [0.9, 1.45], opacity: [0.55, 0] }}\n" +
  "            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut' }}\n" +
  "          />\n\n",
  '');

/* 2. remove the Skip button completely */
swap(a, 'remove Skip button',
  "\n          {/* skip (top-right) */}\n" +
  "          {skipVisible && (\n" +
  "            <button\n" +
  "              type=\"button\"\n" +
  "              onClick={() => finish(true)}\n" +
  "              aria-label=\"Skip intro\"\n" +
  "              title=\"Skip intro\"\n" +
  "              style={{ ...glassButton, position: 'absolute', top: topInset, right: 20, zIndex: 2 }}\n" +
  "            >\n" +
  "              Skip\n" +
  "            </button>\n" +
  "          )}\n",
  '');
swap(a, 'remove skipVisible type', '  skipVisible?: boolean;\n', '');
swap(a, 'remove skipVisible default', '  skipVisible = true,\n', '');
swap(a, 'keyboard comment', ' // e.g. the Skip button handles its own key', ' // e.g. the mute button handles its own key');

for (const bad of ['skipVisible', 'Skip intro', '>Skip<', 'Skip\n']) {
  if (a.text.includes(bad)) die('Check failed: leftover "' + bad.trim() + '" in IntroAnimation.tsx. Nothing was written.');
}
if ((a.text.match(/<Backdrop /g) || []).length !== 1) die('Check failed: expected exactly one <Backdrop> (the one inside the cinematic sequence). Nothing was written.');

log('Patching IntroWrapper.tsx ...');
swap(w, 'wrapper prop', '<IntroAnimation autoPlay skipVisible onComplete={handleComplete} />', '<IntroAnimation autoPlay onComplete={handleComplete} />');
swap(w, 'wrapper comment', '(after its own timeline or Skip).', '(after its own timeline).');
if (w.text.includes('skipVisible')) die('Check failed: skipVisible still in IntroWrapper.tsx. Nothing was written.');

save(ANIM, a);
log('WROTE ' + ANIM);
save(WRAP, w);
log('WROTE ' + WRAP);
log('\nDONE. Start screen is pure black with only the glowing logo. Skip button removed.');
