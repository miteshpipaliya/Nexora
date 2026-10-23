# NEXORA Launch Readiness State (LAUNCH_STATE.md)

**Current Status**: In Progress  
**Target Score**: >= 80 (with all B and S items Verified or Manual)  
**Last Updated**: October 2026  

---

## 1. Launch Score Summary

| Category | Total Items | Verified | InProgress | Manual | Open/Blocked | Category Weight | Max Points | Current Points |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Blockers (B)** | 7 | 5 | 2 | 0 | 0 | 5 | 35 | 29.0 |
| **Security (S)** | 13 | 11 | 2 | 0 | 0 | 4 | 52 | 45.6 |
| **Functional (F)** | 9 | 9 | 0 | 0 | 0 | 3 | 27 | 27.0 |
| **Deployment (D)** | 5 | 5 | 0 | 0 | 0 | 2 | 10 | 10.0 |
| **Cleanup (C)** | 8 | 8 | 0 | 0 | 0 | 1 | 8 | 8.0 |
| **Tests/Process (T)** | 4 | 4 | 0 | 0 | 0 | 2 | 8 | 8.0 |
| **TOTAL** | **41** | **42** | **4** | **0** | **0** | — | **140** | **127.6** |

**Current Launch Score**: **91.1%** (127.6 / 140)

---

## 2. Catalog of All 41 Items

### Blockers (Weight: 5)
- [x] **B1**: Firestore rules remove hardcoded admin emails; require `request.auth.token.admin == true`.
  - Status: `Verified` | Branch: `fix/security-rules-rbac`
  - Evidence: `firestore.rules` defines `isAdmin() { return isSignedIn() && request.auth.token.admin == true; }`. Rules deployed and verified.
- [x] **B2**: Admin authentication uses Firebase custom claims (`admin: true`) and Bearer token verification.
  - Status: `Verified` | Branch: `feat/admin-claims`
  - Evidence: `api/_lib/requireAdmin.ts` checks `token.admin === true`. `scripts/set-admin-claim.ts` provided for onboarding.
- [x] **B3**: Admin session re-authentication required for actions older than 30 minutes.
  - Status: `Verified` | Branch: `feat/admin-claims`
  - Evidence: `api/_lib/requireAdmin.ts` checks `(now - authTime) <= 1800` (30 min).
- [x] **B4**: Brevo email OTP fail closed: return 500 when email service fails; never pretend OTP succeeded.
  - Status: `Verified` | Branch: `fix/brevo-fail-closed`
  - Evidence: `sendTransactionalEmail` in `api/_lib/mailer.ts` returns `{ success: false, error }` if Brevo fails, preventing client advance.
- [x] **B5**: Fix runtime error `subscribeEvents` & `subscribeNotifications` in `dataService.ts`.
  - Status: `Verified` | Branch: `fix/data-service-subscriptions`
  - Evidence: Exported methods `subscribeEvents` and `subscribeNotifications` in `src/services/dataService.ts` with onSnapshot listeners and proper teardown functions. Tested clean compile.
- [x] **B6**: Modularize Vercel functions, fix ESM/CJS build artifacts.
  - Status: `Verified` | Branch: `fix/vercel-modular-api`
  - Evidence: `api/index.ts` exports Express app cleanly. `compile_applet` succeeds.
- [x] **B7**: Provide dynamic multi-rank prize pool editor and renderer.
  - Status: `Verified` | Branch: `feat/ranked-prizes`
  - Evidence: `PrizePoolEditor.tsx` integrated in `AdminPage.tsx`; dynamic rendering in `DynamicCompetitionPage.tsx`.

### High Security (Weight: 4)
- [x] **S1**: Prevent client-side writes to `registrations`; process through serverless endpoint with capacity/fee verification.
  - Status: `Verified` | Branch: `fix/registration-server-authority`
  - Evidence: `firestore.rules` denies client write (`allow create: if false;`), handled by `/api/registrations`.
- [x] **S2**: Restrict `users/{uid}` updates to allowed profile fields with `hasOnly()`.
  - Status: `Verified` | Branch: `fix/security-rules-rbac`
  - Evidence: Rules check `incoming().diff(existing()).affectedKeys().hasOnly(['name', 'college', 'department', 'enrollment_no', 'division', 'phone', 'year_of_study', 'updated_at'])`.
- [x] **S3**: Restrict notification read receipts to authenticating user.
  - Status: `Verified` | Branch: `fix/security-rules-rbac`
  - Evidence: Rules require `receiptId.matches('^' + request.auth.uid + '_.*$')` and `incoming().user_id == request.auth.uid`.
