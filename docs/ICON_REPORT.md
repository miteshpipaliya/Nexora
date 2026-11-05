# NEXORA Brand Icon & Favicon Verification Report

**Date:** 2026-11-05  
**Canonical URL:** `https://www.nexora-bvm.online/`  
**Master Image:** `design/nexora-logo-master.png` (1254x1254, PNG, square)

---

## 1. Files Added, Modified & Generated

| File | Resolution / Type | Background | Purpose |
| :--- | :--- | :--- | :--- |
| `design/nexora-logo-master.png` | 1254x1254 PNG | #05010F / Black | Master high-resolution brand asset |
| `public/favicon.ico` | 16x16, 32x32, 48x48 ICO | #05010F solid | Windows & legacy browser tab icon |
| `public/favicon-16x16.png` | 16x16 PNG | #05010F solid | Compact browser tabs (tight 8% crop, sharpened) |
| `public/favicon-32x32.png` | 32x32 PNG | #05010F solid | Standard browser tabs (tight 8% crop, sharpened) |
| `public/favicon-48x48.png` | 48x48 PNG | #05010F solid | **Google Search base favicon** (tight 8% crop) |
| `public/favicon-96x96.png` | 96x96 PNG | #05010F solid | Google Search 2x retina display |
| `public/favicon-144x144.png` | 144x144 PNG | #05010F solid | Google Search 3x retina display |
| `public/apple-touch-icon.png` | 180x180 PNG | #05010F solid | iOS home screen bookmark |
| `public/icon-192.png` | 192x192 PNG | #05010F solid | Android Chrome & PWA manifest |
| `public/icon-512.png` | 512x512 PNG | #05010F solid | Android Chrome, PWA & Organization JSON-LD |
| `public/icon-maskable-512.png`| 512x512 PNG | #05010F solid | Android adaptive maskable icon (central 80%) |
| `public/manifest.webmanifest` | JSON manifest | #05010F | Standard PWA web manifest |
| `docs/icon-preview.png` | 800x600 PNG | Multi-palette | Visual preview across light and dark surfaces |

---

## 2. Real Verification Commands & Output

### 2.1 File & Dimension Verification
```bash
$ identify public/favicon.ico public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png public/favicon-96x96.png public/favicon-144x144.png public/apple-touch-icon.png public/icon-192.png public/icon-512.png public/icon-maskable-512.png

public/favicon.ico[0] ICO 16x16 16x16+0+0 8-bit sRGB
public/favicon.ico[1] ICO 32x32 32x32+0+0 8-bit sRGB
public/favicon.ico[2] ICO 48x48 48x48+0+0 8-bit sRGB
public/favicon-16x16.png PNG 16x16 16x16+0+0 8-bit sRGB
public/favicon-32x32.png PNG 32x32 32x32+0+0 8-bit sRGB
public/favicon-48x48.png PNG 48x48 48x48+0+0 8-bit sRGB
public/favicon-96x96.png PNG 96x96 96x96+0+0 8-bit sRGB
public/favicon-144x144.png PNG 144x144 144x144+0+0 8-bit sRGB
public/apple-touch-icon.png PNG 180x180 180x180+0+0 8-bit sRGB
public/icon-192.png PNG 192x192 192x192+0+0 8-bit sRGB
public/icon-512.png PNG 512x512 512x512+0+0 8-bit sRGB
public/icon-maskable-512.png PNG 512x512 512x512+0+0 8-bit sRGB
```

### 2.2 Local HTTP Header Responses
```bash
$ curl -sI http://127.0.0.1:3000/favicon-48x48.png
HTTP/1.1 200 OK
Content-Type: image/png

$ curl -sI http://127.0.0.1:3000/favicon.ico
HTTP/1.1 200 OK
Content-Type: image/x-icon
```

### 2.3 Automated Test Suite
```bash
$ npx vitest run tests/favicon.test.ts
✓ tests/favicon.test.ts (5 tests) 5ms
Test Files  1 passed (1)
     Tests  5 passed (5)
```

---

## 3. What Cannot Be Locally Verified
- **Google Search Live Refresh Date:** Googlebot crawls and re-indexes favicons on its own crawler schedule. Requesting indexing in Google Search Console accelerates re-crawling, which typically takes between a few days to two weeks.
- **Bing / DuckDuckGo Display:** Third-party engines maintain separate cache clusters and refresh independently.
