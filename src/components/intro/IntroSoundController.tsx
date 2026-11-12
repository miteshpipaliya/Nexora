import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Intro Sound Controller
 * Cinematic sound design generated 100% in code with the Web Audio API
 * (no audio files needed). Layers: sub drone, noise whooshes, sub-bass impact,
 * sparkle shimmer, a fog 'warp' rush, soft 'wind', and an uplifting 'arrive' chord. Everything goes through a reverb + compressor.
 *
 * TWEAK BY EAR: change MASTER_VOLUME or the per-sound levels below.
 */

export type IntroSoundType = 'drone' | 'whoosh' | 'impact' | 'shimmer' | 'warp' | 'wind' | 'arrive';

export const MASTER_VOLUME = 0.6; // 0 to 1 - overall loudness

const FLOOR = 0.0001; // exponential ramps cannot reach 0

export interface SoundBus {
  ctx: BaseAudioContext;
  master: GainNode;
  dry: GainNode;
  reverb: ConvolverNode;
  noise: AudioBuffer;
}

const makeImpulse = (ctx: BaseAudioContext, seconds = 2.4, decay = 2.8) => {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
};

const makeNoise = (ctx: BaseAudioContext, seconds = 2) => {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
};

export const createSoundBus = (ctx: BaseAudioContext, volume = MASTER_VOLUME): SoundBus => {
  const master = ctx.createGain();
  master.gain.value = volume;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 18;
  comp.ratio.value = 6;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  master.connect(comp);
  comp.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.connect(master);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.4;
  reverb.connect(wet);
  wet.connect(master);

  return { ctx, master, dry, reverb, noise: makeNoise(ctx) };
};

const send = (bus: SoundBus, node: AudioNode, wet = 0.3) => {
  node.connect(bus.dry);
  if (wet > 0) {
    const s = bus.ctx.createGain();
    s.gain.value = wet;
    node.connect(s);
    s.connect(bus.reverb);
  }
};

const noiseSrc = (bus: SoundBus, t: number, dur: number) => {
  const src = bus.ctx.createBufferSource();
  src.buffer = bus.noise;
  src.loop = true;
  src.start(t);
  src.stop(t + dur);
  return src;
};

/* ---------- individual sounds (t = absolute audio-clock time) ---------- */

const drone = (bus: SoundBus, t: number, dur = 5.4) => {
  const { ctx } = bus;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(90, t);
  filter.frequency.exponentialRampToValueAtTime(1100, t + dur * 0.7);
  filter.frequency.exponentialRampToValueAtTime(200, t + dur);

  const g = ctx.createGain();
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.exponentialRampToValueAtTime(0.45, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);

  const voices: Array<[OscillatorType, number, number, number]> = [
    ['sawtooth', 55, 0, 0.22],
    ['sawtooth', 55, 8, 0.18],
    ['sawtooth', 82.41, -6, 0.12],
    ['sine', 110, 0, 0.25],
  ];
  for (const [type, freq, detune, level] of voices) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const og = ctx.createGain();
    og.gain.value = level;
    o.connect(og);
    og.connect(filter);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  filter.connect(g);
  send(bus, g, 0.25);
};

const whoosh = (bus: SoundBus, t: number, dur = 1.0, dir: 'in' | 'out' = 'in') => {
  const { ctx } = bus;
  const src = noiseSrc(bus, t, dur + 0.05);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  const [f0, f1] = dir === 'in' ? [250, 4200] : [4200, 260];
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.85);

  const g = ctx.createGain();
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);

  src.connect(bp);
  bp.connect(g);
  if (typeof ctx.createStereoPanner === 'function') {
    const pan = ctx.createStereoPanner();
    const [p0, p1] = dir === 'in' ? [-0.75, 0.75] : [0.6, -0.6];
    pan.pan.setValueAtTime(p0, t);
    pan.pan.linearRampToValueAtTime(p1, t + dur);
    g.connect(pan);
    send(bus, pan, 0.25);
  } else {
    send(bus, g, 0.25);
  }
};

