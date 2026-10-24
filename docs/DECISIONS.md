# NEXORA Architecture & Launch Decisions (DECISIONS.md)

## Decision Log

### D-001: Local Git Branching Strategy
- **Context**: In this environment, remote push permissions may not be configured.
- **Decision**: Work on feature branches corresponding to the plan (`feat/security-rules`, `feat/admin-auth-claims`, `feat/prizes-storage-api`, etc.), verify build and tests, and merge via `git merge --squash` into `main`.

### D-002: Firebase Admin Claims vs Legacy Local OTP/Passwords
- **Context**: Previous system had complex dual-OTP and custom password hashing in `server.ts` alongside hardcoded email lists in `firestore.rules`.
- **Decision**: Standardize on Firebase Authentication custom claims (`token.admin == true`). Admin operations verify Firebase ID tokens via `firebase-admin` auth. Backend provides a verification endpoint and requires token issue / auth time within 30 minutes for sensitive administrative mutations. Provide `scripts/set-admin-claim.ts` to set claims using a service account or Firebase CLI.

### D-003: Firestore Security Rules RBAC Hardening
- **Context**: B1 requires removing hardcoded emails (`request.auth.token.email in [...]`) from `firestore.rules`.
- **Decision**: Define `isAdmin()` strictly as:
  ```firestore
  function isAdmin() {
    return isSignedIn() && request.auth.token.admin == true;
  }
  ```
  Ensure all admin-only collections (`/events`, `/mediaUploads`, `/systemConfig`, `/adminAuditLogs`, `/contactMessages` reads) check `isAdmin()`. User profiles (`users/{userId}`) allow updates only if incoming keys are strictly in allowed profile fields (`name`, `college`, `department`, `enrollment_no`, `division`, `phone`, `updated_at`). Registrations client write is denied (`allow create: if false;`), routing all registrations through `/api/registrations`.

### D-004: Brevo Integration & Fail-Closed Behavior
- **Context**: B4 and S8 require email delivery to fail closed.
- **Decision**: If `BREVO_API_KEY` is missing or Brevo returns non-200/401, return HTTP 500/502 immediately. Do not pretend OTP was sent. In development mode without credentials, log explicit diagnostic instructions and return error rather than false positive.

### D-005: Serverless Function Architecture on Vercel
- **Context**: Express app in `server.ts` was bundled to `server.js` but imports in `api/index.ts` caused runtime mismatches.
- **Decision**: Provide clean Express app export in `server.ts` for local development (`tsx server.ts`), and clean Vercel serverless entry points in `api/index.ts` and modular handlers in `api/` that import `server.ts` directly with TypeScript resolution.

### D-006: Cleanup Legacy Supabase Code
- **Context**: Project previously used Supabase before migrating to Firebase Firestore and Auth.
- **Decision**: The `supabase/` directory and any stale Supabase references in types or docs are removed or archived to prevent confusion, and dependencies pruned.

### D-007: Vercel Serverless Function Module Resolution (WP1)
- **Context**: Production crash `FUNCTION_INVOCATION_FAILED` occurred because Node ESM runtime in `api/index.ts` threw `ERR_MODULE_NOT_FOUND` when attempting `import app from '../server'`.
- **Decision**: Update `api/index.ts` to `import app from '../server.js'` matching the esbuild compilation output, delete duplicate `api/app.ts`, and configure maxDuration and memory in `vercel.json`.

### D-008: Server-Authoritative Registration & Deterministic Document IDs (WP2)
- **Context**: Client previously caught registration fetch failures and returned simulated records while Firestore rules rejected client writes.
- **Decision**: In `POST /api/registrations/create`, enforce Firebase Bearer token verification first (rejecting unauthenticated requests with 401 Unauthorized), validate payload with Zod, compute fees server-side, and execute an atomic Firestore transaction with deterministic doc ID `${verifiedUserId}_${event_slug}` that checks capacity and increments `registered_count`.

### D-009: Strict Whitelisting of User Profile Fields in Firestore Rules (WP4)
- **Context**: Previous rules checked legacy keys (`name`, `department`, `enrollment_no`), causing permission-denied errors when students submitted the form with current schema keys (`full_name`, `branch`, `academic_year`, `enrollment_number`, `phone_number`).
- **Decision**: Align `firestore.rules` for `users/{userId}` to whitelist all current application profile fields while maintaining legacy key compatibility.

### D-010: Removal of Hardcoded Admin Credentials from Client (WP4)
- **Context**: Client components previously imported `ADMIN_EMAILS` and `ADMIN_PHONE` from `dataService.ts`, exposing founder emails in client bundles and checking email strings for admin privileges.
- **Decision**: Remove `ADMIN_EMAILS` and `ADMIN_PHONE` exports from `src/`. Switch `isUserAdmin` and `AuthContext` to strictly check verified Firebase Auth ID token custom claims (`request.auth.token.admin == true`). Provide `scripts/audit-claims.sh` to prevent regression.

### D-011: Public Endpoint Privacy Sanitization (WP5)
- **Context**: `/api/health` and `/api/admin/status` leaked detailed internal configuration and raw founder email/phone to unauthenticated requesters.
- **Decision**: Sanitize public `/api/health` to return basic uptime and `serverTimeMs`. Move sensitive diagnostic checks to protected `/api/admin/health` requiring elevated admin authentication. Sanitize `/api/admin/status` to return only masked email and phone.

### D-012: Scheduled Broadcast Popups with Server Skew Correction (WP8)
- **Context**: System needed scheduled, delayed, site-wide broadcast popups that survive clock skew, prevent XSS in action URLs, and persist dismissal state.
- **Decision**: Implement `serverClock.ts` tracking clock offset via `/api/health`, `safeUrl.ts` rejecting unsafe protocols (`javascript:`, `data:`), `useBroadcastPopups.ts` respecting `popup_delay_seconds` and `localStorage` dismissal state, and `BroadcastPopup.tsx` mounted sitewide in `App.tsx`.

