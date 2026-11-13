# NEXORA Security Follow-Up — 2026-11-13

## What the screenshot-based re-audit got right and wrong

The screenshot was based on an older Git revision:
- `src/server/adminPassword.ts` on current main has **no `FOUNDER_EMAILS` array**. The password-policy banned email list is sourced from `FOUNDER_EMAIL` and `ADMIN_EMAILS` runtime environment, plus an explicit optional caller-provided email. Administrator authorization is resolved through Firestore `_admin_admins`.
- The global Express error handler already returned a generic error response on current main, contrary to the screenshot.
- The screenshot correctly identified **still-unmasked errors elsewhere** in `src/server/cmsEndpoints.ts` and the missing upload signature validation.

## Changes in this follow-up

1. **CMS error confidentiality** — 12 CMS database error handlers no longer return `err.message`; each returns an operation-specific constant. Existing server console logging remains for diagnostics.
2. **Remaining API error confidentiality** — masking of admin email-diagnostics configuration errors, mail-provider failures, OTP throttle messages, password-reset configuration errors, and generic registration error branches. Expected typed business validation continues through a safe code-to-message whitelist.
3. **File authenticity check** — new `src/server/imageValidation.ts` checks Base64 syntax, canonical encoding, actual PNG/JPEG/WebP file signatures, declared MIME match and size. Rejects SVG, HTML, unsupported MIME, and spoofed file headers. **A magic-byte check alone is not a complete binary decoder or malware scanner**.
4. **Image library URL safety** — rejects `javascript:`, `file:`, HTTP, scheme-relative, credentials-bearing URLs and invalid image data URLs. Allows intended local asset paths, HTTPS URLs, and validated PNG/JPEG/WebP data URLs.
5. **Upload parsing safety** — the image upload JSON parser now runs *after* authenticated elevated-admin verification. Ordinary API requests retain their 100 KB body limit; authenticated images have a 3 MB JSON limit and 2 MB decoded-image limit.
6. **Admin session logout** — `/api/admin/logout-session` no longer returns success if persistent Firestore revocation fails. Retains clear-cookie behavior and explicit 401 for invalid tokens.
7. **Regression tests** — new tests for signature/MIME spoofing, URL schemes, oversize content, redaction of CMS exception details, image endpoint authorization-before-parsing and admin error conditions.

## Evidence from isolated Vercel Sandbox

- `npm run typecheck`: **PASS** (0 errors).
- `npm test`: **PASS**, 32 files, **179 tests**.
- `npm run build`: **PASS** (Vite and esbuild server).
- Tests are mostly isolated unit and route tests. Authenticated production uploads, browser rendering, Firebase Rules Emulator, and live OTP delivery are not covered by these test results.

## Open risks and follow-ups

- Confirm the deployed Firestore and Storage security rules in Firebase itself. Current `tests/rules.test.ts` is a deterministic model, **not the Firebase emulator**.
- The image endpoint stores in local `public/images/uploaded` when writable; on serverless read-only deployments it returns a validated data URL as a fallback. This is not durable blob storage. A separate Firebase Storage upload workflow is needed for reliable long-lived images.
- Magic-byte validation does not prove full image decodability; use a reputable decoder/transcoder and antivirus/format policies if untrusted uploads are processed on the server.
- Verify the production response and real authenticated admin session revocation, OTP delivery and attachment workflows with owner-controlled identities; do not exercise privileged endpoints with synthetic production accounts.
- Firebase client web API keys are intentionally public identifiers. Restrict them in Google Cloud and enforce Firebase Security Rules rather than treating browser-visible keys as secrets.

## Git/Deployment scope

Changes only on the `security/upload-errors-regression-20261113` branch prior to merging to `main` through a reviewed PR. All unmodified frontend, intro/fog/zoom, homepage, and Team presentation files remain unchanged.
