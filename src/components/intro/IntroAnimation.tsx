import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './IntroSoundController';
import * as THREE from 'three';

interface IntroAnimationProps {
  autoPlay?: boolean;
  skipVisible?: boolean;
  onComplete?: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const MAIN_LOGO = '/images/intro/NEXORA%20LOGO.png';
const TEXT_LOGO = '/images/intro/nexora-bvm-text-logo.png';

/**
 * Cinematic NEXORA intro (fixed overlay above the always-mounted <App />).
 * Timeline:
 * Phase A: 0-3.8s - Both logos, atmospheric glow, particles, sync with sound
 * Phase B: 3.8-5.0s - Earth-entry zoom with procedural cloud layers
 * Phase C: 5.0-6.2s - Homepage reveal, smooth opacity transition
 * onComplete fires exactly once (after the fade-out, or via Skip).
 */
export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  autoPlay = true,
  skipVisible = true,
  onComplete,
}) => {
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const PhaseBZoomEnd = 5000;
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const { playSound, stopAll } = useSound();

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

  useEffect(() => {
    if (!autoPlay) return;
    const timers: number[] = [];
    const Reduced = reduced ? 1200 : 3800;
    const PhaseBStart = 3800;

    if (!reduced) {
      // 0s: atmospheric drone start
      timers.push(window.setTimeout(() => playSound('atmospheric'), 0));
      // 150ms: logo whoosh
      timers.push(window.setTimeout(() => playSound('whoosh'), 150));
      // 900ms: cinematic impact
      timers.push(window.setTimeout(() => playSound('impact'), 900));
      // 3.8s: transition whoosh start
      timers.push(window.setTimeout(() => playSound('whoosh'), PhaseBStart));
      // 5.0s: arrival fade
      timers.push(window.setTimeout(() => playSound('cinematic'), PhaseBZoomEnd));
    } else {
      // Reduced-motion: simplified audio
      timers.push(window.setTimeout(() => playSound('atmospheric'), 0));
      timers.push(window.setTimeout(() => playSound('whoosh'), 150));
      timers.push(window.setTimeout(complete, Reduced));
    }

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [autoPlay, reduced, playSound, complete]);

  // ── Phase B: Three.js Earth-entry zoom (3.8–5.0s) ──
  useEffect(() => {
    if (!autoPlay) return;
    const reduced = typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // skip 3D phase in reduced-motion mode

    let mounted = true;
    const startTime = performance.now();

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
        const t = Math.min(1, (currentTime - startTime) / 6200);
        camera.position.z = 300 * (1 - t * 2); // Move from 300 to -300

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
