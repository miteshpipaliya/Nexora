// Installed mobile apps bypass all introductory gates and animations.
try {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (mobile && installed) {
    document.documentElement.classList.add('nx-mobile-pwa', 'nx-intro-done', 'nx-intro-ready');
  }
} catch (_) {}

// Preserve the original first-paint session gate logic before React starts.
try {
  if (sessionStorage.getItem('introPlayed') === 'true' && new URLSearchParams(location.search).get('intro') !== '1') {
    document.documentElement.classList.add('nx-intro-done');
  }
} catch (_) {}

// Inline onclick is blocked by the production script-src CSP; preserve the queued click.
document.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('#nx-first-paint-start')) {
    document.documentElement.dataset.nxIntroPending = '1';
  }
}, true);