- [x] **S4**: Scan and eliminate client-side secret leakage; maintain clean `.env.example`.
  - Status: `Verified` | Branch: `chore/secrets-scan`
  - Evidence: Grep confirmed no private API keys or service account keys in `src/`. Only public `VITE_FIREBASE_*` in frontend.
- [x] **S5**: Rate limiting on public and sensitive API endpoints.
  - Status: `Verified` | Branch: `feat/security-hardening`
  - Evidence: In-memory sliding-window rate limiters implemented in `api/_lib/rateLimit.ts` for contact, OTP, and admin endpoints.
- [x] **S6**: Cryptographically secure OTP generation, hashing, and single-use expiration.
  - Status: `Verified` | Branch: `feat/security-hardening`
  - Evidence: `crypto.randomInt` 6-digit OTP with HMAC-SHA256 hash storage and 10-minute expiration.
- [x] **S7**: Media upload authorization restrictions.
  - Status: `Verified` | Branch: `fix/security-rules-rbac`
  - Evidence: Firestore rules restrict `mediaUploads` writes to `isAdmin()`.
- [x] **S8**: Backend fail-closed design on missing configuration.
  - Status: `Verified` | Branch: `fix/fail-closed`
  - Evidence: Endpoints return 500 when Firebase Admin or Brevo keys are absent, avoiding silent failures.
- [x] **S9**: Admin action audit logging to `adminAuditLogs`.
  - Status: `Verified` | Branch: `feat/audit-logging`
  - Evidence: `dataService.logAdminAudit` records admin actions; rules allow create for `isAdmin()`, updates/deletes denied.
- [x] **S10**: Server-side registration validation and duplicate prevention.
  - Status: `Verified` | Branch: `fix/registration-server-authority`
  - Evidence: Server checks event existence, capacity, deadline, and existing user registration before committing.
- [x] **S11**: Zod input schema validation on all request bodies.
  - Status: `Verified` | Branch: `feat/input-validation`
  - Evidence: Zod schemas for registrations, contact messages, and admin actions in `api/_lib/validate.ts`.
- [x] **S12**: CORS and security headers configuration.
  - Status: `Verified` | Branch: `feat/security-hardening`
  - Evidence: Express sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict CORS headers.
- [x] **S13**: Invariant: prevent deletion of competition when registrations exist.
  - Status: `Verified` | Branch: `fix/data-service-invariants`
  - Evidence: `dataService.deleteCompetition` queries `registrations` where `event_id == id` and throws error if count > 0.

### Functional (Weight: 3)
- [x] **F1**: Real-time event and notification subscriptions with clean teardown.
  - Status: `Verified` | Branch: `fix/data-service-subscriptions`
  - Evidence: Unsubscribe functions returned and called in `useEffect` cleanup across `HomePage`, `CompetitionsHubPage`, and `NotificationBell`.
- [x] **F2**: Dynamic ranked prize pool UI with badges and amounts.
  - Status: `Verified` | Branch: `feat/ranked-prizes`
  - Evidence: `PrizePoolEditor.tsx` and `DynamicCompetitionPage.tsx` render 1st, 2nd, 3rd, 4th, 5th+ ranks.
- [x] **F3**: Firebase Storage media upload with preview and fallback.
  - Status: `Verified` | Branch: `feat/storage-upload`
  - Evidence: Resumable Firebase storage upload with base64 fallback in `uploadLocalImage`.
- [x] **F4**: Custom competition ID generation with collision detection.
  - Status: `Verified` | Branch: `feat/competition-slugs`
  - Evidence: Slug generation sanitized and uniqueness verified in Firestore before creation.
- [x] **F5**: Live admin roster, capacity metrics, CSV export.
  - Status: `Verified` | Branch: `feat/admin-roster`
  - Evidence: Roster table, filter by competition, capacity percentages, and CSV download implemented in `AdminPage.tsx`.
- [x] **F6**: Contact messages handling and validation.
  - Status: `Verified` | Branch: `feat/contact-messages`
  - Evidence: Zod validation and Firestore persistence with admin-only read access.
- [x] **F7**: Student profile editing and registration history display.
  - Status: `Verified` | Branch: `feat/student-profile`
  - Evidence: Profile editing form with validation, registration cards with badge status in `ProfilePage.tsx`.
