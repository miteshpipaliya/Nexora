# NEXORA Architectural & Engineering Decisions

## DECISION-01: Solid Brand Background (#05010F) for Favicons
- **Context:** The official logo features a glowing purple four-point star with delicate highlights. When rendered with raw alpha transparency on Google Search's default white background, the glow disappears and star tips look washed out and thin.
- **Decision:** All favicons and application icons are generated opaque with solid `#05010F` background matching the dark brand palette. Sizes 48px and below use a tighter crop with mild contrast boost and Lanczos scaling, ensuring immediate recognizability even at 16x16.
- **Status:** Verified and implemented in `scripts/generate-icons.mjs`.

## DECISION-02: Multi-Resolution Google Favicon Tags in Static `index.html`
- **Context:** Google Search requires a multiple of 48px square (`favicon-48x48.png`), crawlable via raw HTML without JavaScript injection.
- **Decision:** Declared `<link rel='icon' href='/favicon.ico' sizes='16x16 32x32 48x48'>` followed immediately by `<link rel='icon' type='image/png' sizes='48x48' href='/favicon-48x48.png'>` and `<link rel='icon' type='image/png' sizes='96x96' href='/favicon-96x96.png'>` in static `index.html`.
- **Status:** Verified and tested.

## DECISION-03: Real-Time Presence via Firestore `presenceSessions` with Distributed Lease
- **Context:** In-memory presence tracking fails on serverless functions due to cold starts and instance isolation. Static document timestamps on user profiles do not provide live status.
- **Decision:** Each student tab creates a short-lived document in `presenceSessions/{sessionId}` with `lastSeen` updated every 45s. A user is classified as **Online** if at least one session was updated within the last 150 seconds. On tab unload (`pagehide`), a best-effort delete removes only that tab's session, preserving multi-tab resilience.
- **Status:** Architecture implemented in `src/services/presenceService.ts` and Firestore security rules.

## DECISION-04: Footer Contact Form API Route with Server-Side Abuse Prevention
- **Context:** `POST /api/contact/submit` was returning 404 because the Express route was not registered, while client forms called it directly.
- **Decision:** Register `POST /api/contact/submit` on `apiRouter` with Zod validation, salted IP hashing (no raw IPs stored), per-IP (3 per 10 min) and per-email (5 per day) rate limits, idempotency via `submissionId`, and persistent storage in Firestore collection `contactMessages`. Dispatches Brevo transactional notification to `CONTACT_NOTIFY_EMAIL`.
- **Status:** Implemented in `src/server/contactEndpoint.ts`.