const impact = (bus: SoundBus, t: number) => {
  const { ctx } = bus;
  // sub-bass thump with pitch drop
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(140, t);
  sub.frequency.exponentialRampToValueAtTime(38, t + 0.7);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(FLOOR, t);
  sg.gain.exponentialRampToValueAtTime(1.0, t + 0.006);
  sg.gain.exponentialRampToValueAtTime(FLOOR, t + 1.5);
  sub.connect(sg);
  sub.start(t);
  sub.stop(t + 1.6);
  send(bus, sg, 0.2);

  // click / body
  const n = noiseSrc(bus, t, 0.12);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.7, t);
  ng.gain.exponentialRampToValueAtTime(FLOOR, t + 0.12);
  n.connect(lp);
  lp.connect(ng);
  send(bus, ng, 0.35);

  // metallic ring (heavy reverb)
  for (const [freq, level] of [[220, 0.22], [330, 0.14], [554, 0.08]] as const) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const og = ctx.createGain();
    og.gain.setValueAtTime(FLOOR, t);
    og.gain.exponentialRampToValueAtTime(level, t + 0.01);
    og.gain.exponentialRampToValueAtTime(FLOOR, t + 1.1);
    o.connect(og);
    o.start(t);
    o.stop(t + 1.2);
    send(bus, og, 0.65);
  }
};

const shimmer = (bus: SoundBus, t: number) => {
  const { ctx } = bus;
  const notes = [1046.5, 1318.5, 1568.0, 2093.0, 2637.0]; // C6 E6 G6 C7 E7
  notes.forEach((freq, i) => {
    const st = t + i * 0.09;
    for (const [type, mult, level] of [['sine', 1, 0.16], ['triangle', 2, 0.04]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(FLOOR, st);
      g.gain.exponentialRampToValueAtTime(level, st + 0.006);
      g.gain.exponentialRampToValueAtTime(FLOOR, st + 0.95);
      o.connect(g);
      o.start(st);
      o.stop(st + 1.0);
      send(bus, g, 0.75);
    }
  });
};

/** Fog rush: soft rising air + deep rumble + a low swell (about 1.4s). */
const warp = (bus: SoundBus, t: number, dur = 1.4) => {
  const { ctx } = bus;
  // rising air
  const src = noiseSrc(bus, t, dur + 0.05);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(300, t);
  hp.frequency.exponentialRampToValueAtTime(3200, t + dur); // softer top end = misty, not sci-fi
  const g = ctx.createGain();
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + dur * 0.92);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.04);
  src.connect(hp);
  hp.connect(g);
  send(bus, g, 0.2);

  // low rumble
  const rn = noiseSrc(bus, t, dur + 0.05);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(120, t);
  lp.frequency.exponentialRampToValueAtTime(420, t + dur);
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(FLOOR, t);
  rg.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.8);
  rg.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.05);
  rn.connect(lp);
  lp.connect(rg);
  send(bus, rg, 0.1);

  // low swell (gentle, no rising pitch sweep)
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(70, t);
  o.frequency.exponentialRampToValueAtTime(150, t + dur);
  const og = ctx.createGain();
  og.gain.setValueAtTime(FLOOR, t);
  og.gain.exponentialRampToValueAtTime(0.3, t + dur * 0.85);
  og.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.04);
  o.connect(og);
  o.start(t);
  o.stop(t + dur + 0.06);
  send(bus, og, 0.3);
};

/** Soft air drifting past while moving through the fog (about 1.7s). */
const wind = (bus: SoundBus, t: number, dur = 1.7) => {
  const { ctx } = bus;
  const src = noiseSrc(bus, t, dur + 0.05);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(1800, t);
  bp.frequency.exponentialRampToValueAtTime(500, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.exponentialRampToValueAtTime(0.55, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
  src.connect(bp);
  bp.connect(g);
  if (typeof ctx.createStereoPanner === 'function') {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.5, t);
    pan.pan.linearRampToValueAtTime(0.5, t + dur);
    g.connect(pan);
    send(bus, pan, 0.45);
  } else {
    send(bus, g, 0.45);
  }
};

/** Uplifting resolve when the homepage appears: soft chord + sparkle + low thump. */
const arrive = (bus: SoundBus, t: number) => {
  const { ctx } = bus;
  for (const [freq, level] of [[261.63, 0.16], [329.63, 0.13], [392.0, 0.12], [587.33, 0.1]] as const) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(FLOOR, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.18);
    g.gain.exponentialRampToValueAtTime(FLOOR, t + 1.7);
    o.connect(g);
    o.start(t);
    o.stop(t + 1.75);
    send(bus, g, 0.6);
  }
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(80, t);
  sub.frequency.exponentialRampToValueAtTime(42, t + 0.6);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(FLOOR, t);
  sg.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  sg.gain.exponentialRampToValueAtTime(FLOOR, t + 0.9);
  sub.connect(sg);
  sub.start(t);
  sub.stop(t + 1.0);
  send(bus, sg, 0.2);
  shimmer(bus, t + 0.12);
};

