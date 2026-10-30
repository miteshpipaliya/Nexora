# Nexora Launch Sprint State

All items start Open and are updated strictly with real command output evidence.
Only existing files are cited with backticks.

## Work Packages Overview

| Package | Name | Status | Branch | Evidence |
|---|---|---|---|---|
| WP0 | Baseline Setup & Tooling | Verified | `chore/sprint-baseline` | `scripts/audit-claims.sh` OK; `npm test` passed (1 test) |
| WP1 | Fix Vercel Entry Crash | Verified | `fix/vercel-entry-crash` | `scripts/verify-vercel-build.sh` before: ERR_MODULE_NOT_FOUND, after: LOADED OK (200 OK) |
| WP2 | Registration Authentication & Integrity | Open | fix/registration-auth | Not started |
| WP3 | Remove Fake-Success Path on Client | Open | fix/registration-no-fake-success | Not started |
| WP4 | Align Rules, Claims & Client | Open | fix/rules-client-alignment | Not started |
| WP5 | Close Public Info Leaks | Open | fix/public-info-leaks | Not started |
| WP6 | Stateless Admin & Crash Guards | Open | fix/admin-state-and-crash-guards | Not started |
| WP7 | Server Hardening | Open | fix/server-hardening | Not started |
| WP8 | Scheduled Broadcast Popups | Open | feat/scheduled-broadcast-popups | Not started |
| WP9 | Smoke & Docs | Open | test/smoke-and-docs | Not started |

---

## Detailed Item Progress

### WP0: Baseline Setup
- **Status**: Verified
- **Branch**: `chore/sprint-baseline`
- **Files**:
  - `docs/SPRINT_STATE.md`
  - `docs/DECISIONS.md`
  - `docs/MANUAL_STEPS.md`
  - `docs/SPRINT_PROMPT.md`
  - `scripts/audit-claims.sh`
  - `scripts/smoke.mjs`
  - `scripts/verify-vercel-build.sh`
  - `vitest.config.ts`
  - `tests/smoke.test.ts`
  - `package.json`
- **Criteria & Evidence**:
  - Previous launch state removed.
  - Vitest installed and configured with scripts in `package.json`.
  - `bash scripts/audit-claims.sh`:
    ```
    Auditing 10 cited path(s) in docs/SPRINT_STATE.md...
    audit-claims passed successfully.
    ```
  - `npm test`:
    ```
    ✓ tests/smoke.test.ts (1 test) 4ms
    Test Files  1 passed (1)
         Tests  1 passed (1)
    ```

### WP1: Fix Vercel Entry Crash
- **Status**: Verified
- **Branch**: `fix/vercel-entry-crash`
- **Files**:
  - `api/index.ts`
  - `vercel.json`
- **Criteria & Evidence**:
  - `api/index.ts` changed to `import app from '../server.js';`.
  - Duplicate `api/app.ts` removed.
  - `vercel.json` configured with `"functions": {"api/index.ts": {"maxDuration": 30}}`.
  - **Before Fix Evidence** (`bash scripts/verify-vercel-build.sh` on main):
    ```
    Simulating Vercel build function bundle...
    Testing built function import...
    Import error for /app/.tmp_verify_Fq4bXB/.vercel/output/functions/api/index.func/api/index.js: ERR_MODULE_NOT_FOUND
    ERR_MODULE_NOT_FOUND caught as expected on un-suffixed import
    ```
  - **After Fix Evidence** (`bash scripts/verify-vercel-build.sh` on `fix/vercel-entry-crash`):
    ```
    Simulating Vercel build function bundle...
    Testing built function import...
    LOADED OK from /app/.tmp_verify_EsOLU4/.vercel/output/functions/api/index.func/api/index.js
    Health status: 200, body: {"status":"ok","service":"NEXORA Production Backend API"...}
    VERIFICATION SUCCESS: 200 OK
    ```

### WP2: Registration Authentication & Integrity
- **Status**: Open
- **Branch**: fix/registration-auth
- **Files**:
  - `server.ts`
- **Criteria**:
  - Registration route requires verified Firebase Bearer token.
  - Schema validation for registration payload.
  - Single Firestore transaction for deterministic registration doc.
  - Unique 6-character competition ID.
  - Server-computed fee calculation.

### WP3: Remove Client Fake-Success Path
- **Status**: Open
- **Branch**: fix/registration-no-fake-success
- **Files**:
  - `src/services/dataService.ts`
- **Criteria**:
  - Remove fallback mock generation on API error.
  - Throw on non-2xx responses.
  - Registration modal retains user input on failure.

### WP4: Align Rules, Claims and Client
- **Status**: Open
- **Branch**: fix/rules-client-alignment
- **Files**:
  - `firestore.rules`
  - `src/context/AuthContext.tsx`
- **Criteria**:
  - User profile schema matched with rules.
  - Admin custom claim checks via token.
  - Remove hardcoded admin contact references.

### WP5: Close Public Info Leaks
- **Status**: Open
- **Branch**: fix/public-info-leaks
- **Files**:
  - `server.ts`
- **Criteria**:
  - Public status and health routes return minimal non-sensitive data.
  - Admin diagnostics moved to protected endpoint.

### WP6: Stateless Admin Sessions and Crash Guards
- **Status**: Open
- **Branch**: fix/admin-state-and-crash-guards
- **Files**:
  - `server.ts`
- **Criteria**:
  - Stateless HMAC session tokens.
  - Challenge and rate limit tracking in Firestore.
  - Crash guards for uncaught exceptions.

### WP7: Server Hardening
- **Status**: Open
- **Branch**: fix/server-hardening
- **Files**:
  - `server.ts`
  - `vercel.json`
- **Criteria**:
  - Strip rewrite headers.
  - Global error masking with request IDs.
  - Security headers in deployment config.

### WP8: Scheduled Delayed Broadcast Popups
- **Status**: Open
- **Branch**: feat/scheduled-broadcast-popups
- **Files**:
  - `src/pages/Admin/AdminPage.tsx`
- **Criteria**:
  - Broadcast schedule metadata and popup delay logic.
  - Popups triggered based on synchronized server time.
  - Accessible modal dialog.

### WP9: Smoke Testing & Docs
- **Status**: Open
- **Branch**: test/smoke-and-docs
- **Files**:
  - `README.md`
- **Criteria**:
  - Smoke test verification checklist.
  - Comprehensive sprint report.
