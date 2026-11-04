# Architecture & Engineering Decisions

## DEC-001: Local Branching and Squash Merging
- **Context**: In this environment, remote GitHub PR workflows and push access are not available.
- **Decision**: Develop each work package in a dedicated local branch (`chore/sprint-baseline`, `fix/vercel-entry-crash`, `fix/registration-auth`, etc.), run gates on the branch, and squash-merge into `main` using conventional commits.

## DEC-002: Test Runner and Dependencies
- **Context**: Need fast, reliable unit testing for client and server, DOM testing, and rules validation.
- **Decision**: Added `vitest`, `jsdom`, `@testing-library/react`. Vitest shares Vite configuration effortlessly and supports ESM out-of-the-box.

## DEC-003: Registration Pricing (BVM vs External)
- **Context**: Event registration fees must be computed strictly server-side to prevent client tampering.
- **Decision**: Verified Terms and competition guidelines: BVM students are charged ₹50 per participant, and External students ₹70 per participant (multiplied by team size for team events). Stored as integer amounts in INR; `payment_status` initialized to `'Unpaid'`.

## DEC-004: Stateless Admin Sessions via Signed HMAC Tokens
- **Context**: Admin authentication previously used in-memory maps (`activeAdminSessions`, `verifiedPasswordTokens`), which fail in Vercel serverless functions across cold starts and isolated lambda instances.
- **Decision**: Implement stateless HMAC tokens `{ purpose, sub, exp, jti }` with cryptographic signatures. Persistent state (revocation list, challenge attempts, rate limits) stored in Firestore Admin SDK documents (`_admin_challenges/{jti}`, `_revoked_sessions/{jti}`, `_admin_ratelimits/{key}`).

## DEC-005: Admin Password Storage
- **Context**: Admin password hash was previously written to `/tmp`, vanishing on cold starts.
- **Decision**: Admin password hash (scrypt) is stored in Firestore document `_admin_security/founder` with optional override via `ADMIN_SECURITY_PASSWORD` environment variable. Never write passwords to `/tmp` in production.

## DEC-006: Scheduled Broadcast Popups Architecture
- **Context**: Announcements need delayed site-wide popups without content leaks.
- **Decision**:
  - `siteMeta/broadcastSchedule` contains public non-sensitive timing entries `[{ id, display_at_ms }]` so non-admins know when to trigger the modal.
  - Full announcement content in `notifications/{id}` is security-rule-protected until `display_at <= request.time`.
  - Server clock skew is synchronized against `GET /api/health` response header `Date`.

## DEC-014: Scrypt Admin Password Persistence & Explicit Database Target
- **Context**: The admin password hash was vulnerable to ephemeral container wipes or default Firestore project drift.
- **Decision**: Created dedicated `src/server/adminSecurity.ts` using Node.js `crypto.scrypt` with a 16-byte cryptographically random salt and Unicode NFKC normalization. Persisted to authoritative database ID `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b` under `_admin_security/founder`. Implemented CLI management tool `scripts/admin-password-cli.ts`.

## DEC-015: Modular Brevo Mailer & Strict Domain Verification
- **Context**: Password reset OTP delivery failed silently when Brevo credentials or sender domains were misconfigured.
- **Decision**: Built `src/server/brevoMailer.ts` evaluating `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` strictly at invocation time (trimmed). Explicitly rejects `@gmail.com` unverified senders with `EMAIL_NOT_CONFIGURED` status 503. Added 10-second `AbortController` timeout and safe client error mapping. Provided admin diagnostic endpoint `GET /api/admin/email-diagnostics`.

