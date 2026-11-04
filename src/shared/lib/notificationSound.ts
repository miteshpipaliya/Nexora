/**
 * src/shared/lib/notificationSound.ts
 * Synthesized Web Audio notification chime (Package D / R3).
 * 
 * Features:
 * - Original two-note sine synthesizer: 880 Hz (A5) then 1320 Hz (E6), ~120ms each, soft envelope
 * - Volume calibrated at ~0.35, no external audio files or copyrighted assets
 * - Audio unlock on first user gesture (pointerdown, keydown, touchstart)
 * - Safe silent fallback when locked or unsupported (never throws)
 * - Throttled: at most once per notification ID, at most once per 3000ms
 * - Multi-tab deduplication lock via BroadcastChannel / localStorage (single tab audio playback)
 * - User preference persisted in localStorage ('nexora_notif_sound', defaults to true)
 */

const SOUND_PREF_KEY = 'nexora_notif_sound';
const SOUND_LOCK_KEY = 'nexora_sound_claim_lock';
const THROTTLE_MS = 3000;

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

export function isNotificationSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_PREF_KEY);
    return val === null ? true : val === 'true';
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
    return true; // Fallback to allowing play if localStorage blocked
  }
}

/**
 * Synthesizes an original two-tone chime (880 Hz -> 1320 Hz)
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

    // First Tone: A5 (880 Hz), 120ms
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, startTime);

    gain1.gain.setValueAtTime(0.0001, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.35, startTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.15);

    // Second Tone: E6 (1320 Hz), 120ms (with gentle harmonic ring)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, startTime + 0.11);

    gain2.gain.setValueAtTime(0.0001, startTime + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.32, startTime + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.11);
    osc2.stop(startTime + 0.30);

    lastSoundPlayedAt = now;
    return true;
  } catch (err) {
    // Never crash caller
    return false;
  }
}
