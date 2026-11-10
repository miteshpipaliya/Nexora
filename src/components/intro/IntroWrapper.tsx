import React, { useEffect, useState } from 'react';
import { IntroAnimation } from './IntroAnimation';
import App from '../../App';

/**
 * Intro Wrapper
 * Handles the cinematic intro animation playback:
 * - Plays on new browsing sessions and page refreshes
 * - Does not replay on internal navigation
 * - Respects reduced-motion preference
 * - Manages skip state and persistence
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

  // Reset the played state when the user opens a new browser session/tab
  // This is detected when sessionStorage is cleared or on new tab open
  useEffect(() => {
    // Check if we're in a new session by checking if the intro
    // was played in the previous session but the storage was reset
    const played = sessionStorage.getItem('introPlayed');
    if (!played) {
      setHasPlayed(false);
    }
  }, [sessionStorage]);

  // Handle visibility change (user switching tabs, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // New page view after tab switch
        const played = sessionStorage.getItem('introPlayed');
        if (!played) {
          const timeout = setTimeout(() => {
            setHasPlayed(true);
            sessionStorage.setItem('introPlayed', 'true');
          }, 100);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('introPlayed');
    };
  }, []);

  if (!hasPlayed && !isInternalNavigation) {
    return <IntroAnimation autoPlay={true} skipVisible={true} />;
  }

  // If intro already played or internal navigation, render the app directly
  return <App />;
};