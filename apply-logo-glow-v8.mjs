#!/usr/bin/env node
/**
 * apply-logo-glow-v8.mjs  (run from the Nexora repo root, branch "Animation")
 *
 *   node apply-logo-glow-v8.mjs
 *
 *   1. REMOVES the Skip button completely (button, prop, wiring).
 *   2. REMOVES everything behind the logo on the start screen: the purple disc (halo) and the thin circle
 *      that expands outward. Only the LOGO itself glows (a soft double glow that slowly pulses, brighter on hover).
 *
 * Requires v6 (the logo start screen) to be applied already. Safe to run more than once.
 * Refuses to run unless the git branch is "Animation".
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
if (branch !== 'Animation') die('Current branch is "' + branch + '". This script only runs on the Animation branch. Run: git checkout Animation');

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

if (a.text.includes('NX_LOGO_ONLY_V8')) {
  log('Already installed (logo-only glow, no Skip button) - nothing to do.');
  process.exit(0);
}
if (!a.text.includes('NX_START_GATE_V6')) die('The logo start screen (v6) is not in this branch. Nothing to patch.');
if (a.text.includes('NX_BLACK_GATE_V7')) die('A different variant (v7) is installed. Stop and tell me.');

log('Patching IntroAnimation.tsx ...');

swap(a, 'marker',
  '/* NX_START_GATE_V6 - "click the logo to start" screen */\n',
  '/* NX_START_GATE_V6 - "click the logo to start" screen */\n/* NX_LOGO_ONLY_V8 - only the logo glows (no disc, no circle behind it), no Skip button */\n');

/* 1. CSS: hover glow now applies to the logo button itself (the halo element no longer exists) */
swap(a, 'css base', "'.nx-gate-logo{-webkit-tap-highlight-color:transparent;outline:none}',", "'.nx-gate-logo{-webkit-tap-highlight-color:transparent;outline:none;transition:filter .35s ease}',");
swap(a, 'css halo rule 1', "  '.nx-gate-halo{transition:filter .35s ease}',\n", '');
swap(a, 'css hover', "  '.nx-gate-logo:hover .nx-gate-halo,.nx-gate-logo:focus-visible .nx-gate-halo{filter:brightness(1.7) saturate(1.2)}',\n",
  "  '.nx-gate-logo:hover,.nx-gate-logo:focus-visible{filter:brightness(1.3)}',\n");

/* 2. remove the purple disc (halo) AND the expanding circle, everything between the button opening and the logo image */
const startMarker = '          {/* soft breathing halo behind the logo */}\n';
const endMarker = '          <motion.img\n            src={MAIN_LOGO}';
const s = a.text.indexOf(startMarker);
const e = a.text.indexOf(endMarker);
if (s === -1 || e === -1 || e < s) die('Could not find the halo/ring block to remove. Nothing was written.');
const removed = a.text.slice(s, e);
if (!removed.includes('nx-gate-halo') || !removed.includes('one thin ring')) die('The block to remove is not what was expected. Nothing was written.');
a.text = a.text.slice(0, s) + a.text.slice(e);
log('  patched: purple disc and circle removed');

/* 3. stronger, cleaner glow on the logo itself */
swap(a, 'logo glow',
  "                    filter: [\n" +
  "                      'drop-shadow(0 0 14px rgba(139,92,246,0.45)) brightness(1)',\n" +
  "                      'drop-shadow(0 0 36px rgba(167,139,250,0.9)) brightness(1.12)',\n" +
  "                      'drop-shadow(0 0 14px rgba(139,92,246,0.45)) brightness(1)',\n" +
  "                    ],\n",
  "                    filter: [\n" +
  "                      'drop-shadow(0 0 8px rgba(167,139,250,0.55)) drop-shadow(0 0 22px rgba(139,92,246,0.45)) brightness(1)',\n" +
  "                      'drop-shadow(0 0 14px rgba(196,181,253,0.95)) drop-shadow(0 0 44px rgba(139,92,246,0.8)) brightness(1.15)',\n" +
  "                      'drop-shadow(0 0 8px rgba(167,139,250,0.55)) drop-shadow(0 0 22px rgba(139,92,246,0.45)) brightness(1)',\n" +
  "                    ],\n");

/* 4. remove the Skip button completely */
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

/* 5. checks before writing anything */
for (const bad of ['skipVisible', 'Skip intro', 'nx-gate-halo', 'one thin ring', 'soft breathing halo']) {
  if (a.text.includes(bad)) die('Check failed: leftover "' + bad + '" in IntroAnimation.tsx. Nothing was written.');
}
if (!a.text.includes('src={MAIN_LOGO}')) die('Check failed: the logo image is missing. Nothing was written.');

log('Patching IntroWrapper.tsx ...');
swap(w, 'wrapper prop', '<IntroAnimation autoPlay skipVisible onComplete={handleComplete} />', '<IntroAnimation autoPlay onComplete={handleComplete} />');
swap(w, 'wrapper comment', '(after its own timeline or Skip).', '(after its own timeline).');
if (w.text.includes('skipVisible')) die('Check failed: skipVisible still in IntroWrapper.tsx. Nothing was written.');

save(ANIM, a);
log('WROTE ' + ANIM);
save(WRAP, w);
log('WROTE ' + WRAP);
log('\nDONE. Only the logo glows (no disc, no circle). Skip button removed.');
