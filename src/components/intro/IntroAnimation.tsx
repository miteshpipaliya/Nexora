import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './IntroSoundController';

interface IntroAnimationProps {
  autoPlay?: boolean;
  skipVisible?: boolean;
  onComplete?: () => void;
}

/**
 * Cinematic NEXORA Intro Animation
 * Premium opening sequence with:
 * - Black background with subtle purple ambient lighting
 * - Main logo entering from right, text logo from left
 * - Synchronized purple pulse and reveal
 * - Seamless handoff to homepage
 * - Sound effects via Web Audio API
 * - Skip intro and reduced-motion support
 */
export const IntroAnimation: React.FC<IntroAnimationProps> = ({ autoPlay = true, skipVisible = true, onComplete }) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const done = useRef(false);

  const [showHomepage, setShowHomepage] = useState(false);
  const refs = {
    mainLogoRef: useRef<HTMLImageElement>(null),
    textLogoRef: useRef<HTMLImageElement>(null),
    containerRef: useRef<HTMLDivElement>(null),
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { playSound, stopAll } = useSound();

  const slideRight = {
    hidden: { x: '100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  const slideLeft = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  useEffect(() => {
    if (!autoPlay || showHomepage) return;

    const whooshTimeout = setTimeout(() => {
      playSound('whoosh');
    }, 150);

    const impactTimeout = setTimeout(() => {
      playSound('impact');
    }, 900);

    const sequenceTimeout = setTimeout(() => {
      finish();
    }, 4000);

    return () => {
      clearTimeout(whooshTimeout);
      clearTimeout(impactTimeout);
      clearTimeout(sequenceTimeout);
    };
  }, [autoPlay, showHomepage]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    stopAll();
    onCompleteRef.current?.();
    setShowHomepage(true);
  }, []);

  

  const handleSkip = () => {
    stopAll();
    setShowHomepage(true);
    onComplete?.();
  };

  if (showHomepage) {
    return null;
  }

  return (
    <div
      ref={refs.containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#000',
        zIndex: 9999,
        overflow: 'hidden',
        ...(prefersReducedMotion && {
          transition: 'opacity 0.5s ease',
          background: '#000',
        }),
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(at 50% 0%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <motion.img
        ref={refs.mainLogoRef}
        src='/images/intro/NEXORA%20LOGO.png'
        style={{
          maxWidth: '80vw',
          height: 'auto',
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          pointerEvents: 'none',
        }}
        variants={slideRight}
        initial="hidden"
        animate="visible"
      />

      <motion.img
        ref={refs.textLogoRef}
        src='/images/intro/NEXORA%20TEXT%20LOGO.png'
        style={{
          maxWidth: '80vw',
          height: 'auto',
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          pointerEvents: 'none',
        }}
        variants={slideLeft}
        initial="hidden"
        animate="visible"
      />

      {showHomepage && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(at 50% 0%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)',
              pointerEvents: 'none',
              opacity: 0,
              transition: { duration: 0.7, opacity: [0, 0.9, 0.5], scale: [0.8, 1.1, 1] },
            }}
          />
        )}

      {skipVisible && !prefersReducedMotion && (
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            zIndex: 9999,
            backdropFilter: 'blur(10px)',
            transition: 'background 0.2s',
          }}
          title="Skip intro"
        >
          Skip
        </button>
      )}

      {skipVisible && window.innerWidth < 768 && !prefersReducedMotion && (
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            zIndex: 9999,
            backdropFilter: 'blur(10px)',
            transition: 'background 0.2s',
          }}
          title="Skip intro"
        >
          Skip
        </button>
      )}
    </div>
  );
};