import React, { useCallback, useEffect, useState } from 'react';
import { isDesktopDevice } from './device/DeviceDetector';
import { shouldPlayIntro, markIntroCompleted } from './shared/IntroCompletion';
import App from '../../App';

// Phones and tablets never load the desktop introduction.
const DesktopIntro = React.lazy(() =>
  import('./IntroAnimation').then((mod) => ({ default: mod.IntroAnimation }))
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
    console.error('[Intro] failed; recovering to homepage:', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const IntroWrapper: React.FC = () => {
  const [isDesktop] = useState(() => isDesktopDevice());
  const [showIntro, setShowIntro] = useState(
    () => isDesktop && shouldPlayIntro()
  );
  const introActive = isDesktop && showIntro;

  const handleComplete = useCallback(() => {
    markIntroCompleted();
    setShowIntro(false);
  }, []);

  useEffect(() => {
    if (!introActive) return;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [introActive]);

  // On mobile and tablet, render the homepage immediately with no intro UI.
  if (!isDesktop) return <App />;

  // Keep exactly one App instance mounted and laid out during the desktop intro.
  // The opaque, fixed intro overlay covers it until the cinematic exit.
  return (
    <>
      <main
        style={{
          position: 'relative',
          minHeight: '100vh',
          pointerEvents: introActive ? 'none' : 'auto',
        }}
        aria-hidden={introActive}
        inert={introActive}
      >
        <App />
      </main>
      {introActive && (
        <React.Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading NEXORA experience"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background:
                  'radial-gradient(ellipse at center, #211044, #130a2a 48%, #080313)',
              }}
            />
          }
        >
          <IntroBoundary onError={handleComplete}>
            <DesktopIntro autoPlay onComplete={handleComplete} />
          </IntroBoundary>
        </React.Suspense>
      )}
    </>
  );
};
