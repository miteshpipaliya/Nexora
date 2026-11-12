import React, { Component, useCallback, useState } from 'react';
import { IntroAnimation } from './IntroAnimation';
import App from '../../App';

/**
 * Intro Wrapper
 * - <App /> is ALWAYS mounted (same tree before, during and after the intro,
 *   so React never remounts it).
 * - IntroAnimation is a fixed overlay above it; it is removed ONLY when it
 *   calls onComplete (after its own timeline).
 * - Plays once per browser tab session. Add ?intro=1 to the URL to force it.
 * - If the intro ever crashes, it is skipped and the site still loads.
 */

const STORAGE_KEY = 'introPlayed';

const shouldPlayIntro = (): boolean => {
  try {
    if (new URLSearchParams(window.location.search).get('intro') === '1') return true;
  } catch {
    /* ignore */
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
};

class IntroBoundary extends Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[Intro] crashed, skipping intro:', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const IntroWrapper: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(shouldPlayIntro);

  const handleComplete = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* ignore */
    }
    setShowIntro(false);
  }, []);

  return (
    <>
      <App />
      {showIntro && (
        <IntroBoundary onError={handleComplete}>
          <IntroAnimation autoPlay onComplete={handleComplete} />
        </IntroBoundary>
      )}
    </>
  );
};
