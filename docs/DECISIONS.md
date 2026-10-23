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
