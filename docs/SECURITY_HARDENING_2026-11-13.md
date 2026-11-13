# NEXORA Security Hardening Report — 2026-11-13

## Verification evidence
- Branch: `security/harden-audit-20261113` based on `main`.
- In an isolated Vercel Sandbox, `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` all completed with exit code 0.
- TypeScript errors: **0**.
- Vitest: **30 files, 172 tests passed**.
- Vercel preview for commit `3e163fa021978c663911bddf7ce5755995cfe02d`: **READY**.
- Production FOUNDER_EMAIL variable now configured in Vercel (value not included in report).
- Tests include contact rate-limit / honeypot behavior and admin lock, CORS, error handling, and restricted email diagnostic routes.
- Tests use mocks; **live Firebase Auth, Firestore security rules, admin OTP email receipt, and cross-device session revocation were not end-to-end tested**.

## Verified changes
- **P0-02**: Removed hard-coded founder email whitelist from `src/server/adminPassword.ts`; password policy uses environment configuration and optional injected identity. `server.ts` already used `FOUNDER_EMAIL`. Configured server-side FOUNDER_EMAIL in Vercel Production.
- **P0-03**: Emergency password override had already been removed from documentation/code; redacted personal contact enumeration from public recovery guide.
- **P0-04**: Elevated admin session already uses HttpOnly/SameSite cookies instead of sessionStorage. Fixed a separate critical mismatch: Firestore session documents had random IDs unrelated to the signed token JTI; now both use the same JTI. The server no longer silently accepts missing session storage.
- **P0-06 / P2-02**: Added the actual frontend `honeypot` field to spam detection. Replaced process-local contact throttles with a Firestore transaction atomically enforcing 3/IP/10 minutes, 5/email/day, 200 total/day; rate-limit document IDs do not expose raw email. Added tests.
- **P1-01**: Admin lock waits for durable revocation writes, returns 503 rather than false success on failures, and client lock flow awaits the server. Revocation recording no longer swallows storage errors. Added tests for unsigned/unauthenticated scenarios.
- **P1-02**: Masked several server-side 500 error messages and provider errors, including the Express error handler. Other typed/4xx errors intentionally retain actionable validation messages; a full exhaustive error-field leak audit remains open.
- **P1-03**: Existing explicit-origin CORS allowlist now omits localhost development origins in production; added denial test. CORS is not a substitute for authentication or CSRF.
- **P3-01**: Added 8 tests beyond the prior 164-test baseline (contact and admin-security regressions).
- **P3-04**: Updated README to accurately document Firebase/Firestore and correct server environment configuration.

## Findings that were already mitigated / not security defects on their own
- **P0-01**: Firebase **web client API keys are public app identifiers**, not privileged service-account secrets. The config JSON is imported at build time and remains tracked; moving the web API key into Vite variables would still expose it to browsers and would not fix inadequate Firestore/Storage rules. Restrict the Google Cloud API key and review authentication, App Check, and rules separately.
- **P0-05**: Current `storage.rules` permits public reads only under `banners/**` and `images/**`, with all other paths denied. Whether these exact rules are deployed in the actual Firebase project is **not verified**. Their deployment requires Firebase access.
- **P2-04**: No hardcoded OTP HMAC secret found: serverless requires a configured `OTP_HMAC_SECRET`; local development uses generated randomness. The production Vercel variable is present.
- **P2-01 / P3-02**: Multiple route aliases exist intentionally for backwards compatibility. They are not by themselves duplicate handlers or a vulnerability; not removed.

## Open / not fully verified
- **P2-03**: A comprehensive server-side MIME and content-type enforcement review for all user-upload endpoints was not completed.
- **P2-05**: Registration optimistic UI success-on-failure paths were not fully traced in browsers.
- **P3-03**: Magic-byte validation for each file-upload endpoint was not added.
- **P3-05**: Full unused-dependency audit/removal not completed.
- **P3-01 remainder**: Firestore/Storage rules emulator bypass tests and live OTP delivery tests not executed.
- The submitted report says 24 issues, but names only 18 distinct IDs (P2-01 and P3-02 overlap) and does not specify five additional low-priority findings. Unspecified issues cannot be honestly claimed as fixed.
- **Manual owner task**: Deploy and verify Firestore/Storage rules in Firebase; confirm intended public image locations, review API-key restrictions and App Check, and test real admin OTP and lock across two separate devices.
- **Potential remaining issue**: IP determination depends on forwarded-header trust; validate the production proxy chain and Vercel header behavior before relying on any IP-based throttle as a sole defense.

## Deployment notes
- Git pushes to `main` trigger a Vercel production deployment. Confirm the exact merged commit is READY, then exercise `/api/health`, contact, sign-in, OTP, and elevated admin flows with a real account. Never expose OTPs or credentials in CI logs.
