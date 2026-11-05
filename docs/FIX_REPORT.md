# NEXORA Engineering & Security Fix Report (v6)

**Execution Date:** 2026-11-04  
**Project:** NEXORA — Student Technology & Innovation Community (BVM)  
**Production URL:** https://www.nexora-bvm.online  
**Target Database:** `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`

---

## 1. Executive Summary & Verification Gates

All four engineering packages (Packages A, B, C, D) have been implemented, tested, and verified according to specification.

### Verification Gate Results:
1. **TypeScript Compilation (`npx tsc --noEmit`):**
   ```text
   Exit Code: 0 (Zero errors)
   ```
2. **Automated Test Suite (`npm test` / Vitest):**
   ```text
   Test Files: 12 passed (12)
   Tests:      64 passed (64)
   Duration:   23.00s
   ```
3. **Production Client & Server Build (`npm run build`):**
   ```text
   vite v8.3.5 building client environment for production...
   ✓ 1730 modules transformed.
   dist/index.html                     3.42 kB │ gzip:   1.26 kB
   dist/assets/index-DU4GZZiG.css    102.17 kB │ gzip:  14.36 kB
   dist/assets/index-DOV5fBeJ.js   2,252.08 kB │ gzip: 575.00 kB
   server.js                         108.5 kB  (esbuild ESM bundle)
   ⚡ Done in 35ms
   ```
4. **Vercel Builder Simulation & Zero-Credential Boot (`scripts/verify-vercel-build.sh`):**
   ```text
   Testing built function import with NO credentials...
   LOADED OK from .vercel/output/functions/api/index.func/api/index.js
   Health status: 200, body: {"status":"ok"}
   VERIFICATION SUCCESS: 200 OK
   ```
5. **Clean Dependency Lockfile & Installation (`npm ci`):**
   ```text
   Deleted bun.lock.
   Generated authoritative package-lock.json.
   added 495 packages, and audited 502 packages in 1m (npm ci passed with exit code 0).
   ```

---

## 2. Package Breakdown

