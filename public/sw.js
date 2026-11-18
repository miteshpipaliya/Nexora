// NEXORA mobile PWA: online-first, never cache account, registration, admin or payment data.
const CACHE = 'nexora-mobile-offline-v3';
const OFFLINE = '/offline.html';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Never cache Vercel authentication HTML as an offline page.
    for (const path of [OFFLINE, '/pwa-phoenix-192.png']) {
      try {
        const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' });
        const type = response.headers.get('content-type') || '';
        const expected = path === OFFLINE ? 'text/html' : 'image/png';
        if (response.ok && type.includes(expected)) await cache.put(path, response);
      } catch (_) { /* Offline assets can be retried on next service-worker update. */ }
    }
  })());
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('nexora-mobile-offline-') && k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // No response caching for any live page. Serve the offline screen only on network failure.
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(OFFLINE)) || new Response(
      '<!doctype html><title>NEXORA Offline</title><h1>Connection required</h1><p>Reconnect to access NEXORA.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }));
});
