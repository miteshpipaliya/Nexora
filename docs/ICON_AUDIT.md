# NEXORA Icon & Search Asset Audit

**Date:** 2026-11-05  
**Canonical Host:** `https://www.nexora-bvm.online`  
**Master Image:** `design/nexora-logo-master.png` (1254x1254 square)

---

## 1. Initial State Audit

| Surface / Configuration | Previous State | Issues Identified | Resolution Applied |
| :--- | :--- | :--- | :--- |
| **`index.html` Head Links** | Disorganized link ordering: 16x16 preceded 48x48. Redundant 192x192 & 512x512 icon links. Theme-color `#0B0613`. | Googlebot-Image looks for 48x48 or multiples of 48. Small sizes declared first caused crawlers to drop icon. Theme-color was inconsistent with solid `#05010F` brand background. | Replaced with exact canonical order: `favicon.ico`, `favicon-48x48.png`, `favicon-96x96.png`, `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png`, `manifest.webmanifest`. Updated `theme-color` to `#05010F`. |
| **Icon Transparency & Padding** | Icons had semi-transparent glow over variable background. When scaled to 16-32px against Google's white results page, glow washed out and star points became faint. | Fine glow washed out on white background. Transparent corners without solid contrast reduced visibility. | Created opaque icons flattened on solid `#05010F`. Sizes 48px and below use tighter 8% crop with contrast/saturation boost to keep star points bold and prominent. |
| **Web Manifest** | `site.webmanifest` used `#0B0613` background and legacy filenames. | Standard specification recommends `manifest.webmanifest` with both `any` and `maskable` purpose definitions. | Created `public/manifest.webmanifest` (and synchronized `site.webmanifest`) with `#05010F`, `icon-192.png`, `icon-512.png` (any), and `icon-maskable-512.png` (central 80% safe area for Android). |
| **Robots.txt** | Generic allow rules without explicit paths for `/icon-*` or `/manifest.webmanifest`. | Crawlers might not prioritize or index deep icon assets. | Explicitly added `Allow: /favicon*`, `Allow: /apple-touch-icon*`, `Allow: /icon-*`, `Allow: /manifest.webmanifest`, `Allow: /site.webmanifest` for all user-agents and Googlebot-Image. |
| **Vercel Caching Headers** | Missing stale-while-revalidate for some icons. | Vercel CDN could serve stale fallback or fail to cache icons effectively for Googlebot. | Added `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` in `vercel.json` for all icon filenames. |
| **Structured Data** | Single Organization block with missing WebSite site-name block. | Google Search uses `WebSite` structured data to parse and display the site name next to the search icon. | Added dual JSON-LD blocks: `WebSite` with `name: "NEXORA"` and `alternateName: ["NEXORA BVM", "Nexora BVM"]`, and `Organization` with logo pointing to `https://www.nexora-bvm.online/icon-512.png`. |

---

## 2. Asset Inventory in `public/`

- `public/favicon.ico`: Multi-res icon containing 16x16, 32x32, 48x48.
- `public/favicon-16x16.png`: 16x16, tight crop, sharpened.
- `public/favicon-32x32.png`: 32x32, tight crop, sharpened.
- `public/favicon-48x48.png`: 48x48, tight crop, sharpened (Google base size).
- `public/favicon-96x96.png`: 96x96, full logo with 6% margin.
- `public/favicon-144x144.png`: 144x144, full logo with 6% margin.
- `public/apple-touch-icon.png`: 180x180, full logo.
- `public/icon-192.png`: 192x192, full logo (manifest).
- `public/icon-512.png`: 512x512, full logo (manifest & structured data).
- `public/icon-maskable-512.png`: 512x512, star & orbital arcs centered within 80% safe zone.
- `docs/icon-preview.png`: Multi-resolution visual comparison sheet.
