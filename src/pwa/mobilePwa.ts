export type MobileInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let pendingInstallPrompt: MobileInstallPrompt | null = null;
export function getMobileInstallPrompt(): MobileInstallPrompt | null { return pendingInstallPrompt; }
export function clearMobileInstallPrompt(): void { pendingInstallPrompt = null; }
// Capture the event at application startup, before the /install route is mounted.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingInstallPrompt = event as MobileInstallPrompt;
    window.dispatchEvent(new Event('nexora-install-available'));
  });
  window.addEventListener('appinstalled', () => { pendingInstallPrompt = null; });
}

// PWA installation targets phones/tablets; desktop remains a conventional website.
export function isInstalledMobilePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mobile && standalone;
}

export function initializeMobilePwa(): void {
  if (typeof window === 'undefined') return;
  if (isInstalledMobilePwa()) document.documentElement.classList.add('nx-mobile-pwa');
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!mobile || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(error => console.warn('[PWA] Service worker unavailable:', error));
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
