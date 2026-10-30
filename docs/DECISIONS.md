# Architecture & Engineering Decisions

## DEC-001: Local Branching and Squash Merging
- **Context**: In this environment, remote GitHub PR workflows and push access are not available.
- **Decision**: Develop each work package in a dedicated local branch (`chore/sprint-baseline`, `fix/vercel-entry-crash`, `fix/registration-auth`, etc.), run gates on the branch, and squash-merge into `main` using conventional commits.

## DEC-002: Test Runner and Dependencies
- **Context**: Need fast, reliable unit testing for client and server, DOM testing, and rules validation.
- **Decision**: Added `vitest`, `jsdom`, `@testing-library/react`. Vitest shares Vite configuration effortlessly and supports ESM out-of-the-box.

## DEC-003: Registration Pricing (BVM vs External)
- **Context**: Event registration fees must be computed strictly server-side to prevent client tampering.
- **Decision**: Verified Terms and competition guidelines: BVM students are charged ₹50 per participant, and External students ₹70 per participant (multiplied by team size for team events). Stored as integer amounts in INR; `payment_status` initialized to `'Unpaid'`.

## DEC-004: Stateless Admin Sessions via Signed HMAC Tokens
- **Context**: Admin authentication previously used in-memory maps (`activeAdminSessions`, `verifiedPasswordTokens`), which fail in Vercel serverless functions across cold starts and isolated lambda instances.
- **Decision**: Implement stateless HMAC tokens `{ purpose, sub, exp, jti }` with cryptographic signatures. Persistent state (revocation list, challenge attempts, rate limits) stored in Firestore Admin SDK documents (`_admin_challenges/{jti}`, `_revoked_sessions/{jti}`, `_admin_ratelimits/{key}`).

## DEC-005: Admin Password Storage
- **Context**: Admin password hash was previously written to `/tmp`, vanishing on cold starts.
- **Decision**: Admin password hash (scrypt) is stored in Firestore document `_admin_security/founder` with optional override via `ADMIN_SECURITY_PASSWORD` environment variable. Never write passwords to `/tmp` in production.

## DEC-006: Scheduled Broadcast Popups Architecture
- **Context**: Announcements need delayed site-wide popups without content leaks.
- **Decision**:
  - `siteMeta/broadcastSchedule` contains public non-sensitive timing entries `[{ id, display_at_ms }]` so non-admins know when to trigger the modal.
  - Full announcement content in `notifications/{id}` is security-rule-protected until `display_at <= request.time`.
  - Server clock skew is synchronized against `GET /api/health` response header `Date`.
