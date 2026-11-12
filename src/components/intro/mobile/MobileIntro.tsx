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

  // For reduced motion, skip the entrance animation and show logos immediately
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting' | 'done'>(
    'entering'
  );
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  // Timeline: reduced motion skips straight to visible then exits
  useEffect(() => {
    if (phase === 'entering') {
      if (reduced) {
        // Skip entrance, show immediately
        setPhase('visible');
        // Short hold then exit
        const t = setTimeout(() => setPhase('exiting'), 800);
        return () => clearTimeout(t);
      }

      // Main logo enters at 0s, text logo enters at 0.3s
      const t1 = setTimeout(() => setPhase('visible'), 1500); // hold after both logos visible
      const t2 = setTimeout(() => setPhase('exiting'), 2800); // start exit at ~2.8s
      const t3 = setTimeout(complete, 3400); // safety net
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [phase, reduced, complete]);

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

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {phase !== 'done' && (
        <motion.div
          key="nexora-mobile-intro"
          role="presentation"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.3 : 0.6, ease: 'easeOut' }}
          style={{
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
          }}
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
