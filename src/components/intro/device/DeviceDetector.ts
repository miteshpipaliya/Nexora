/**
 * DeviceDetector.ts
 * Robust device classification for the NEXORA intro system.
 *
 * Strategy: Uses multiple signals to determine whether the device should
 * receive the desktop cinematic intro or the lightweight mobile intro.
 *
 * Signals (in priority order):
 *   1. navigator.userAgentData.mobile (modern browsers)
 *   2. Operating system / platform (navigator.platform, userAgent)
 *   3. Touch capability (navigator.maxTouchPoints)
 *   4. Primary pointer (matchMedia '(pointer: coarse)')
 *   5. iPadOS detection (including iPads reporting as macOS)
 *
 * Design decisions:
 *   - Tablets ALWAYS get the mobile animation, regardless of screen size.
 *   - Chrome "Desktop Site" mode on mobile still yields mobile classification.
 *   - A desktop/laptop with touch screen (e.g. Surface) is NOT classified as mobile
 *     unless it also reports touch as primary pointer.
 *   - When signals conflict, the safe fallback is MOBILE (avoid loading heavy
 *     desktop assets on a potentially mobile device).
 */

export type DeviceCategory = 'desktop' | 'mobile' | 'tablet';

/**
 * Detects whether the current device is an iPad (including iPadOS that reports
 * as macOS in the user agent).
 */
function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // iPadOS 13+ reports platform as "MacIntel" but has touch support
  if (/iPad/.test(ua)) return true;
  if (platform === 'MacIntel' && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) {
    // Could be an iPad with iPadOS reporting as MacIntel
    // Check for iPad-specific user agent hints
    if (/Macintosh/.test(ua) && !/Safari/.test(ua.replace(/Version\/[\d.]+.*Safari/, ''))) {
      return true;
    }
  }
  return false;
}

/**
 * Detects whether the current device is an iPhone or iPod.
 */
function isIOSPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPod/.test(ua);
}

/**
 * Detects whether the current device is an Android phone or tablet.
 */
function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android/.test(ua);
}

/**
 * Distinguishes Android tablets from Android phones.
 * Tablets typically have "tablet" in the UA or lack mobile-specific markers.
 */
function isAndroidTablet(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (!/Android/.test(ua)) return false;
  // Mobile Android UAs usually contain "Mobile"
  if (/Mobile/.test(ua)) return false;
  return true;
}

/**
 * Classifies the device into desktop, tablet, or mobile.
 *
 * Chrome Desktop Site mode: The user agent may report as desktop, but
 * navigator.userAgentData.mobile and touch signals will still reveal the
 * true mobile nature of the device.
 */
export function detectDeviceCategory(): DeviceCategory {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    // Safe fallback for SSR or unknown environments
    return 'desktop';
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const uaData = (navigator as any).userAgentData;

  // Signal 1: navigator.userAgentData.mobile (most reliable for modern browsers)
  if (uaData && typeof uaData.mobile === 'boolean') {
    if (uaData.mobile) {
      // Mobile device - could be phone or tablet
      if (isIPad() || isAndroidTablet()) return 'tablet';
      return 'mobile';
    }
    // userAgentData says not mobile - but verify with other signals
    // Desktop site mode on mobile might still report mobile=true here
  }

  // Signal 2: iPadOS detection (tablets always get mobile animation)
  if (isIPad()) return 'tablet';

  // Signal 3: iPhone/iPod
  if (isIOSPhone()) return 'mobile';

  // Signal 4: Android
  if (isAndroid()) {
    if (isAndroidTablet()) return 'tablet';
    return 'mobile';
  }

  // Signal 5: Touch capability as supporting evidence
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isCoarsePointer = window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;

  // If it's a known desktop platform (Windows, Mac, Linux) with no strong
  // mobile signals, classify as desktop.
  const isDesktopPlatform =
    /Win/.test(platform) || /Mac/.test(platform) || /Linux/.test(platform);

  if (isDesktopPlatform) {
    // Touch-enabled Windows/Mac/Linux devices: if touch is the PRIMARY pointer
    // (coarse), treat with caution. Otherwise desktop.
    if (maxTouchPoints > 0 && isCoarsePointer) {
      // Could be a 2-in-1 tablet. Safe fallback: mobile.
      return 'mobile';
    }
    return 'desktop';
  }

  // Signal 6: Unknown platform but has touch/coarse pointer → mobile
  if (maxTouchPoints > 0 || isCoarsePointer) {
    return 'mobile';
  }

  // Safe fallback: desktop for unknown non-touch devices
  return 'desktop';
}

/**
 * Returns true if the device should run the desktop cinematic intro.
 * Tablets and phones both return false (mobile animation).
 */
export function isDesktopDevice(): boolean {
  return detectDeviceCategory() === 'desktop';
}

/**
 * Returns true if the device should run the mobile intro (phone or tablet).
 */
export function isMobileDeviceCategory(): boolean {
  const cat = detectDeviceCategory();
  return cat === 'mobile' || cat === 'tablet';
}
