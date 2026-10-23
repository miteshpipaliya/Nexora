# NEXORA Launch-Readiness Master Prompt

## 0. ROLE AND MISSION
You are a principal full-stack engineer, security engineer and release manager. The repo is github.com/miteshpipaliya/Nexora: React 19, Vite 8, Tailwind 4, Firebase Auth/Firestore/Storage, an Express backend deployed as Vercel serverless, Brevo for email. A prior audit found 41 problems (catalog in Section 5). Your mission: fix them, restructure the repo (Section 4), work through the branch plan (Section 6) using the loop (Section 2), and stop only when the launch score in Section 3 is at least 80 AND every B and S item is Verified.

First action: save this whole prompt to docs/MASTER_PROMPT.md and create docs/LAUNCH_STATE.md and docs/DECISIONS.md. Do not ask the human questions. When something is ambiguous, pick the safest default, record it in docs/DECISIONS.md, and continue. Things only a human can do (Firebase service account, Brevo key, Vercel settings, GitHub branch protection) go in docs/MANUAL_STEPS.md as exact click-by-click steps; mark the related item Manual and move on.

## 1. HARD RULES
1. Never commit to main directly. Never force-push. Never rewrite published history.
2. One branch per task (Section 6). Conventional commits: feat:, fix:, chore:, refactor:, docs:, test:, perf:.
3. Never print, log or commit secrets. Only .env.example (placeholders) is committed.
4. Keep the stack and the visual design (React, Vite, Tailwind, Firebase, Vercel, Brevo). Allowed new dev dependencies: vitest, @firebase/rules-unit-testing, firebase-tools, @vercel/node. Keep zod and use it for API validation. Remove a dependency only after grep proves it unused.
5. Fail closed: if auth, config or a secret is missing, the endpoint returns an error. It never silently succeeds.
6. Never trust the client for: roles, fees, payment status, capacity, verification status, timestamps, IDs.
7. Rules that remove a client write path ship in the same PR as the server replacement, so the app is never broken between merges.
8. Do not claim something is fixed without evidence. Evidence means a command and its real output, saved in LAUNCH_STATE.md.
9. If you have no push or PR access, work on local branches and merge with git merge --squash, and log that in DECISIONS.md.

## 2. THE LOOP
LOOP:
  1. READ   docs/LAUNCH_STATE.md (create it from the catalog if missing)
  2. AUDIT  re-run the regression probes (Section 7) and the grep checks; downgrade any item whose evidence no longer holds
  3. PICK   the first branch in Section 6 that still has open items
  4. BUILD  git switch -c <branch> from the integration branch; implement ONLY that branch's items; commit in small steps
  5. GATE   run all gates (Section 7). Fix until green. If a gate fails 3 times in a row, mark the item Blocked with the exact error, commit what works, and move on.
  6. MERGE  open a PR (gh pr create) or squash-merge locally; delete the branch
  7. RECORD update LAUNCH_STATE.md: status, branch, evidence, new score
  8. DECIDE if exit condition met -> go to FINAL REPORT; otherwise go to 1

## 3. LAUNCH SCORE FORMULA
Score = SUM(Weight * StatusMultiplier) / MaxScore * 100
- Weights: B = 5, S = 4, F = 3, D = 2, C = 1, T = 2
- Status: Verified = 1.0, InProgress = 0.4, Open/Blocked = 0.0, Manual = 0.8 (pending user action)
Target: Score >= 80 AND all B items Verified AND all S items Verified.

## 4. REPO ARCHITECTURE & RESTRUCTURING
- API: Modular serverless endpoints in `api/` with shared utilities in `api/_lib/` (auth, admin, email, rate-limit, validation)
- Frontend: `src/components/`, `src/pages/`, `src/services/dataService.ts`, `src/types/`
- Security: `firestore.rules` hardened with strict RBAC (`request.auth.token.admin == true`), owner validation, and zero client writes on critical paths
- Tools & Scripts: `scripts/set-admin-claim.ts`, `scripts/seed-events.ts`

## 5. AUDIT CATALOG (41 ITEMS)
- **Blockers (B1–B7)**:
  - B1: Remove hardcoded admin emails from Firestore rules; require custom claim `token.admin == true`.
  - B2: Replace custom passwords/dual-OTP with Firebase Admin custom claims and bearer ID token verification.
  - B3: Enforce re-authentication for admin actions older than 30 minutes.
  - B4: Brevo fail-closed: return 500 when email service fails; never pretend OTP succeeded.
  - B5: Fix runtime errors in external store subscriptions (`subscribeEvents`, `subscribeNotifications`).
  - B6: Modularize Vercel functions, fix ESM/CJS build artifacts.
  - B7: Provide dynamic multi-rank prize pool editor and renderer.
- **Security (S1–S13)**:
  - S1: Prevent client-side writes to `registrations`; process through serverless endpoint with capacity/fee verification.
  - S2: Restrict `users/{uid}` updates to allowed profile fields with `hasOnly()`.
  - S3: Restrict notification read receipts to authenticating user.
  - S4: Scan and eliminate client-side secret leakage; maintain clean `.env.example`.
  - S5: Rate limiting on public and sensitive API endpoints.
  - S6: Cryptographically secure OTP generation, hashing, and single-use expiration.
  - S7: Media upload authorization restrictions.
  - S8: Backend fail-closed design on missing configuration.
  - S9: Admin action audit logging to `adminAuditLogs`.
  - S10: Server-side registration validation and duplicate prevention.
  - S11: Zod input schema validation on all request bodies.
  - S12: CORS and security headers configuration.
  - S13: Invariant: prevent deletion of competition when registrations exist.
- **Functional (F1–F9)**:
  - F1: Real-time event and notification subscriptions with clean teardown.
  - F2: Dynamic ranked prize pool UI with badges and amounts.
  - F3: Firebase Storage media upload with preview and fallback.
  - F4: Custom competition ID generation with collision detection.
  - F5: Live admin roster, capacity metrics, CSV export.
  - F6: Contact messages handling and validation.
  - F7: Student profile editing and registration history display.
  - F8: Three.js cosmic background and 3D wear customizer.
  - F9: Mobile responsive design and purple/black aesthetic polish.
- **Deployment & Config (D1–D5)**:
  - D1: Vercel routing configuration for SPA and API.
  - D2: Complete `.env.example` documentation without secrets.
  - D3: Build scripts and bundle optimization.
  - D4: PWA readiness, manifest, and icons.
  - D5: SEO meta tags, OpenGraph cards, and JSON-LD schema.
- **Cleanup & Quality (C1–C8)**:
  - C1: Clean Express/Vercel serverless modular structure.
  - C2: Remove dead legacy Supabase code and unused files.
  - C3: Prune unused dependencies.
  - C4: Zero TypeScript/linting errors.
  - C5: Robust Error Boundary and user notification toasts.
  - C6: Clean code structure and domain separation.
  - C7: Safe error reporting without token disclosure.
  - C8: Zero console warnings on core routes.
- **Tests & Scripts (T1–T4)**:
  - T1: `scripts/set-admin-claim.ts` CLI script.
  - T2: `scripts/seed-events.ts` seed script.
  - T3: Firestore rules testing and validation probes.
  - T4: Launch state tracking and manual operations guide.
