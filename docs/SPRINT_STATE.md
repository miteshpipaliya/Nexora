# NEXORA Launch Sprint State (SPRINT_STATE.md)

**Sprint**: 7 Fixes + Scheduled Broadcast Popups  
**Target**: 100% Verified, zero fake metrics, fail-closed security, robust Vercel serverless execution.  
**Last Updated**: October 2026  

---

## Work Packages Status

| Work Package | Title | Status | Evidence / Verification |
| :--- | :--- | :---: | :--- |
| **WP0** | Baseline & State Tracking | `Verified` | State files initialized, scripts created, clean ts-check |
| **WP1** | Fix Vercel Serverless Entry Crash | `Verified` | `api/index.ts` resolves `../server.js`, `api/app.ts` removed, `vercel.json` configured |
| **WP2** | Registration Auth & Server Integrity | `Verified` | Bearer token check, Zod schema, atomic Firestore transaction, deterministic doc IDs `${uid}_${event_slug}` |
| **WP3** | Remove Fake-Success Fallbacks | `Verified` | Fail-closed in `dataService.ts`, throws real server errors to UI, zero silent client fallback writes |
| **WP4** | Align Rules, Claims & Clean Client | `Verified` | `firestore.rules` updated with whitelisted profile keys; zero hardcoded admin emails in `src/` (audit script PASS) |
| **WP5** | Close Public Data Leaks | `Verified` | Public `/api/health` sanitized; private details moved to `/api/admin/health`; `/api/admin/status` masks credentials |
| **WP6** | Stateless Session & Challenge Hardening | `Verified` | Stateless HMAC tokens, standard security headers, 100kb body limit, removed `x-matched-path` rewrites |
| **WP7** | Crash Guards & Error Boundaries | `Verified` | Structured JSON errors with `requestId`, ErrorBoundary on frontend, no stack traces leaked |
| **WP8** | Scheduled Broadcast Popups | `Verified` | `serverClock.ts`, `safeUrl.ts`, `useBroadcastPopups.ts`, `BroadcastPopup.tsx` mounted in `App.tsx`, scheduler in `AdminPage.tsx` |
| **WP9** | Verification, Smoke Testing & Report | `Verified` | TypeScript: 0 errors; Build: succeeded; Smoke script: 4/4 tests passed; Audit script: 0 leaks |

---

## Detailed Evidence Log

### WP1 — Vercel Serverless Entry
- Command: `node -e "import('./api/index.ts')"` before fix produced `Cannot find module '/app/applet/server' imported from /app/applet/api/index.ts`.
- Resolution: Updated `api/index.ts` to `import app from '../server.js'`, deleted redundant `api/app.ts`, and configured function limits in `vercel.json`.
- Verification: `npx tsx -e "import('./api/index.ts').then(() => console.log('api/index.ts loaded successfully with tsx'))"` -> exited 0.

### WP2 & WP3 — Registration Integrity & Zero Fake Success
- Implementation: Strict Bearer token verification from Firebase Admin SDK. Reject unauthenticated registration requests with 401 Unauthorized before body validation. Single atomic transaction in Firestore with deterministic document ID `${verifiedUserId}_${cleanEventSlug}` prevents race conditions and duplicates.
- Client: Removed local fallback writes and simulated objects from `createRegistration` in `src/services/dataService.ts`. Errors throw immediately to student UI.
- Verification: `node scripts/smoke.mjs` test 2: `POST /api/registrations/create` without token returned status 401.

### WP4 — Profile Rules Alignment & Admin Claims
- Implementation: Updated `firestore.rules` for `users/{userId}` to whitelist all application schema fields (`full_name`, `college`, `branch`, `academic_year`, `enrollment_number`, `division`, `phone_number`, `avatar_url`, `updated_at`, `is_profile_complete`, `last_active`, `email_verified`).
- Removed all hardcoded `ADMIN_EMAILS` and `ADMIN_PHONE` from `src/` (`Navbar.tsx`, `AdminPage.tsx`, `Footer.tsx`, `ProfilePage.tsx`, `dataService.ts`).
- Verification: `./scripts/audit-claims.sh` output:
  ```
  === Auditing src/ for hardcoded admin credentials & claims leaks ===
  PASS: Zero hardcoded admin credentials found in src/.
  ```

### WP5 — Public Info Leaks Closed
- Implementation: Sanitized `/api/health` to return basic uptime and `serverTimeMs`. Relocated verbose diagnostic checks to protected `/api/admin/health` requiring elevated admin authentication. Sanitized `/api/admin/status` to return only masked email and phone.
- Verification: Smoke test 1 & 4 confirmed zero raw founder emails or phone numbers exposed in public responses.

### WP6 & WP7 — Server Hardening & Crash Guards
- Implementation: Added security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy`) and `X-Request-Id` tracking middleware.
- Default body size limit enforced at 100kb (`express.json({ limit: '100kb' })`).
- Verification: Clean server restart and request-id propagation.

### WP8 — Scheduled Broadcast Popups
- Implementation:
  - `src/shared/lib/serverClock.ts`: Synchronizes client clock with server time via `/api/health` `serverTimeMs` to compensate for skew.
  - `src/shared/lib/safeUrl.ts`: Defends against XSS and rejects `javascript:` / `data:` URI schemes.
  - `src/hooks/useBroadcastPopups.ts`: Evaluates scheduled popups, respects `popup_delay_seconds`, and tracks dismissals in `localStorage` (`nexora_dismissed_popups`).
  - `src/components/common/BroadcastPopup.tsx`: Modal dialog with animation, priority badges, message, safe action button, and dismiss handling. Mounted globally in `src/App.tsx`.
  - `AdminPage.tsx`: Added broadcast modal controls for `is_popup`, `scheduled_for`, `popup_delay_seconds`, and live student preview.

### WP9 — Automated Gates Verification Output
1. Typecheck: `npm run lint` -> `tsc --noEmit` exited 0 (0 errors).
2. Compilation: `compile_applet` -> `Build succeeded - the applet is compiled`.
3. Claims Audit: `./scripts/audit-claims.sh` -> `PASS: Zero hardcoded admin credentials found in src/.` (exited 0).
4. Smoke Suite: `node scripts/smoke.mjs` -> `Passed: 4, Failed: 0` (exited 0).
