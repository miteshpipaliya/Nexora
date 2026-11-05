/**
 * src/shared/lib/notificationSound.ts
 * Upgraded Professional Broadcast Notification Chime for NEXORA.
 * 
 * Features:
 * - High-fidelity 3-tone ascending digital chime (F5 698.5Hz -> A5 880Hz -> C6 1046.5Hz + crystalline shimmer)
 * - Calibrated peak gain (~0.52) for rich, louder presence with warm low-pass filtering (no distortion, no sirens)
 * - Fast 8ms attack with smooth 1.05s exponential ring-out
 * - Unlocked silently on initial user interaction (pointerdown, keydown, touchstart)
 * - Enabled by default across all clients
 * - Multi-tab deduplication lock via localStorage & BroadcastChannel
 * - Throttled: at most once per notification ID, at most once per 2500ms
 * - Never throws; gracefully silent if AudioContext is unsupported
 */

const SOUND_PREF_KEY = 'nexora_notif_sound';
const SOUND_LOCK_KEY = 'nexora_sound_claim_lock';
const THROTTLE_MS = 2500;

let audioCtx: AudioContext | null = null;
let lastSoundPlayedAt = 0;
const playedNotificationIds = new Set<string>();
let isUnlocked = false;

// Multi-tab channel for audio lock claim
let soundChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    soundChannel = new BroadcastChannel('nexora_audio_claim');
  }
} catch {
  // BroadcastChannel unavailable in some environments
}

/**
 * Returns whether notification sound is enabled. Always true by default.
 */
export function isNotificationSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_PREF_KEY);
    // Enabled by default unless explicitly disabled
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  } catch {}
}

/**
 * Lazily initializes or resumes AudioContext on user interaction
 */
export function unlockAudio(): void {
  if (isUnlocked && audioCtx && audioCtx.state === 'running') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        isUnlocked = true;
      }).catch(() => {});
    } else if (audioCtx.state === 'running') {
      isUnlocked = true;
    }
  } catch {
    // Non-fatal
  }
}

// Global user-gesture listeners for audio unlock
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    unlockAudio();
  };

  window.addEventListener('pointerdown', handleInteraction, { once: true, passive: true });
  window.addEventListener('keydown', handleInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
}

/**
 * Attempts to claim exclusive multi-tab sound playback for a specific notification ID
 */
function claimSoundPlayback(notificationId: string): boolean {
  const now = Date.now();
  const lockKey = `${SOUND_LOCK_KEY}_${notificationId}`;

  try {
    const existing = localStorage.getItem(lockKey);
    if (existing) {
      const claimTime = parseInt(existing, 10);
      if (now - claimTime < 5000) {
        return false; // Another tab claimed playback within 5s
      }
    }
    localStorage.setItem(lockKey, String(now));
    return true;
  } catch {
    return true;
  }
}

/**
 * Synthesizes the professional 3-tone ascending digital broadcast chime (~1.05s).
 * Tones:
 * 1. F5 (698.46 Hz) + harmonic at t=0
 * 2. A5 (880.00 Hz) + harmonic at t=0.12s
 * 3. C6 (1046.50 Hz) + crystal overtone (1318.5 Hz) at t=0.25s decaying smoothly to 1.05s
 */
export async function playNotificationSound(notificationId?: string, forceTest: boolean = false): Promise<boolean> {
  if (!forceTest && !isNotificationSoundEnabled()) {
    return false;
  }

  const now = Date.now();

  if (!forceTest) {
    if (notificationId) {
      if (playedNotificationIds.has(notificationId)) {
        return false;
      }
      if (!claimSoundPlayback(notificationId)) {
        playedNotificationIds.add(notificationId);
        return false;
      }
      playedNotificationIds.add(notificationId);
    }

    if (now - lastSoundPlayedAt < THROTTLE_MS) {
      return false;
    }
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return false;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }

    if (audioCtx.state !== 'running') {
      return false; // Audio locked or browser blocked autoplay
    }

    const ctx = audioCtx;
    const startTime = ctx.currentTime + 0.02;

    // Master filter to keep chime warm, rich, and digital without high-freq harshness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3600, startTime);
    filter.connect(ctx.destination);

    // Master output gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.52, startTime);
    masterGain.connect(filter);

    // Helper to generate a soft harmonic voice
    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      peakGain: number,
      type: OscillatorType = 'sine',
      decayTime: number = duration
    ) => {
      const toneStart = startTime + startOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, toneStart);

      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(peakGain, toneStart + 0.008); // 8ms crisp attack
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + decayTime);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(toneStart);
      osc.stop(toneStart + decayTime + 0.05);
    };

    // Tone 1: F5 fundamental (698.46 Hz) + gentle octave
    playTone(698.46, 0.00, 0.28, 0.38, 'sine', 0.28);
    playTone(1396.92, 0.00, 0.22, 0.12, 'sine', 0.22);

    // Tone 2: A5 fundamental (880.00 Hz) + gentle octave
    playTone(880.00, 0.12, 0.35, 0.42, 'sine', 0.35);
    playTone(1760.00, 0.12, 0.25, 0.14, 'sine', 0.25);

    // Tone 3: C6 fundamental (1046.50 Hz) + crystalline E6 shimmer (1318.5 Hz) ringing out
    playTone(1046.50, 0.24, 0.80, 0.46, 'sine', 0.80);
    playTone(1318.51, 0.25, 0.75, 0.20, 'sine', 0.75);
    playTone(2093.00, 0.25, 0.40, 0.08, 'triangle', 0.40); // high sparkle

    lastSoundPlayedAt = now;
    return true;
  } catch (err) {
    // Never crash caller
    return false;
  }
}