/** Schedule one sound on any AudioContext (live or offline). */
export const scheduleSound = (bus: SoundBus, type: IntroSoundType, when: number) => {
  switch (type) {
    case 'drone':
      return drone(bus, when);
    case 'whoosh':
      return whoosh(bus, when, 1.0, 'in');
    case 'impact':
      return impact(bus, when);
    case 'shimmer':
      return shimmer(bus, when);
    case 'warp':
      return warp(bus, when);
    case 'wind':
      return wind(bus, when);
    case 'arrive':
      return arrive(bus, when);
  }
};

/* ---------------------------- React hook ---------------------------- */

interface UseSoundOptions {
  /** create the AudioContext immediately (it will be suspended until a user gesture) */
  eager?: boolean;
  /** false = completely silent (e.g. reduced motion) */
  enabled?: boolean;
}

export const useSound = ({ eager = false, enabled = true }: UseSoundOptions = {}) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const busRef = useRef<SoundBus | null>(null);
  const mutedRef = useRef(false);
  const [audioRunning, setAudioRunning] = useState(false);
  const [muted, setMuted] = useState(false);

  const ensureAudio = useCallback(() => {
    if (!enabled || ctxRef.current) return;
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const bus = createSoundBus(ctx, mutedRef.current ? 0 : MASTER_VOLUME);
      ctxRef.current = ctx;
      busRef.current = bus;
      const sync = () => setAudioRunning(ctx.state === 'running');
      ctx.onstatechange = sync;
      sync();
      // AUTOPLAY_UNLOCK_V5: try to start immediately (works wherever the browser allows autoplay audio)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      /* Web Audio not available - intro stays silent */
    }
  }, [enabled]);

  /** Call from a click/tap/key handler: creates + resumes the audio context. */
  const unlock = useCallback(() => {
    ensureAudio();
    const ctx = ctxRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => setAudioRunning(ctx.state === 'running')).catch(() => {});
    }
  }, [ensureAudio]);

  const closeNow = useCallback(() => {
    const ctx = ctxRef.current;
    ctxRef.current = null;
    busRef.current = null;
    if (ctx) {
      ctx.onstatechange = null;
      if (ctx.state !== 'closed') {
        try {
          void ctx.close().catch(() => {});
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  /** Smoothly fade the master volume out, then close the context. */
  const fadeOutAndStop = useCallback(
    (ms = 800) => {
      const ctx = ctxRef.current;
      const bus = busRef.current;
      if (!ctx || !bus) return;
      try {
        const now = ctx.currentTime;
        bus.master.gain.cancelScheduledValues(now);
        bus.master.gain.setValueAtTime(bus.master.gain.value, now);
        bus.master.gain.setTargetAtTime(0, now, ms / 3000);
      } catch {
        /* ignore */
      }
      window.setTimeout(closeNow, ms + 200);
    },
    [closeNow]
  );

  /** Let the sounds ring out naturally, then close the context. */
  const stopLater = useCallback(
    (ms = 2000) => {
      window.setTimeout(closeNow, ms);
    },
    [closeNow]
  );

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    const bus = busRef.current;
    if (bus) {
      try {
        bus.master.gain.value = mutedRef.current ? 0 : MASTER_VOLUME;
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (eager) ensureAudio();
    // any first user gesture unlocks audio (browser autoplay policy)
    // (touchstart alone is NOT accepted by mobile browsers, so touchend / pointerup / click are listened to as well)
    const events = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchstart', 'touchend'] as const;
    events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, unlock));
      closeNow();
    };
  }, [enabled, eager, ensureAudio, unlock, closeNow]);

  const playSound = useCallback((type: IntroSoundType) => {
    const ctx = ctxRef.current;
    const bus = busRef.current;
    if (!ctx || !bus || ctx.state !== 'running') return;
    try {
      scheduleSound(bus, type, ctx.currentTime + 0.02);
    } catch {
      /* never let sound break the intro */
    }
  }, []);

  return { unlock, playSound, fadeOutAndStop, stopLater, toggleMute, muted, audioRunning };
};