### 2.1 Package A: Brevo Sender Domain Hardening & OTP Subsystem
- **Root Cause of Live Error:** Emails were defaulting to `nexora.bvm@gmail.com` when `BREVO_SENDER_EMAIL` was unset or set to a free-mail address. Brevo rejects transactional emails from unauthenticated `@gmail.com` senders.
- **Implementation in `src/server/brevoMailer.ts`:**
  - Removed all hardcoded `@gmail.com` sender fallbacks.
  - Configuration (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`) read strictly at invocation time, trimmed, with quotes stripped.
  - Prohibits free-mail domains (`gmail.com`, `yahoo.com`, `outlook.com`, `proton.me`, etc.) and fails closed immediately with typed `EMAIL_SENDER_INVALID` (HTTP 503) without making unnecessary Brevo API requests.
  - Compares sender domain against authenticated domains from Brevo API (`GET /v3/senders/domains`) cached for 5 minutes; Brevo lookup failures are logged as warnings and do not block delivery.
  - Enforces 10-second `AbortController` timeout on email requests.
  - Dispatches OTP emails with tags `['otp']`, 5-minute expiry, and HTML + plain text fallback.
  - Maps provider responses to safe client error codes: `EMAIL_NOT_CONFIGURED`, `EMAIL_SENDER_INVALID`, `EMAIL_PROVIDER_REJECTED`, `EMAIL_TIMEOUT`, `EMAIL_RATE_LIMITED`.
  - Founder Security Gate displays actionable hint for `EMAIL_SENDER_INVALID`: *"Set BREVO_SENDER_EMAIL to an address on your authenticated domain."*
  - Added admin-session diagnostic endpoint `GET /api/admin/email-diagnostics`.
- **Files Modified:** `src/server/brevoMailer.ts`, `server.ts`, `src/pages/Admin/AdminPage.tsx`.
- **Evidence:** 11 passing tests in `tests/email-delivery.test.ts`.

### 2.2 Package B: Brand-New Admin Password & Scrypt Storage
- **Implementation in `src/server/adminPassword.ts` and `scripts/admin-password-cli.ts`:**
  - Unified hashing and verification in a single shared module using `crypto.scryptSync` (N=16384, r=8, p=1, keylen=64).
  - 16-byte cryptographically random salt, Unicode NFKC normalization, and constant-time comparison via `crypto.timingSafeEqual`.
  - Stored record schema: `{ algorithm, params, salt, hash, passwordVersion, sessionsRevokedBefore, updatedAt }`.
  - Strict policy validation: >=12 characters, uppercase, lowercase, digit, special symbol, not equal to founder email, not equal to previous password.
  - **Precedence Rule:** Once initialized in Firestore document `_admin_security/founder`, the stored hash is the sole source of truth; any `ADMIN_SECURITY_PASSWORD` environment variable is ignored with a console warning.
  - Cached for at most 30 seconds; never outlives an update.
  - **Failed Attempt Lockout:** Tracks failed password attempts per IP. After 5 consecutive failures, the IP is locked out for 15 minutes, returning HTTP 423 with retry time.
  - **Storage Errors:** Database failures yield HTTP 503 and are never reported as "incorrect password".
  - **Active Session Rotation:** Added `POST /api/admin/auth/change-password` requiring current password, validating policy, incrementing version, revoking previous sessions, and writing back with read-back verification.
  - **CLI Tool (`npm run admin:password -- --set`):** Reads `FIREBASE_SERVICE_ACCOUNT` (raw or base64 JSON), prompts twice for password with hidden input, writes to named Firestore database, deletes challenges, and verifies read-back.
- **Files Modified:** `src/server/adminPassword.ts`, `src/server/adminSecurity.ts`, `scripts/admin-password-cli.ts`, `server.ts`, `tests/admin-password-persistence.test.ts`.
- **Evidence:** 7 passing tests in `tests/admin-password-persistence.test.ts`.

### 2.3 Package C: Security Hardening & Bug Fixes
- **C-01 (`firestore.rules`):** Eliminated hardcoded email list; `isAdmin()` requires `request.auth.token.admin == true && request.auth.token.email_verified == true`. Client bundle verified clean (0 occurrences of admin emails).
- **C-02 (User Profiles):** Added strict whitelist in `isValidUserProfile`: `id`, `email`, `full_name`, `phone`, `college`, `branch`, `semester`, `academic_year`, `created_at`, `updated_at`, `avatar_url`, `bio`. Immutable ID and verified token email match. Removed client trust of `user.is_admin`.
- **C-03 (Registrations):** Denied all client writes to `registrations` in `firestore.rules`. Creation handled exclusively server-side via transaction with idempotency key (`uid_slug`), zod validation, capacity enforcement, and server-computed fees.
- **C-04 (Read Receipts):** `userNotificationReads` restricted to `receiptId.matches('^' + request.auth.uid + '_.+')` and owner signed-in.
- **C-05 (Contact Messages):** Denied client direct writes; submissions handled via rate-limited server endpoint with size caps.
- **C-06 (Public Projection):** `firestore.rules` allows public reads only for `status == 'Published'`, `enabled == true`, and non-expired notifications.
- **C-07 (Named Database & Storage Rules):** `firebase.json` explicitly targets named database `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`. `storage.rules` restricts writes to admin claim, images only, max 5MB, with directory listing denied.
- **C-08 (PII Leaks & Header Rewrites):** `/admin/status` returns only `{ success: true, initialized: boolean }`. `/health` returns only `{ status: "ok" }`. Deleted `x-matched-path` and `x-forwarded-uri` header rewrites. Enforced `OTP_HMAC_SECRET` >= 32 chars in production.
- **C-09 (Security Headers):** `vercel.json` configures `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `HSTS`, and `Content-Security-Policy-Report-Only`.
- **C-10 (Pre-Login Rate Limits):** Pre-login endpoints enforced with IP rate limiting and lockout.
- **C-11 (Single Lockfile):** Deleted `bun.lock`, generated `package-lock.json`, verified `npm ci`.
- **B-01 (Crash Prevention):** Registered process-level `unhandledRejection` and `uncaughtException` handlers in `server.ts`.
- **B-02 (Structured Logs):** Structured logging across Firestore fallbacks.
- **B-03 (Finite Numbers):** Replaced `Number(x) ?? default` with `toFiniteNumber` across `cmsEndpoints.ts` and `dataService.ts`.
- **B-04 (CMS Validation & Error Boundaries):** Added per-route `<ErrorBoundary>` in `src/App.tsx`. Added `Array.isArray` guards for rules, judging criteria, FAQ, and ranked prizes in `DynamicCompetitionPage.tsx`.
- **B-05 (`/api/team/public`):** Added `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and field whitelist omitting sensitive enrollment numbers. Verified `Footer.tsx` event subscription cleanly unmounts listener.
- **B-06 (Persistent State):** OTP challenges stored in Firestore `_otp_challenges` with keyed HMAC hashes and expiration. Audit logs persisted to `adminAuditLogs`.
- **B-07 (Build Load Check):** Created and verified `scripts/verify-vercel-build.sh`.
- **B-08 (Migration Safety):** Scrypt module transparently supports legacy and updated hash structures.

### 2.4 Package D: WhatsApp-Style Broadcast Pop-Up with Sound
- **Toast Presentation (`src/components/common/BroadcastToast.tsx`):**
  - Positioned bottom-right on desktop; top-right under navigation bar on mobile.
  - WhatsApp-style layout in NEXORA violet theme: circular avatar with brand mark, bold title, message clamped to 3 lines, relative time label (`just now` / `now`), safe action link button, and close button.
  - Slides in from right in 250ms with subtle bounce and glow. Max stack: 3 toasts.
  - Auto-dismisses after 10 seconds; pauses timer while hovered or focused.
  - Urgent priority is sticky until closed.
  - Swipe right dismisses on touch devices.
  - Respects `prefers-reduced-motion` (fade transition only).
  - Renders title and message as plain text (never HTML).
- **Web Audio Chime (`src/shared/lib/notificationSound.ts`):**
  - Original synthesized two-tone sine chime (A5 880 Hz &rarr; E6 1320 Hz, ~120ms each, soft exponential envelope, calibrated volume ~0.35). Zero copyrighted files or external assets.
  - Lazy AudioContext initialization with unlock on first user gesture (`pointerdown`, `keydown`, `touchstart`).
  - Plays at most once per notification ID, throttled to 1 sound every 3 seconds.
  - Plays only for broadcasts that go live while the page is open (items older than 5 minutes do not toast).
  - Multi-tab playback claim via `BroadcastChannel` and `localStorage` lock: exactly one tab plays the sound; all other open tabs display the toast silently.
- **Notification Bell Integration (`src/components/ui/NotificationBell.tsx`):**
  - Bell unread badge increments immediately with pulse ring.
  - Document title updates dynamically to `(1) NEXORA` when tab is hidden.
  - Speaker switch (Sound on / off) and "Test sound" button in bell dropdown; stored in `localStorage` (`nexora_notif_sound`).
  - Read state synchronized to Firestore collection `userNotificationReads` (`uid_notificationId`) for signed-in users and `localStorage` for visitors.
- **Evidence:** 9 unit tests passing in `tests/broadcast-toast.test.ts`.

---

## 3. Owner Manual Checklist (Exact Order of Execution)

1. **Brevo Domain Configuration:**
   - Log into [app.brevo.com](https://app.brevo.com) &rarr; **Senders, Domains & Dedicated IPs** &rarr; **Domains** &rarr; Add `nexora-bvm.online`.
2. **BigRock DNS Records:**
   - Log into [bigrock.in](https://www.bigrock.in) &rarr; Manage Orders &rarr; `nexora-bvm.online` &rarr; **DNS Management**.
   - Add the Brevo TXT verification record, DKIM TXT record (`mail._domainkey`), and DMARC TXT record (`_dmarc`).
3. **Brevo Sender Activation:**
   - Once authenticated in Brevo, add Sender `no-reply@nexora-bvm.online` with name `NEXORA`.
   - In Brevo &rarr; **Security** &rarr; **Authorised IPs** &rarr; Turn IP blocking **OFF**.
4. **Vercel Environment Variables:**
   - In Vercel &rarr; Settings &rarr; Environment Variables:
     - Set `BREVO_SENDER_EMAIL` = `no-reply@nexora-bvm.online`
     - Set `BREVO_SENDER_NAME` = `NEXORA`
     - Update `BREVO_API_KEY` with a freshly generated key (without quotes).
     - Set new `OTP_HMAC_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
     - Delete `ADMIN_SECURITY_PASSWORD` if present.
   - Go to **Deployments** &rarr; **Redeploy**.
5. **Set Admin Password via CLI:**
   - In PowerShell:
     ```powershell
     $env:FIREBASE_SERVICE_ACCOUNT = Get-Content ./firebase-service-account.json -Raw
     npm run admin:password -- --set
     Remove-Item Env:FIREBASE_SERVICE_ACCOUNT
     Remove-Item ./firebase-service-account.json
     ```
6. **Verify Admin Login:**
   - Log into `/admin` with the newly configured password.

---

## 4. Contact Form & Live Online/Offline Status (Prompts v1)

### 4.1 Footer Contact Form (`POST /api/contact/submit`)
- **Root Cause of 404:** The client was dispatching `POST /api/contact/submit`, but the route was missing from Express; the server catch-all `app.use('/api', ...)` returned `API route not found: POST /api/contact/submit`.
- **Implementation in `server.ts` & `Footer.tsx`:**
  - Added `POST /contact/submit` to `apiRouter` with Zod validation (name, email, message, submissionId).
  - Silent honeypot trap to eliminate automated bot spam.
  - Salted HMAC-SHA256 IP rate limiting (3 requests per 10 minutes) without storing raw IP addresses.
  - Email rate limiting (5 requests per 24 hours per email address) and global volume cap (100 per 24 hours).
  - Idempotency via client UUID `submissionId` in Firestore collection `contactMessages`.
  - Transactional email notification dispatched to organizer (`CONTACT_NOTIFY_EMAIL`).
  - Added elevated admin retry endpoint `POST /api/admin/contact-messages/:id/retry-email`.
  - Added Resend Notification Email action with live spinner in Admin Visitor Messages inbox.

### 4.2 Real-time Student Online/Offline Presence
- **Root Cause of Permanent Offline:** Registered students table checked `s.last_active` which was never written to Firestore; heartbeats went to an unauthenticated in-memory Map wiped on serverless cold starts; client lacked permission to read `userPresence`.
- **Implementation in `presenceService.ts` & `AdminPage.tsx`:**
  - Lease-based tracking in `presenceSessions/{sessionId}`: 1 document per browser tab with UUID in `sessionStorage`.
  - Continuous 45s heartbeat and 150s lease timeout.
  - Best-effort tab session deletion on `pagehide` without marking the student offline if other tabs are open.
  - Real-time `onSnapshot` listener in Admin with 10s local timer re-evaluation.
  - Amber alert banner in Admin when presence listener is unauthorized, displaying `Unknown · Presence unavailable`.
  - Online-only filter button toggle next to student search input.
  - Removed invented fake student fallback generator (`2208012001`, 3rd Year) from `dataService.getAllStudents`.

### 4.3 Final Comprehensive Verification Results
- **TypeScript:** `npx tsc --noEmit` exited 0 (Zero errors).
- **Test Suite:** `npm test` (Vitest): **29 test files passed, 163 tests passed (0 failures)**.
- **Build & Lint:** `npm run build` and `npm run lint` completed cleanly.

---

## 5. Blocked Items & Boundaries of Testing

- **Blocked Items:** None. All application code, tests, build scripts, and security rules compile cleanly.
- **What Was Not Verified (Owner Dependency):**
  - Live SMTP email dispatch to an external inbox via Brevo cannot be completed until the owner publishes the DNS records in BigRock and redeploys Vercel.
  - Live deployment of `firestore.rules` and `storage.rules` to the remote Firebase production project requires the owner's Firebase CLI deployment token (`firebase deploy --only firestore:rules,storage`).
  - Google reCAPTCHA v3 / Firebase App Check enforcement in production requires the owner to configure site keys in Firebase Console.
