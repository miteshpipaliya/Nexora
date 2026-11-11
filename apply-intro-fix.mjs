#!/usr/bin/env node
/**
 * apply-intro-fix.mjs  -  NEXORA intro animation repair (run from the repo root)
 *   node apply-intro-fix.mjs
 * Idempotent: safe to run twice. Refuses to run unless the git branch is "Animation".
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const log = (m) => console.log(m);
const die = (m) => { console.error('ERROR: ' + m); process.exit(1); };

if (!fs.existsSync('package.json') || !fs.existsSync('src/components/intro')) {
  die('Run this from the Nexora repo root (package.json and src/components/intro must exist).');
}
let branch = '';
try { branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch { die('git not available'); }
if (branch !== 'Animation') die('Current branch is "' + branch + '". Run: git checkout Animation');

const FILES = {
  "IntroAnimation": "import React, { useCallback, useEffect, useRef, useState } from 'react';\nimport { motion, AnimatePresence } from 'motion/react';\nimport { useSound } from './IntroSoundController';\n\ninterface IntroAnimationProps {\n  autoPlay?: boolean;\n  skipVisible?: boolean;\n  onComplete?: () => void;\n}\n\nconst EASE = [0.16, 1, 0.3, 1] as const;\nconst MAIN_LOGO = '/images/intro/NEXORA%20LOGO.png';\nconst TEXT_LOGO = '/images/intro/NEXORA%20TEXT%20LOGO.png';\n\n/**\n * Cinematic NEXORA intro (fixed overlay above the always-mounted <App />).\n * Timeline: 0-0.9s logos slide in -> glow pulse -> ~3.2s fade out -> onComplete.\n * onComplete fires exactly once (after the fade-out, or via Skip).\n */\nexport const IntroAnimation: React.FC<IntroAnimationProps> = ({\n  autoPlay = true,\n  skipVisible = true,\n  onComplete,\n}) => {\n  const [visible, setVisible] = useState(true);\n  const finishedRef = useRef(false);\n  const completedRef = useRef(false);\n  const onCompleteRef = useRef(onComplete);\n  useEffect(() => {\n    onCompleteRef.current = onComplete;\n  }, [onComplete]);\n\n  const { playSound, stopAll } = useSound();\n\n  const reduced =\n    typeof window !== 'undefined' &&\n    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;\n\n  const complete = useCallback(() => {\n    if (completedRef.current) return;\n    completedRef.current = true;\n    onCompleteRef.current?.();\n  }, []);\n\n  const finish = useCallback(() => {\n    if (finishedRef.current) return;\n    finishedRef.current = true;\n    stopAll();\n    setVisible(false); // triggers the fade-out; AnimatePresence calls complete()\n    // Safety net: if the exit animation never reports back, still finish.\n    window.setTimeout(complete, 1200);\n  }, [stopAll, complete]);\n\n  useEffect(() => {\n    if (!autoPlay) return;\n    const timers: number[] = [];\n    if (!reduced) {\n      timers.push(window.setTimeout(() => playSound('whoosh'), 150));\n      timers.push(window.setTimeout(() => playSound('impact'), 900));\n    }\n    timers.push(window.setTimeout(finish, reduced ? 1200 : 3200));\n    return () => timers.forEach((t) => window.clearTimeout(t));\n  }, [autoPlay, reduced, finish, playSound]);\n\n  return (\n    <AnimatePresence onExitComplete={complete}>\n      {visible && (\n        <motion.div\n          key=\"nexora-intro\"\n          role=\"presentation\"\n          initial={{ opacity: 1 }}\n          exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeOut' } }}\n          style={{\n            position: 'fixed',\n            inset: 0,\n            background: '#000',\n            zIndex: 9999,\n            overflow: 'hidden',\n          }}\n        >\n          {/* ambient purple light */}\n          <div\n            style={{\n              position: 'absolute',\n              inset: 0,\n              background:\n                'radial-gradient(at 50% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 55%)',\n              pointerEvents: 'none',\n            }}\n          />\n\n          {/* centered purple glow pulse */}\n          <div\n            style={{\n              position: 'absolute',\n              inset: 0,\n              display: 'flex',\n              alignItems: 'center',\n              justifyContent: 'center',\n              pointerEvents: 'none',\n            }}\n          >\n            <motion.div\n              style={{\n                width: 480,\n                height: 480,\n                maxWidth: '90vw',\n                maxHeight: '90vw',\n                background:\n                  'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 65%)',\n              }}\n              initial={{ opacity: 0, scale: 0.8 }}\n              animate={{ opacity: [0, 0.9, 0.5], scale: [0.8, 1.1, 1] }}\n              transition={{ duration: 2.2, delay: 0.5, ease: 'easeInOut' }}\n            />\n          </div>\n\n          {/* logos */}\n          <div\n            style={{\n              position: 'absolute',\n              inset: 0,\n              display: 'flex',\n              flexWrap: 'wrap',\n              alignItems: 'center',\n              justifyContent: 'center',\n              gap: 24,\n              padding: 24,\n              pointerEvents: 'none',\n            }}\n          >\n            <motion.img\n              src={MAIN_LOGO}\n              alt=\"NEXORA logo\"\n              draggable={false}\n              style={{ width: 'min(200px, 40vw)', height: 'auto', maxWidth: '80vw' }}\n              initial={{ x: reduced ? 0 : 120, opacity: 0 }}\n              animate={{ x: 0, opacity: 1 }}\n              transition={{ duration: reduced ? 0.5 : 0.8, ease: EASE }}\n            />\n            <motion.img\n              src={TEXT_LOGO}\n              alt=\"NEXORA\"\n              draggable={false}\n              style={{ width: 'min(280px, 60vw)', height: 'auto', maxWidth: '80vw' }}\n              initial={{ x: reduced ? 0 : -120, opacity: 0 }}\n              animate={{ x: 0, opacity: 1 }}\n              transition={{ duration: reduced ? 0.5 : 0.8, ease: EASE }}\n            />\n          </div>\n\n          {skipVisible && (\n            <button\n              type=\"button\"\n              onClick={finish}\n              aria-label=\"Skip intro\"\n              title=\"Skip intro\"\n              style={{\n                position: 'absolute',\n                top: 'max(20px, env(safe-area-inset-top))',\n                right: 20,\n                background: 'rgba(0, 0, 0, 0.5)',\n                border: '1px solid rgba(255, 255, 255, 0.2)',\n                color: '#fff',\n                padding: '8px 16px',\n                borderRadius: 8,\n                fontSize: 14,\n                cursor: 'pointer',\n                zIndex: 2,\n                backdropFilter: 'blur(10px)',\n              }}\n            >\n              Skip\n            </button>\n          )}\n        </motion.div>\n      )}\n    </AnimatePresence>\n  );\n};\n",
  "IntroWrapper": "import React, { Component, useCallback, useState } from 'react';\nimport { IntroAnimation } from './IntroAnimation';\nimport App from '../../App';\n\n/**\n * Intro Wrapper\n * - <App /> is ALWAYS mounted (same tree before, during and after the intro,\n *   so React never remounts it).\n * - IntroAnimation is a fixed overlay above it; it is removed ONLY when it\n *   calls onComplete (after its own timeline or Skip).\n * - Plays once per browser tab session. Add ?intro=1 to the URL to force it.\n * - If the intro ever crashes, it is skipped and the site still loads.\n */\n\nconst STORAGE_KEY = 'introPlayed';\n\nconst shouldPlayIntro = (): boolean => {\n  try {\n    if (new URLSearchParams(window.location.search).get('intro') === '1') return true;\n  } catch {\n    /* ignore */\n  }\n  try {\n    return sessionStorage.getItem(STORAGE_KEY) !== 'true';\n  } catch {\n    return true;\n  }\n};\n\nclass IntroBoundary extends Component<\n  { onError: () => void; children: React.ReactNode },\n  { failed: boolean }\n> {\n  state = { failed: false };\n  static getDerivedStateFromError() {\n    return { failed: true };\n  }\n  componentDidCatch(error: unknown) {\n    console.error('[Intro] crashed, skipping intro:', error);\n    this.props.onError();\n  }\n  render() {\n    return this.state.failed ? null : this.props.children;\n  }\n}\n\nexport const IntroWrapper: React.FC = () => {\n  const [showIntro, setShowIntro] = useState<boolean>(shouldPlayIntro);\n\n  const handleComplete = useCallback(() => {\n    try {\n      sessionStorage.setItem(STORAGE_KEY, 'true');\n    } catch {\n      /* ignore */\n    }\n    setShowIntro(false);\n  }, []);\n\n  return (\n    <>\n      <App />\n      {showIntro && (\n        <IntroBoundary onError={handleComplete}>\n          <IntroAnimation autoPlay skipVisible onComplete={handleComplete} />\n        </IntroBoundary>\n      )}\n    </>\n  );\n};\n",
  "IntroSoundController": "import { useCallback, useEffect, useRef } from 'react';\n\n/**\n * Intro Sound Controller\n * Small Web Audio API sound effects for the intro. Never throws.\n */\n\nexport type IntroSoundType = 'whoosh' | 'impact' | 'atmospheric' | 'cinematic';\n\nexport const useSound = () => {\n  const ctxRef = useRef<AudioContext | null>(null);\n  const masterRef = useRef<GainNode | null>(null);\n\n  const ensureAudio = useCallback(() => {\n    if (ctxRef.current) return;\n    try {\n      const Ctor: typeof AudioContext | undefined =\n        window.AudioContext || (window as any).webkitAudioContext;\n      if (!Ctor) return;\n      const ctx = new Ctor();\n      const master = ctx.createGain();\n      master.gain.value = 0.1;\n      master.connect(ctx.destination);\n      ctxRef.current = ctx;\n      masterRef.current = master;\n    } catch {\n      /* Web Audio not available - intro stays silent */\n    }\n  }, []);\n\n  const stopAll = useCallback(() => {\n    const ctx = ctxRef.current;\n    ctxRef.current = null;\n    try {\n      masterRef.current?.disconnect();\n    } catch {\n      /* ignore */\n    }\n    masterRef.current = null;\n    if (ctx && ctx.state !== 'closed') {\n      try {\n        void ctx.close().catch(() => {});\n      } catch {\n        /* ignore */\n      }\n    }\n  }, []);\n\n  useEffect(() => {\n    ensureAudio();\n\n    // Browsers keep AudioContext suspended until a user gesture.\n    const resume = () => {\n      const ctx = ctxRef.current;\n      if (ctx && ctx.state === 'suspended') {\n        ctx.resume().catch(() => {});\n      }\n    };\n    const events = ['pointerdown', 'keydown', 'touchstart'] as const;\n    events.forEach((e) => window.addEventListener(e, resume, { once: true }));\n\n    return () => {\n      events.forEach((e) => window.removeEventListener(e, resume));\n      stopAll();\n    };\n  }, [ensureAudio, stopAll]);\n\n  const playSound = useCallback((type: IntroSoundType) => {\n    const ctx = ctxRef.current;\n    const master = masterRef.current;\n    if (!ctx || !master || ctx.state !== 'running') return;\n    try {\n      const now = ctx.currentTime;\n      const osc = ctx.createOscillator();\n      const env = ctx.createGain();\n      osc.type = 'sine';\n\n      switch (type) {\n        case 'whoosh':\n          osc.frequency.setValueAtTime(200, now);\n          osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);\n          break;\n        case 'impact':\n          osc.frequency.setValueAtTime(440, now);\n          osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);\n          break;\n        case 'atmospheric':\n          osc.frequency.setValueAtTime(110, now);\n          break;\n        case 'cinematic':\n          osc.frequency.setValueAtTime(150, now);\n          break;\n      }\n\n      env.gain.setValueAtTime(0.0001, now);\n      env.gain.exponentialRampToValueAtTime(1, now + 0.05);\n      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);\n\n      osc.connect(env);\n      env.connect(master);\n      osc.start(now);\n      osc.stop(now + 0.65);\n    } catch {\n      /* never let sound break the intro */\n    }\n  }, []);\n\n  return { playSound, stopAll };\n};\n"
};

// 1) intro files (full replacement)
for (const [name, content] of Object.entries(FILES)) {
  const p = path.join('src/components/intro', name + '.tsx');
  fs.writeFileSync(p, content, 'utf8');
  log('WROTE   ' + p);
}

// 2) main.tsx must render IntroWrapper
const mainP = 'src/main.tsx';
const mainSrc = fs.readFileSync(mainP, 'utf8');
if (!mainSrc.includes('IntroWrapper')) {
  fs.writeFileSync(mainP,
    "import {createRoot} from 'react-dom/client';\nimport {IntroWrapper} from './components/intro/IntroWrapper';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(<IntroWrapper />);\n", 'utf8');
  log('FIXED   src/main.tsx');
} else log('OK      src/main.tsx already renders IntroWrapper');

// 3) animate-spin-slow in index.css
const cssP = 'src/index.css';
let css = fs.readFileSync(cssP, 'utf8');
if (!css.includes('--animate-spin-slow')) {
  if (css.includes('@theme {')) {
    css = css.replace('@theme {', '@theme {\n  --animate-spin-slow: spin 12s linear infinite;');
    fs.writeFileSync(cssP, css, 'utf8');
    log('ADDED   --animate-spin-slow to src/index.css');
  } else log('SKIPPED index.css: no @theme block found');
} else log('OK      --animate-spin-slow already defined');

// 4) WebGL context-loss handler
const threeP = 'src/components/three/CosmicHeroObject.tsx';
if (fs.existsSync(threeP)) {
  let t = fs.readFileSync(threeP, 'utf8');
  if (!t.includes('webglcontextlost')) {
    const addAnchor = 'container.appendChild(renderer.domElement);';
    const disposeAnchor = 'renderer.dispose();';
    if (t.includes(addAnchor) && t.includes(disposeAnchor)) {
      t = t.replace(addAnchor, addAnchor +
        "\n    const handleContextLost = (event: Event) => {\n      event.preventDefault();\n      setWebGlSupported(false);\n    };\n    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);");
      const i = t.lastIndexOf(disposeAnchor);
      t = t.slice(0, i) + "renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);\n      " + t.slice(i);
      fs.writeFileSync(threeP, t, 'utf8');
      log('ADDED   webglcontextlost handler');
    } else log('SKIPPED WebGL handler: anchors not found');
  } else log('OK      webglcontextlost handler already present');
}

// 5) preload links in index.html
const htmlP = 'index.html';
let html = fs.readFileSync(htmlP, 'utf8');
if (!html.includes('NEXORA%20LOGO.png')) {
  html = html.replace('</head>',
    '    <link rel="preload" as="image" href="/images/intro/NEXORA%20LOGO.png" />\n    <link rel="preload" as="image" href="/images/intro/NEXORA%20TEXT%20LOGO.png" />\n  </head>');
  fs.writeFileSync(htmlP, html, 'utf8');
  log('ADDED   preload links to index.html');
} else log('OK      preload links already present');

// 6) compress logos (only if wider than 800px, so re-running is harmless)
try {
  const sharp = (await import('sharp')).default;
  for (const f of ['NEXORA LOGO.png', 'NEXORA TEXT LOGO.png']) {
    const p = path.join('public/images/intro', f);
    if (!fs.existsSync(p)) { log('MISSING ' + p); continue; }
    const before = fs.statSync(p).size;
    const meta = await sharp(p).metadata();
    if ((meta.width || 0) <= 800 && before < 300000) { log('OK      ' + f + ' already small (' + before + ' bytes)'); continue; }
    const buf = await sharp(p).resize({ width: 800, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
    fs.writeFileSync(p, buf);
    log('SHRUNK  ' + f + ': ' + before + ' -> ' + buf.length + ' bytes');
  }
} catch (e) { log('SKIPPED logo compression (sharp unavailable): ' + e.message); }

log('\nDONE. Next: npx tsc --noEmit ; npm run build ; then commit and push to origin Animation.');
