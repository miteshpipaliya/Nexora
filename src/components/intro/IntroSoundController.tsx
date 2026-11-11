import { useCallback, useEffect, useRef } from 'react';

/**
 * Intro Sound Controller
 * Small Web Audio API sound effects for the intro. Never throws.
 */

export type IntroSoundType = 'whoosh' | 'impact' | 'atmospheric' | 'cinematic';

export const useSound = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  const ensureAudio = useCallback(() => {
    if (ctxRef.current) return;
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0.1;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    } catch {
      /* Web Audio not available - intro stays silent */
    }
  }, []);

  const stopAll = useCallback(() => {
    const ctx = ctxRef.current;
    ctxRef.current = null;
    try {
      masterRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    masterRef.current = null;
    if (ctx && ctx.state !== 'closed') {
      try {
        void ctx.close().catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    ensureAudio();

    // Browsers keep AudioContext suspended until a user gesture.
    const resume = () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, resume, { once: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, resume));
      stopAll();
    };
  }, [ensureAudio, stopAll]);

  const playSound = useCallback((type: IntroSoundType) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';

      switch (type) {
        case 'whoosh':
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
          break;
        case 'impact':
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
          break;
        case 'atmospheric':
          osc.frequency.setValueAtTime(110, now);
          break;
        case 'cinematic':
          osc.frequency.setValueAtTime(150, now);
          break;
      }

      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(1, now + 0.05);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(env);
      env.connect(master);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch {
      /* never let sound break the intro */
    }
  }, []);

  return { playSound, stopAll };
};
