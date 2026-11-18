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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(error => console.warn('[PWA] Service worker unavailable:', error));
  }, { once: true });
}
