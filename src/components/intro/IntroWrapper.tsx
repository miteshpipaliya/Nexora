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

const ReactIntroReady: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    let secondFrame = 0;
    // React's start screen is mounted. Swap after a paint, without waiting
    // for an entrance animation or imposing a fixed loading delay.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const root = document.getElementById('root');
        if (root) root.style.visibility = 'visible';
        document.documentElement.classList.add('nx-intro-ready');
        document.getElementById('nx-first-paint-gate')?.remove();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);
  return <>{children}</>;
};

export const IntroWrapper: React.FC = () => {
  const [isDesktop] = useState(() => isDesktopDevice());
  const [showIntro, setShowIntro] = useState(
    () => isDesktop && shouldPlayIntro()
  );
  const introActive = isDesktop && showIntro;

  // Hand off the first-paint gate only after the lazy intro has committed
  // and the browser has had a frame to paint it. Never expose a blank fallback.
  // Mobile/tablet remove the desktop-only gate immediately.
  useEffect(() => {
    if (!isDesktop || !introActive) {
      const root = document.getElementById('root');
      if (root) root.style.visibility = 'visible';
      document.getElementById('nx-first-paint-gate')?.remove();
      document.documentElement.classList.add('nx-intro-ready');
    }
  }, [isDesktop, introActive]);


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

  // Called by a child inside Suspense, so it cannot fire before the intro
  // module is loaded and the start gate is actually mounted.
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
          fallback={<div aria-hidden="true" style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#020105', pointerEvents: 'none',
          }} />}
        >
          <IntroBoundary onError={handleComplete}>
            <ReactIntroReady>
              <DesktopIntro autoPlay onComplete={handleComplete} />
            </ReactIntroReady>
          </IntroBoundary>
        </React.Suspense>
      )}
    </>
  );
};
