import React, { useCallback, useEffect, useState } from 'react';
import { isDesktopDevice } from './device/DeviceDetector';
import { shouldPlayIntro, markIntroCompleted } from './shared/IntroCompletion';
import App from '../../App';

/**
 * Desktop-only cinematic experience. Phones and tablets go directly to App:
 * no mobile overlay, countdown, intro audio, or navigation interruption.
 */
const DesktopIntro = React.lazy(() =>
  import('./IntroAnimation').then((mod) => ({ default: mod.IntroAnimation }))
);

class IntroBoundary extends React.Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.error('[Intro] failed; recovering to homepage:', error);
    this.props.onError();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

export const IntroWrapper: React.FC = () => {
  const [desktop] = useState(() => isDesktopDevice());
  const [showIntro, setShowIntro] = useState(() => desktop && shouldPlayIntro());

  const handleComplete = useCallback(() => {
    markIntroCompleted();
    setShowIntro(false);
  }, []);

  useEffect(() => {
    if (!showIntro) return;
    // Scoped scroll locking: always restore the original styles after the intro.
    const previousOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [showIntro]);

  // No intro DOM, no lazy intro asset loading, and no full-screen overlays on mobile/tablet.
  if (!showIntro) return <App />;

  // Do not mount the homepage until the desktop intro ends. This also
  // eliminates the first-frame homepage flash while Suspense loads.
  return (
    <React.Suspense fallback={
      <div
        aria-label="Loading NEXORA intro"
        style={{ position: 'fixed', inset: 0, background: '#080313', zIndex: 9999 }}
      />
    }>
      <IntroBoundary onError={handleComplete}>
        <DesktopIntro autoPlay onComplete={handleComplete} />
      </IntroBoundary>
    </React.Suspense>
  );
};
