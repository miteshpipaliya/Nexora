import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './IntroSoundController';

interface IntroAnimationProps {
  autoPlay?: boolean;
  skipVisible?: boolean;
  onComplete?: () => void;
}

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './IntroSoundController';

interface IntroAnimationProps {
  autoPlay?: boolean;
  skipVisible?: boolean;
  onComplete?: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const MAIN_LOGO = '/images/intro/NEXORA%20LOGO.png';
const TEXT_LOGO = '/images/intro/nexora-bvm-text-logo.png';

/** Cinematic fog keyframes defined in index.css @keyframes */

export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  autoPlay = true,
  skipVisible = true,
  onComplete,
}) => {
  // ... (complete implementation)
};
const MAIN_LOGO = '/images/intro/NEXORA%20LOGO.png';
const TEXT_LOGO = '/images/intro/nexora-bvm-text-logo.png';

/**
 * Cinematic NEXORA intro animation.
* Fixed overlay above the always-mounted <App />.
 
 * Timeline:
 * Phase A: 0-3.8s - Both logos, atmospheric glow, particles, sync with sound
 * Phase B: 3.8-5.0s - Cinematic fog zoom
 * Phase C: 5.0-6.2s - Homepage reveal, smooth opacity transition
 * onComplete fires exactly once (after the fade-out, or via Skip).
 */
*
*
*
*
*
*
*

*
*
*
*
*
 \n
 
