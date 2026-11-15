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
    let frame2 = 0;
    let safetyTimer: number | undefined;
    let finished = false;
    const gate = document.getElementById('nx-first-paint-gate');
    const hint = gate?.querySelector('.nx-boot-hint');
    const reveal = () => {
      if (finished) return;
      finished = true;
      const root = document.getElementById('root');
      if (root) root.style.visibility = 'visible';
      document.documentElement.classList.add('nx-intro-ready');
      gate?.remove();
    };
    // Hand off when the actual CSS animation completes, not an arbitrary
    // timeout measured from module startup (which caused pauses on slow loads).
    hint?.addEventListener('animationend', reveal, { once: true });
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (!hint || getComputedStyle(hint).animationName === 'none') {
          reveal();
        }
      });
    });
    // Safety fallback only; normal hand-off follows the CSS animation event.
    safetyTimer = window.setTimeout(reveal, 10000);
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      hint?.removeEventListener('animationend', reveal);
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
