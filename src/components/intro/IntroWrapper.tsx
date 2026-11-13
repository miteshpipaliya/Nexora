import React, { useCallback, useEffect, useState } from 'react';
import { isDesktopDevice } from './device/DeviceDetector';
import { shouldPlayIntro, markIntroCompleted } from './shared/IntroCompletion';
import App from '../../App';

/**
 * Desktop-only intro gate.
 * Phones/tablets never mount, preload, or run the intro.
 * On desktop the homepage cannot flash beneath an unloaded intro.
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
  const [isDesktop] = useState(() => isDesktopDevice());
  const [showIntro, setShowIntro] = useState(() => isDesktop && shouldPlayIntro());

  const handleComplete = useCallback(() => {
    markIntroCompleted();
    setShowIntro(false);
  }, []);

  useEffect(() => {
    if (!showIntro) return;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [showIntro]);

  // Render App immediately on phone/tablet without any intro overlay.
  // On desktop, App is mounted permanently beneath the intro overlay.
  const isMobile = !isDesktop;
  const introActive = isDesktop ? showIntro : !showIntro;

  return isDesktop ? (
    <>
      {/* Permanently mounted homepage, layered behind the intro overlay. */}
      <main
        style={appStyle}
        aria-hidden={introActive}
        inert={introActive}
      >
        <App />
      </main>

      {introActive ? (
        <React.Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading NEXORA experience"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'radial-gradient(ellipse at center, #211044, #130a2a 48%, #080313)',
              }}
            />
          }
        >
          <IntroBoundary onError={handleComplete}>
            <DesktopIntro autoPlay onComplete={handleComplete} />
          </IntroBoundary>
        </React.Suspense>
      ) : null}
    </>) : (
      <App />
    );
  // This prevents the "black screen" gap after the fog zoom because the homepage
  // is already rendered, layered, and ready. The intro sits on top as a fixed
  overlay that fades away when the fog zoom finishes.
  const introActive = showIntro && isDesktop;

  // Prevent homepage flash on initial load by keeping it invisible while intro plays.
  const appStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    overflow: 'hidden',
    pointerEvents: 'none',
    background: 'rgba(8, 8, 13, 0.98)',
  };

  // Desktop intro is exclusive: the homepage cannot flash behind transparent
  // frames or while the lazy-loaded cinematic component is downloading.
  return (
    <>
      {/* Permanently mounted homepage, layered behind the intro. */}
      <main
        style={appStyle}
        aria-hidden={introActive}
        inert={introActive}
      >
        <App />
      </main>

      {introActive ? (
        <React.Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading NEXORA experience"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'radial-gradient(ellipse at center, #211044, #130a2a 48%, #080313)',
              }}
            />
          }
        >
          <IntroBoundary onError={handleComplete}>
            <DesktopIntro autoPlay onComplete={handleComplete} />
          </IntroBoundary>
        </React.Suspense>
      ) : null}
    </>
  );
};
