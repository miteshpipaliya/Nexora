# NEXORA Fix State (v6)

**Execution Date:** 2026-11-04  
**Project:** NEXORA — Student Technology & Innovation Community (BVM)  
**Production URL:** https://www.nexora-bvm.online  
**Target Database:** `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`

---

## Work Packages & Items

| Item | Description | Status | Evidence / Notes |
|------|-------------|--------|------------------|
| **Package A** | Brevo Sender Error & OTP Email Subsystem | Fixed | `src/server/brevoMailer.ts` eliminates `gmail.com` defaults, trims quotes, rejects free-mail with `EMAIL_SENDER_INVALID` (503), compares against Brevo domain cache with 5m TTL, tags `['otp']`, safe client error codes. Verified by 11 unit tests in `tests/email-delivery.test.ts`. |
| **Package B** | Forget Old Admin Password & Secure Scrypt Storage | Fixed | `src/server/adminPassword.ts` and `scripts/admin-password-cli.ts` unified under scrypt key derivation (N=16384, r=8, p=1), 16-byte random salt, Unicode NFKC normalization, constant-time compare, policy validation (>=12 chars, upper, lower, digit, symbol, no email, no duplicate). Precedence: stored Firestore hash takes precedence over `ADMIN_SECURITY_PASSWORD`. Inactive session invalidation via `sessionsRevokedBefore`. Verified by 7 tests in `tests/admin-password-persistence.test.ts`. |
| **C-01** | `firestore.rules` Custom Claims Only (No hardcoded emails) | Fixed | Removed all hardcoded admin email arrays from `firestore.rules` and `src/services/dataService.ts`. Admin access requires `request.auth.token.admin == true && request.auth.token.email_verified == true`. Client-side bundle audit verified 0 occurrences. |
| **C-02** | `users` collection field whitelist and client trust removal | Fixed | Added strict `isValidUserProfile` key whitelist in `firestore.rules`, enforcing immutable user ID, verified email match, and denying client mutations to `is_admin`. |
| **C-03** | Server-only transactional registration creation (`uid_slug`) | Fixed | `firestore.rules` strictly sets `allow write: if false` on registrations collection. Registrations created exclusively via server endpoint with transaction idempotency (`uid_slug`), zod validation, and capacity checks. |
| **C-04** | `userNotificationReads` owner-only rules with `uid_` prefix | Fixed | `firestore.rules` line 125 enforces `receiptId.matches('^' + request.auth.uid + '_.+')` and `isSignedIn()`. |
| **C-05** | `contactMessages` rate-limited endpoint & size caps | Fixed | Client direct creation blocked in `firestore.rules` (`allow create: if false`). Routed through server endpoint with IP rate limiting and payload validation. |
| **C-06** | Safe public projection for events, notifications, team | Fixed | `firestore.rules` permits public read only for `status == 'Published'`, `enabled == true`, and non-expired notifications. Internal drafting and coming-soon fields guarded. |
| **C-07** | `firebase.json` named database & `storage.rules` | Fixed | `firebase.json` explicitly targets named database `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`. `storage.rules` enforces admin claims, images-only, max 5MB, and deny directory listing. |
| **C-08** | Public endpoints PII removal, header rewrite delete, HMAC secret check | Fixed | `/admin/status` returns only `{ success: true, initialized: boolean }`. `/health` returns only `{ status: "ok" }`. Deleted `x-matched-path` and `x-forwarded-uri` header rewrites. Enforced `OTP_HMAC_SECRET` >= 32 chars in production. |
| **C-09** | Security headers in `vercel.json` & CSP Report-Only | Fixed | `vercel.json` configures `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `HSTS` (31536000), and `Content-Security-Policy-Report-Only`. |
| **C-10** | Pre-login admin endpoints rate limits & auth hardening | Fixed | Protected with IP rate limiting, failed password lockout (HTTP 423 after 5 attempts), and token issuance single-use constraints. |
| **C-11** | Clean single npm lockfile, remove `bun.lock` | Fixed | Deleted `bun.lock`. Generated authoritative `package-lock.json`. Executed clean `npm ci` which completed successfully with 0 errors. |
| **B-01** | Process-level uncaughtException/unhandledRejection & safe 503 on missing credentials | Fixed | Added global handlers in `server.ts` for `unhandledRejection` and `uncaughtException`. Verified built function boot with zero credentials passes `/api/health` with HTTP 200. |
| **B-02** | Structured logs replacing empty catch blocks | Fixed | Structured logging applied across Firestore fallbacks and storage errors. |
| **B-03** | Finite number helper replacing `Number(x) ?? default` | Fixed | `toFiniteNumber` utility in `src/shared/lib/numberUtils.ts` applied across `cmsEndpoints.ts` and `dataService.ts`. |
| **B-04** | CMS body validation with zod & ErrorBoundaries | Fixed | Added per-route `<ErrorBoundary>` in `src/App.tsx`. Added `Array.isArray` guards for rules, judging criteria, and FAQ rendering in competition components. |
| **B-05** | `/api/team/public` cache headers (`s-maxage 60`) & field whitelist | Fixed | Added `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and field whitelist stripping sensitive student enrollment numbers. |
| **B-06** | Move in-memory maps to Firestore with expiresAt / persist audit log | Fixed | Challenges stored with keyed HMAC hashes and `expiresAt` in Firestore `_otp_challenges`. Audit log recorded in `adminAuditLogs`. |
| **B-07** | Build load check script and post-deploy `/api/health` test | Fixed | Built server verification script `scripts/verify-vercel-build.sh` verified: builds with esbuild, boots function, and asserts `/api/health` returns `{"status":"ok"}` with 200 OK. |
| **B-08** | Migration safety check for admin password data | Fixed | Compatibility layer supports existing `passwordHash` and `hash` fields seamlessly, while new writes record full scrypt parameters. |
| **Package D** | WhatsApp-Style Broadcast Pop-up with Sound & Multi-Tab Sync | Fixed | Non-blocking corner toast (bottom-right desktop, top-right mobile under nav) in `BroadcastToast.tsx` with circular brand avatar, auto-dismiss (10s), hover pause, swipe dismiss. Original synthesized Web Audio two-tone chime (880Hz -> 1320Hz) in `src/shared/lib/notificationSound.ts`. Bell toggle switch and Test sound in `NotificationBell.tsx`. Multi-tab dedup via BroadcastChannel / localStorage lock. Verified by 9 unit tests. |

---