export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  autoPlay = true,
  skipVisible = true,
  onComplete,
}) => {
  
  const finishedRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const { playSound, stopAll } = useSound();

  // Intro animation implementation
  // Phase A: Logo introduction (0-3.8s)
  // Phase B: CSS fog zoom (3.8-5.0s)  
  // Phase C: Homepage reveal (5.0-6.2s)

  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (!autoPlay) return;

    let mounted = true;
    const phaseBTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setPhase('exit');
    }, 3800);

    const skipHandler = () => {
      if (!mounted) return;
      setPhase('exit');
    };

    return () => {
      mounted = false;
      window.clearTimeout(phaseBTimeout);
    };
  }, [setPhase]);

  useEffect(() => {
    if (phase === 'exit' && !reduced) {
      const exitTimeout = window.setTimeout(() => {
        if (!finishedRef.current) return;
        finish();
      }, 1200);
      return () => window.clearTimeout(exitTimeout);
    }
  }, [phase, reduced, finish]);

  useEffect(() => {
    if (reduced && phase === 'enter') {
      setPhase('exit');
    }
  }, [reduced, phase]);

  const reduced =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopAll();
    setVisible(false); // triggers the fade-out; AnimatePresence calls complete()
    // Safety net: if the exit animation never reports back, still finish.
    window.setTimeout(complete, 6200);
  }, [stopAll, complete]);

  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (!autoPlay) return;

    let mounted = true;
    const phaseBTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setPhase('exit');
    }, 3800);

    const skipHandler = () => {
      if (!mounted) return;
      setPhase('exit');
    };

    return () => {
      mounted = false;
      window.clearTimeout(phaseBTimeout);
    };
  }, [setPhase]);

  useEffect(() => {
    if (phase === 'exit' && !reduced) {
      const exitTimeout = window.setTimeout(() => {
        if (!finishedRef.current) return;
        finish();
      }, 1200);
      return () => window.clearTimeout(exitTimeout);
    }
  }, [phase, reduced, finish]);

  useEffect(() => {
    if (reduced && phase === 'enter') {
      setPhase('exit');
    }
  }, [reduced, phase]);

  // ── Phase B: Three.js Earth-entry zoom (3.8–5.0s) ──
  useEffect(() => {
    if (!autoPlay) return;
    const reduced = typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (!autoPlay) return;

    let mounted = true;
    const phaseBTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setPhase('exit');
    }, 3800);

    const skipHandler = () => {
      if (!mounted) return;
      setPhase('exit');
    };

    return () => {
      mounted = false;
      window.clearTimeout(phaseBTimeout);
    };
  }, [setPhase]);

  useEffect(() => {
    if (phase === 'exit' && !reduced) {
      const exitTimeout = window.setTimeout(() => {
        if (!finishedRef.current) return;
        finish();
      }, 1200);
      return () => window.clearTimeout(exitTimeout);
    }
  }, [phase, reduced, finish]);

  useEffect(() => {
    if (reduced && phase === 'enter') {
      setPhase('exit');
    }
  }, [reduced, phase]);
    const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (!autoPlay) return;

    let mounted = true;
    const phaseBTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setPhase('exit');
    }, 3800);

    const skipHandler = () => {
      if (!mounted) return;
      setPhase('exit');
    };

    return () => {
      mounted = false;
      window.clearTimeout(phaseBTimeout);
    };
  }, [setPhase]);

  useEffect(() => {
    if (phase === 'exit' && !reduced) {
      const exitTimeout = window.setTimeout(() => {
        if (!finishedRef.current) return;
        finish();
      }, 1200);
      return () => window.clearTimeout(exitTimeout);
    }
  }, [phase, reduced, finish]);

  useEffect(() => {
    if (reduced && phase === 'enter') {
      setPhase('exit');
    }
  }, [reduced, phase]);

    // Create canvas for the earth-entry effect
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.zIndex = '9998';
    canvas.style.pointerEvents = 'none';
    canvas.style.top = '0';
    canvas.style.left = '0';
    document.body.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let animId: number;
    let phaseStart = startTime;
      const earth = new THREE.Mesh(new THREE.SphereGeometry(150, 64, 64), new THREE.MeshPhysicalMaterial({ color: 0x2c3e50, roughness: 0.3, metalness: 0.1, opacity: 0.9, transparent: true, depthWrite: false }));
      earth.position.set(0, 0, -300);
      scene.add(earth);

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.pointerEvents = 'none';
      canvas.appendChild(renderer.domElement);

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(45, 640 / 640, 0.1, 100);

      // Cloud layer parameters
      const cloudCount = 50;
      const clouds: THREE.Mesh[] = [];

        const speed = Math.random() * 0.02 + 0.005;
      earth.position.set(0, 0, -300);
      scene.add(earth);

      // Atmosphere layer
      const atmosphereGeometry = new THREE.SphereGeometry(155, 32, 32);
      const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x3498db,
        opacity: 0.3,
        transparent: true,
        depthWrite: false,
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      atmosphere.position.set(0, 0, -300);
      scene.add(atmosphere);

      // Light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 100, 100);
      scene.add(directionalLight);

      // Animation loop
      const targetTime = startTime + 6200; // 6.2 seconds
      let currentTime = startTime;

      const animate = () => {
        if (!mounted) return;
        currentTime = performance.now();
        const delta = Math.min(elapsed, 6200) / 6200;

        // Cloud movement - create depth parallax
        clouds.forEach((layer, i) => {
          mesh.position.z -= 0.02 * delta;
          mesh.position.x += (Math.sin(i * 0.5 + currentTime * 0.001) * 0.5) * delta;
          mesh.position.y += (Math.cos(i * 0.3 + currentTime * 0.001) * 0.5) * delta;

          // Wrap clouds around
          if (mesh.position.z < -160) {
            mesh.position.set(160 * Math.sin(phi) * Math.cos(theta), 160 * Math.sin(phi) * Math.sin(theta), 160 * Math.cos(phi));
            mesh.position.x = (Math.random() - 0.5) * 640;
            mesh.position.y = (Math.random() - 0.5) * 640;
          }

          const scaledSize = layer.size * (1 - layer.z / 400);
          const opacity = layer.alpha * (1 - layer.z / 400);

          // Draw cloud (simple circle for prototype)
          renderer.domElement.style.background = `rgba(255, 255, 255, ${opacity})`;
        });

        // Earth rotation
        earth.rotation.y += delta * 0.1;

        // Atmosphere glow
        atmosphere.rotation.y -= delta * 0.05;

        // Camera zoom - start far and move closer
        // Camera zoom - start far and move closer
        const t = Math.min(1, (currentTime - startTime) / 6200);
        camera.position.z = THREE.MathUtils.lerp(200, -150, t);

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };

      animate();

      // On complete - stop after 1.2s
      const totalDuration = 6200;
      const checkComplete = () => {
        if (!mounted) return;
        if (performance.now() >= endTime) {
          cancelAnimationFrame(animId);
          document.body.removeChild(canvas);
          finish();
        } else {
          requestAnimationFrame(checkComplete);
        }
      };
      checkComplete();
    } catch (e) {
      console.error('[Intro] Earth-entry scene error:', e);
      if (!mounted) return;
      document.body.removeChild(canvas);
      finish();
    }

    return () => {
      mounted = false;
      if (animId) cancelAnimationFrame(animId);
      if (renderer) renderer.dispose();
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [autoPlay, reduced, finish, PhaseBZoomEnd]);

  return (
    <AnimatePresence onExitComplete={complete}>
      {visible && (
        <motion.div
          key="nexora-intro"
          role="presentation"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeOut' } }}
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* ambient purple light */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(at 50% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 55%)',
              pointerEvents: 'none',
            }}
          />

          {/* centered purple glow pulse */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              style={{
                width: 480,
                height: 480,
                maxWidth: '90vw',
                maxHeight: '90vw',
                background:
                  'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 65%)',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.9, 0.5], scale: [0.8, 1.1, 1] }}
              transition={{ duration: 2.2, delay: 0.5, ease: 'easeInOut' }}
            />
          </div>

          {/* logos */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              padding: 24,
              pointerEvents: 'none',
            }}
          >
            <motion.img
              src={MAIN_LOGO}
              alt="NEXORA logo"
              draggable={false}
              style={{ width: 'min(200px, 40vw)', height: 'auto', maxWidth: '80vw' }}
              initial={{ x: reduced ? 0 : 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: reduced ? 0.5 : 0.8, ease: EASE }}
            />
            <motion.img
              src={TEXT_LOGO}
              alt="NEXORA"
              draggable={false}
              style={{ width: 'min(280px, 60vw)', height: 'auto', maxWidth: '80vw' }}
              initial={{ x: reduced ? 0 : -120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: reduced ? 0.5 : 0.8, ease: EASE }}
            />
          </div>

          {skipVisible && (
            <button
              type="button"
              onClick={finish}
              aria-label="Skip intro"
              title="Skip intro"
              style={{
                position: 'absolute',
                top: 'max(20px, env(safe-area-inset-top))',
                right: 20,
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                zIndex: 2,
                backdropFilter: 'blur(10px)',
              }}
            >
              Skip
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
