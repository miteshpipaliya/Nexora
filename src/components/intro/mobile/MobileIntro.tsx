import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileIntroProps {
  onComplete?: () => void;
}

// Logo assets - same as desktop, served from /images/intro/
const MAIN_LOGO = '/images/intro/NEXORA%20LOGO.png';
const TEXT_LOGO = '/images/intro/nexora-bvm-text-logo.png';

/**
 * MobileIntro
 * Lightweight, silent, ~2-3 second introduction for phones and tablets.
 *
 * Sequence:
 *   1. Dark NEXORA background fills the viewport
 *   2. Main logo slides down from above and fades in (~0.8s)
 *   3. Text logo slides down from above and fes in underneath (~0.8s, delayed 0.3s)
 *   4. Brief pause (~1s)
 *   5. Both logos fade out together (~0.5s)
 *   6. onComplete fires -> homepage revealed
 *
 * No sound, no fog, no zoom, no particles, no WebGL, no canvas loops.
 * Uses only CSS transform + opacity for GPU-friendly animation.
 */

export const MobileIntro: React.FC<MobileIntroProps> = ({ onComplete }) => {
  const reduced =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Track timeouts so they can be cleaned up on unmount
  const timeoutRefs = useRef<Set<number>>(new Set());
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting' | 'done'>(
    'entering'
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => window.clearTimeout(id));
      timeoutRefs.current.clear();
    };
  }, []);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  // Timeline: run exactly once at mount
  useEffect(() => {
    if (reduced) {
      // Reduced motion: show immediately, exit quickly
      setPhase('visible');
      const t = window.setTimeout(() => setPhase('exiting'), 800);
      timeoutRefs.current.add(t);
      return;
    }

    // Main logo enters at 0s, text logo enters at 0.3s
    // Hold visible for ~1.0s after logos settle
    // Exit starts at ~2.8s total (~0.8s exit)
    // Complete at ~3.4s total

    const t1 = window.setTimeout(() => setPhase('visible'), 1500);
    const t2 = window.setTimeout(() => setPhase('exiting'), 2800);
    const t3 = window.setTimeout(complete, 3400);

    timeoutRefs.current.add(t1);
    timeoutRefs.current.add(t2);
    timeoutRefs.current.add(t3);

    // Safety: if any timeout was already executed (bypassing refs),
    // ensure completion still fires
    const safetyTimer = window.setTimeout(() => {
      // Check if we've already moved past entering phase
      if (phase !== 'entering') {
        // Only complete if not already completed
        if (!completedRef.current) {
          complete();
        }
      }
    }, 4000);

    timeoutRefs.current.add(safetyTimer);
  }, [reduced, complete]);

  const onExitComplete = useCallback(() => {
    complete();
  }, [complete]);

  const logoStyle: React.CSSProperties = {
    position: 'relative',
    width: 'clamp(200px, 70vw, 320px)',
    height: 'auto',
    display: 'block',
    margin: '0 auto',
  };

  const textLogoStyle: React.CSSProperties = {
    position: 'relative',
    width: 'clamp(260px, 85vw, 420px)',
    height: 'auto',
    display: 'block',
    margin: '0 auto',
  };

  // NEXORA dark-purple background - animated subtle pulse for elegance
  const backgroundStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100dvh',
    minHeight: '100vh',
    background:
      'radial-gradient(ellipse at 50% 50%, rgba(109, 40, 217, 0.25) 0%, rgba(30, 16, 78, 0.7) 40%, rgba(8, 8, 13, 0.98) 100%)',
    zIndex: 9999,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(12px, 4vh, 24px)',
    touchAction: 'none',
    WebkitOverflowScrolling: 'touch',
  };

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {phase !== 'done' && (
        <motion.div
          key="nexora-mobile-intro"
          role="presentation"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.3 : 0.6, ease: 'easeOut' }}
          style={backgroundStyle}
        >
          {/* Main logo - enters from above */}
          <motion.div
            initial={{
              y: reduced ? 0 : -40,
              opacity: reduced ? 1 : 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            transition={{
              duration: reduced ? 0 : 0.8,
              ease: [0.16, 1, 0.3, 1],
              delay: reduced ? 0 : 0,
            }}
            style={{ ...logoStyle, pointerEvents: 'none' }}
          >
            <img
              src={MAIN_LOGO}
              alt="NEXORA"
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                userSelect: 'none',
                filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.4))',
              }}
            />
          </motion.div>

          {/* Text logo - enters underneath with slight delay */}
          <motion.div
            initial={{
              y: reduced ? 0 : -40,
              opacity: reduced ? 1 : 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            transition={{
              duration: reduced ? 0 : 0.8,
              ease: [0.16, 1, 0.3, 1],
              delay: reduced ? 0 : 0.3,
            }}
            style={{ ...textLogoStyle, pointerEvents: 'none' }}
          >
            <img
              src={TEXT_LOGO}
              alt="NEXORA"
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                userSelect: 'none',
                filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.4))',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
