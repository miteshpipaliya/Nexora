/**
 * DeviceCapabilities.ts
 * Detects browser/device capabilities relevant to intro animation performance.
 * Used to gate heavy desktop features on capable devices only.
 */

export interface DeviceCapabilities {
  supportsWebAudio: boolean;
  supportsCSSMotion: boolean;
  prefersReducedMotion: boolean;
  isLowEnd: boolean;
  touchPoints: number;
  pointerCoarse: boolean;
}

/**
 * Detect device capabilities for intro rendering decisions.
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supportsWebAudio: false,
      supportsCSSMotion: true,
      prefersReducedMotion: false,
      isLowEnd: false,
      touchPoints: 0,
      pointerCoarse: false,
    };
  }

  // Web Audio API support
  const AudioContext =
    window.AudioContext || (window as any).webkitAudioContext;
  const supportsWebAudio = !!AudioContext;

  // CSS motion support (modern browsers with motion/react)
  const supportsCSSMotion = true; // We use motion/react which handles fallbacks

  // Reduced motion preference
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Touch points
  const touchPoints = navigator.maxTouchPoints || 0;

  // Coarse pointer (touch screen as primary input)
  const pointerCoarse = window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;

  // Heuristic for low-end devices: touch + coarse pointer + limited touch points
  // or low memory (if available)
  const isLowEnd = (pointerCoarse && touchPoints > 0) || prefersReducedMotion;

  return {
    supportsWebAudio,
    supportsCSSMotion,
    prefersReducedMotion,
    isLowEnd,
    touchPoints,
    pointerCoarse,
  };
}
