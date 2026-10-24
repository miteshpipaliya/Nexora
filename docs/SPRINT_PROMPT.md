# NEXORA Launch Sprint: 7 Fixes + Scheduled Broadcast Popups

## Sprint Objectives
1. Fix Vercel serverless entry crash (FUNCTION_INVOCATION_FAILED)
2. Eliminate all fake numbers, fallback counts, and simulated metrics across the platform
3. Secure registration creation (/api/registrations/create) with Firebase Bearer token verification, Zod input validation, atomic Firestore transactions, and deterministic document IDs
4. Remove client-side fake success paths in dataService.ts (fail-closed, throw real errors to the UI)
5. Align Firestore security rules (firestore.rules) with client profile schema (full_name, branch, academic_year, enrollment_number, phone_number), enforce token claims for admin privileges (request.auth.token.admin == true), and remove hardcoded admin credentials from client-side code
6. Close public data leaks (/api/admin/status and /api/health) by sanitizing public health probes and moving sensitive configuration to authenticated admin endpoints
7. Harden backend admin state: stateless HMAC tokens, Firestore challenge persistence, remove local disk/tmp writes in serverless environment, enforce 100kb payload caps, standard security headers, and structured requestId error logging
8. Implement scheduled, delayed, site-wide broadcast popups (siteMeta/broadcastSchedule, useBroadcastPopups, BroadcastPopup component, safe URL sanitation, server skew compensation)
9. Verify all existing flows continue to work via automated tests, typecheck, build, and smoke test scripts
