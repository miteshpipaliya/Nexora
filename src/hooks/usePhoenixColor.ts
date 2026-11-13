import { useEffect, useState } from 'react';
import {
  COLOR_SEQUENCE,
  PHOENIX_COLORS,
  PHOENIX_CONFIG,
  type PhoenixColor,
} from '../config/phoenixColors';

/**
 * One owner for color timing. When hidden, the remaining interval is paused.
 * Motion-sensitive users remain on the original violet palette.
 */
export function usePhoenixColor() {
  const [current, setCurrent] = useState<PhoenixColor>(PHOENIX_CONFIG.initialColor);
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduced || !PHOENIX_CONFIG.enableAutoColor) {
      setCurrent(PHOENIX_CONFIG.initialColor);
      return;
    }

    let timer: number | undefined;
    let remaining = PHOENIX_CONFIG.colorInterval;
    let startedAt = performance.now();

    const advance = () => {
      setCurrent(previous => {
        const index = COLOR_SEQUENCE.indexOf(previous);
        return COLOR_SEQUENCE[(index + 1) % COLOR_SEQUENCE.length];
      });
      remaining = PHOENIX_CONFIG.colorInterval;
      startedAt = performance.now();
      timer = window.setTimeout(advance, remaining);
    };

    const schedule = () => {
      if (document.hidden) return;
      startedAt = performance.now();
      timer = window.setTimeout(advance, remaining);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
        remaining = Math.max(0, remaining - (performance.now() - startedAt));
      } else if (timer === undefined) {
        schedule();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced]);

  return { colorName: current, colors: PHOENIX_COLORS[current], reducedMotion: reduced };
}