## DEC-016: Team Role Responsibility Hierarchy & Free-Text Division Input
- **Context**: Faculty advisors needed clear placement (#2) below the Founder (#1), and predefined classroom division dropdowns caused friction.
- **Decision**: Refactored team roles to reflect responsibility: Founder (1), Faculty Member (2), Tech Ops (3), Full-Stack Lead (4), Event Coordinator (5), Design Director (6), PR Outreach (7), Volunteer (8). Enabled numeric order editing in Admin CMS. Replaced Division dropdown with free-text input (1–20 chars) and removed obsolete Divisions CRUD tab.

## DEC-017: Competition Seat Limit Switch (`show_capacity`)
- **Context**: Organizers need the option to obscure seat capacity limits on high-demand or open-ended events.
- **Decision**: Added boolean `show_capacity` (default: true) to `CompetitionEvent`. When enabled, renders `{registered_count} / {capacity} registered` + progress bar. When disabled, hides capacity number and progress bar, rendering singular/plural student count (e.g., "Be the first to register", "1 student registered", "12 students registered") via standardized `RegistrationCounter.tsx`.

## DEC-018: WhatsApp-Style Broadcast Notification Toast
- **Context**: Fullscreen popup modals interrupted navigation and lacked immediate mobile responsiveness.
- **Decision**: Created `BroadcastToast.tsx` sliding in from the right edge with a max stack of 3, 10s auto-dismiss timer, hover pause, Web Audio chime with persistent mute toggle, 5-minute age cutoff, and cross-tab dismissal synchronization via window `storage` events.

## DEC-019: Content Copy Deterrent & Form Usability Guard
- **Context**: Prevent unauthorized public scraping and casual copying while retaining full accessibility and form interactivity.
- **Decision**: Applied CSS `user-select: none` on public body while enforcing `user-select: text !important` on `input, textarea, select, [contenteditable="true"], .allow-select, pre, code`. Mounted `CopyGuard.tsx` intercepting clipboard and contextmenu events only on non-input public elements, completely bypassed on `/admin` routes.

## DEC-020: Canonical Trust Signals & Google Logo Structured Markup
- **Context**: Search engines lacked explicit Organization identity and square app icons.
- **Decision**: Added square icon suite (16x16, 32x32, 48x48, 192x192, 512x512) and `<link rel="canonical" href="https://www.nexora-bvm.online/" />`. Configured Schema.org Organization JSON-LD linking official logo, BVM parent organization, contact endpoints, and GitHub repository. Created `robots.txt` and `sitemap.xml`.

## DEC-021: Admin Password Storage Precedence & Lockout Architecture (Package B)
- **Context**: Ephemeral memory caching caused password updates or resets to be ignored by surviving serverless instances. Stale environment variables could override newly updated passwords.
- **Decision**: The stored scrypt hash in Firestore document `_admin_security/founder` is the definitive source of truth once initialized. `ADMIN_SECURITY_PASSWORD` is ignored with a warning when a database record exists. Implemented a 30-second TTL cache for security credentials. Implemented failed attempt tracking that locks out the IP for 15 minutes (HTTP 423) after 5 consecutive failures. Storage failures yield HTTP 503 and are never masked as incorrect passwords. Added `/admin/auth/change-password` endpoint to allow password rotation from within an active session.

## DEC-022: Brevo Sender Domain Hardening & Typed Safe Client Codes (Package A)
- **Context**: Unverified `@gmail.com` sender addresses caused Brevo API rejections that leaked internal error details to users.
- **Decision**: Removed all default `@gmail.com` sender fallbacks in the mailer. At call time, credentials and sender addresses are trimmed with quotes stripped. Free-mail domains (gmail, yahoo, outlook, proton, etc.) fail closed immediately with `EMAIL_SENDER_INVALID` (HTTP 503) without making Brevo calls. Authenticated domains are cached for 5 minutes (`GET /v3/senders/domains`), with Brevo API lookup failures treated as non-blocking warnings. Returns typed safe error codes (`EMAIL_NOT_CONFIGURED`, `EMAIL_SENDER_INVALID`, `EMAIL_PROVIDER_REJECTED`, `EMAIL_TIMEOUT`, `EMAIL_RATE_LIMITED`).

## DEC-023: Zero-PII Health & Minimal Admin Status Projection (Package C)
- **Context**: `/health` previously returned detailed internal infrastructure configuration, and `/admin/status` leaked masked email and phone strings to unauthenticated visitors. Header rewrites (`x-matched-path`) created SSRF/route forgery risks.
- **Decision**: `/health` returns only `{ status: "ok" }`. `/admin/status` returns only `{ success: true, initialized: boolean }`. Deleted `x-matched-path` and `x-forwarded-uri` header rewrites. Added process-level `unhandledRejection` and `uncaughtException` logging to prevent server termination. Removed `bun.lock` and regenerated clean `package-lock.json` tested with `npm ci`.

## DEC-024: Synthesized Two-Tone Web Audio Chime & Multi-Tab Sound Deduplication (Package D)
- **Context**: Visitor popups needed sound alerts without using copyrighted assets or triggering browser autoplay blocks. Multiple open tabs could cause echo or overlapping audio playback.
- **Decision**: Synthesized an original two-tone sine chime (A5 880 Hz -> E6 1320 Hz, ~120ms each, soft exponential envelope, volume 0.35) using native Web Audio API. AudioContext is initialized lazily and unlocked on the first user interaction (pointerdown, keydown, touchstart). Implemented multi-tab sound playback lock via `BroadcastChannel` and `localStorage` so only one tab sounds the chime while other open tabs display the visual toast silently. Added mute switch and sound test in `NotificationBell.tsx`.
