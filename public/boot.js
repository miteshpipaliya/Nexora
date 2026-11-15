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

// Paint the background first. Decode the image before beginning the CSS-only
// compositor animation so late image decoding cannot cause a mid-rise stall.
document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('nx-first-paint-gate');
  const logo = gate?.querySelector('img');
  if (!gate || !logo || document.documentElement.classList.contains('nx-intro-done')) return;
  const desktop = matchMedia('(min-width:1025px) and (hover:hover) and (pointer:fine)').matches;
  if (!desktop) return;
  const ready = logo.decode ? logo.decode().catch(() => {}) : Promise.resolve();
  ready.then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (gate.isConnected && !document.documentElement.classList.contains('nx-intro-ready')) {
        document.documentElement.classList.add('nx-boot-playing');
      }
    }));
  });
});
