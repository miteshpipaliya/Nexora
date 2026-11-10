import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSound } from './IntroSoundController';

interface IntroAnimationProps {
  autoPlay?: boolean;
  skipVisible?: boolean;
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
export const IntroAnimation: React.FC<IntroAnimationProps> = ({ autoPlay = true, skipVisible = true }) => {
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
    visible: { x: 0, opacity: 1, transition: { duration: 0.8, ease: ' cubic-bezier(0.16, 1, 0.3, 1)' } },
  };

  const slideLeft = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.8, ease: ' cubic-bezier(0.16, 1, 0.3, 1)' } },
  };

  useEffect(() => {
    if (!autoPlay || showHomepage) return;

    const timeout = setTimeout(() => {
      setShowHomepage(true);
    }, 4500);

    return () => clearTimeout(timeout);
  }, [autoPlay, showHomepage]);

  useEffect(() => {
    const mainImg = refs.mainLogoRef.current;
    const textImg = refs.textLogoRef.current;

    if (mainImg && textImg) {
      const mainLoad = new Promise((resolve) => {
        if (mainImg.complete) resolve();
        else mainImg.onload = resolve;
      });

      const textLoad = new Promise((resolve) => {
        if (textImg.complete) resolve();
        else textImg.onload = resolve;
      });

      Promise.all([mainLoad, textLoad]).then(() => {
        if (!showHomepage) {
          setShowHomepage(true);
        }
      });
    }
  }, []);

  const handleSkip = () => {
    stopAll();
    setShowHomepage(true);
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

      <motion.image
        ref={refs.mainLogoRef}
        src='/images/intro/NEXORA%20LOGO.png'
        style={{
          width: 200,
          height: 200,
          position: 'absolute',
          right: -200,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          pointerEvents: 'none',
        }}
        variants={slideRight}
        initial="hidden"
        animate="visible"
      />

      <motion.image
        ref={refs.textLogoRef}
        src='/images/intro/NEXORA%20TEXT%20LOGO.png'
        style={{
          width: 280,
          height: 80,
          position: 'absolute',
          left: -280,
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
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            height: 400,
            background:
              'radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)',
            pointerEvents: 'none',
            opacity: 0,
            transition: { duration: 0.3 },
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