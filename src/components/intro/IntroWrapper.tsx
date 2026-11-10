import React, { useEffect, useRef, useState } from 'react';
import { IntroAnimation } from './IntroAnimation';
import App from '../../App';

/**
 * Intro Wrapper
 * 
 * Architecture:
 * - <App /> is ALWAYS mounted and visible (never blocked by intro)
 * - IntroAnimation is a fixed-position overlay ABOVE <App />
 * - Intro has a max duration safety timeout (7 seconds)
 * - When intro completes, it removes itself; homepage remains visible
 * - Skip button immediately removes intro overlay
 * - Reduced motion simplifies the intro
 * - Internal navigation does not replay intro
 */
export const IntroWrapper: React.FC = () => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isInternalNavigation, setIsInternalNavigation] = useState(false);
  const refs = {
    mainLogoRef: useRef<HTMLImageElement>(null),
    textLogoRef: useRef<HTMLImageElement>(null),
  };

  // Check if this is a refresh vs internal navigation
  useEffect(() => {
    // On page load, check if intro has been played in this session
    const played = sessionStorage.getItem('introPlayed');
    if (!played) {
      // First load of the session - play intro after short delay
      const timeout = setTimeout(() => {
        setHasPlayed(true);
        sessionStorage.setItem('introPlayed', 'true');
      }, 100);
    } else {
      // Intro already played this session - don't replay on navigation
      setIsInternalNavigation(true);
    }
  }, []);

  // If intro already played or internal navigation, render the app directly
  if (!hasPlayed && !isInternalNavigation) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        {/* App is always mounted and visible underneath */}
        <App />

        {/* Intro overlay - ABOVE the app, will auto-remove after completion */}
        <IntroAnimation
          autoPlay={true}
          skipVisible={true}
          onComplete={() => setHasPlayed(true)}
        />
      </div>
    );
  }

  // If intro already played or internal navigation, render the app directly
  return <App />;
};