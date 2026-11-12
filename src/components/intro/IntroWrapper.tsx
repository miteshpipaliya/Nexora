import React, { useCallback, useState } from 'react';
import { isDesktopDevice } from './device/DeviceDetector';
import { shouldPlayIntro, markIntroCompleted } from './shared/IntroCompletion';
import App from '../../App';

/**
 * IntroWrapper
 * Central animation selector.
 *
 * 1. Detects device category (desktop vs mobile/tablet).
 * 2. Renders exactly ONE intro system - never both.
 * 3. Desktop: renders the existing cinematic IntroAnimation (with sound, fog, zoom).
 *    Lazily loaded so desktop code is NOT downloaded on mobile.
 * 4. Mobile/Tablet: renders the lightweight MobileIntro (silent, no fog, no zoom).
 * 5. <App /> is ALWAYS mounted behind the intro overlay.
 * 6. Intro is removed only when onComplete fires.
 * 7. Plays once per browser tab session. Add ?intro=1 to force replay.
 * 8. If the intro crashes, it is skipped and the site still loads.
 */

// Lazily load the desktop cinematic intro only on desktop devices.
// This prevents the desktop animation bundle (including sound controller) from
// being downloaded on mobile/tablet devices.
const DesktopIntro = React.lazy(() =>
  import('./IntroAnimation').then((mod) => ({
    default: mod.IntroAnimation,
  }))
);

class IntroBoundary extends React.Component<
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
  const [showIntro, setShowIntro] = useState<boolean>(shouldPlayIntro());
  const isDesktop = isDesktopDevice();

  const handleComplete = useCallback(() => {
    markIntroCompleted();
    setShowIntro(false);
  }, []);

  // Desktop: use lazy-loaded Suspense-wrapped IntroAnimation.
  // Mobile/Tablet: use MobileIntro directly (already lightweight, no lazy needed).
  const introElement = isDesktop ? (
    <React.Suspense fallback={null}>
      <IntroBoundary onError={handleComplete}>
        <DesktopIntro autoPlay onComplete={handleComplete} />
      </IntroBoundary>
    </React.Suspense>
  ) : null;

  return (
    <>
      <App />
      {showIntro && introElement}
    </>
  );
};

