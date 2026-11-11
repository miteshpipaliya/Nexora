import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './IntroSoundController';

interface IntroAnimationProps {
  autoPlay?: boolean;
  skipVisible?: boolean;
  onComplete?: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const MAIN_LOGO = '/images/intro/NEXORA%20LOGO.png';
const TEXT_LOGO = '/images/intro/NEXORA%20TEXT%20LOGO.png';

/**
 * Cinematic NEXORA intro (fixed overlay above the always-mounted <App />).
 * Timeline: 0-0.9s logos slide in -> glow pulse -> ~3.2s fade out -> onComplete.
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
    window.setTimeout(complete, 1200);
  }, [stopAll, complete]);

  useEffect(() => {
    if (!autoPlay) return;
    const timers: number[] = [];
    if (!reduced) {
      timers.push(window.setTimeout(() => playSound('whoosh'), 150));
      timers.push(window.setTimeout(() => playSound('impact'), 900));
    }
    timers.push(window.setTimeout(finish, reduced ? 1200 : 3200));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [autoPlay, reduced, finish, playSound]);

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
