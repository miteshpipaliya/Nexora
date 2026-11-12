/**
 * IntroCompletion.ts
 * Shared completion logic for both desktop and mobile intro systems.
 * Ensures both animation types use the same homepage transition pathway.
 */

const STORAGE_KEY = 'introPlayed';

/**
 * Checks whether the intro should be played (not yet seen in this session).
 * Respects the ?intro=1 URL parameter to force replay.
 */
export function shouldPlayIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('intro') === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
}

/**
 * Marks the intro as played and signals completion.
 * Called by both DesktopIntro and MobileIntro when their animation finishes.
 */
export function markIntroCompleted(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
}