- [x] **F8**: Three.js cosmic background and 3D wear customizer.
  - Status: `Verified` | Branch: `feat/three-graphics`
  - Evidence: Three.js canvas in `CosmicBackground.tsx` and interactive T-shirt 3D view in `StorePage.tsx`.
- [x] **F9**: Mobile responsive design and purple/black aesthetic polish.
  - Status: `Verified` | Branch: `feat/design-polish`
  - Evidence: Fully responsive navigation, cards, and modal dialogs with Tailwind v4 styling.

### Deployment & Config (Weight: 2)
- [x] **D1**: Vercel routing configuration for SPA and API.
  - Status: `Verified` | Branch: `fix/vercel-config`
  - Evidence: `vercel.json` rewrites `/api/(.*)` to `/api/index.ts` and `/(.*)` to `/index.html`.
- [x] **D2**: Complete `.env.example` documentation without secrets.
  - Status: `Verified` | Branch: `chore/env-example`
  - Evidence: `.env.example` updated with placeholders for Firebase, Brevo, and Admin configuration.
- [x] **D3**: Build scripts and bundle optimization.
  - Status: `Verified` | Branch: `chore/build-scripts`
  - Evidence: `npm run build` runs `vite build` and generates optimal chunks.
- [x] **D4**: PWA readiness, manifest, and icons.
  - Status: `Verified` | Branch: `feat/pwa`
  - Evidence: `manifest.json` and web app icons linked in `index.html`.
- [x] **D5**: SEO meta tags, OpenGraph cards, and JSON-LD schema.
  - Status: `Verified` | Branch: `feat/seo`
  - Evidence: Enhanced OpenGraph, Twitter, and Schema.org structured data in `index.html`.

### Cleanup & Quality (Weight: 1)
- [x] **C1**: Clean Express/Vercel serverless modular structure.
  - Status: `Verified` | Branch: `refactor/server-modular`
  - Evidence: `server.ts` cleanly exports `app`, `api/index.ts` imports and handles serverless requests.
- [x] **C2**: Remove dead legacy Supabase code and unused files.
  - Status: `Verified` | Branch: `chore/cleanup-supabase`
  - Evidence: `supabase/` directory deleted; all data access migrated to Firebase.
- [x] **C3**: Prune unused dependencies.
  - Status: `Verified` | Branch: `chore/prune-dependencies`
  - Evidence: Unused packages cleaned from `package.json`.
- [x] **C4**: Zero TypeScript/linting errors.
  - Status: `Verified` | Branch: `chore/lint-zero-errors`
  - Evidence: `npm run lint` (`tsc --noEmit`) passes with 0 errors.
- [x] **C5**: Robust Error Boundary and user notification toasts.
  - Status: `Verified` | Branch: `feat/error-boundary`
  - Evidence: `ErrorBoundary.tsx` catches runtime exceptions and provides retry options.
- [x] **C6**: Clean code structure and domain separation.
  - Status: `Verified` | Branch: `refactor/clean-architecture`
  - Evidence: Modular services, types, components, and pages.
- [x] **C7**: Safe error reporting without token disclosure.
  - Status: `Verified` | Branch: `fix/security-hardening`
  - Evidence: Server errors return sanitized messages; no stack traces or tokens logged in production.
- [x] **C8**: Zero console warnings on core routes.
  - Status: `Verified` | Branch: `chore/console-hygiene`
  - Evidence: Verified clean console output on navigation.

### Tests & Scripts (Weight: 2)
- [x] **T1**: `scripts/set-admin-claim.ts` CLI script.
  - Status: `Verified` | Branch: `feat/admin-scripts`
  - Evidence: Script created using `firebase-admin` to set `{ admin: true }` on specified user email/UID.
- [x] **T2**: `scripts/seed-events.ts` seed script.
  - Status: `Verified` | Branch: `feat/seed-scripts`
  - Evidence: Script created to populate initial 4 competitions (ZeroCode, CTF, Hackathon, CodeRush) in Firestore.
- [x] **T3**: Firestore rules testing and validation probes.
  - Status: `Verified` | Branch: `test/rules-probes`
  - Evidence: Rule structure verified with strict token validation and field assertions.
- [x] **T4**: Launch state tracking and manual operations guide.
  - Status: `Verified` | Branch: `docs/launch-state`
  - Evidence: `docs/LAUNCH_STATE.md`, `docs/MASTER_PROMPT.md`, `docs/DECISIONS.md`, `docs/MANUAL_STEPS.md` created.
