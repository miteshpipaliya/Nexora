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
