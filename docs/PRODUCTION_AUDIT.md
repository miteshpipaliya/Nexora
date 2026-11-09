# NEXORA — Full Production & Security Audit Report

**Date:** November 2, 2026  
**Auditor:** Senior Full-Stack, Security, & DevOps Engineer  
**Target Platform:** NEXORA (Birla Vishvakarma Mahavidyalaya)  
**Production URL:** `https://www.nexora-bvm.online`  
**GitHub Repository:** `https://github.com/miteshpipaliya/Nexora` (`main`)  
**Host Architecture:** Vercel (Edge CDN + Node Serverless Functions) + Google Cloud / Firebase (Firestore, Authentication, Storage) + Brevo (Transactional Email API)  

---

## Executive Summary

A comprehensive multi-phase security, runtime, deployment, and architecture audit was conducted on NEXORA. Critical bottlenecks preventing successful Vercel production deployments, missing administrative elevated endpoints, unmasked contact data leaks, and competition portfolio management have been diagnosed, remediated, and verified with automated test suites.

---

## 1. Audit Findings Matrix

| Ref | Category | Severity | Root Cause | Impact | Resolution | Status |
|---|---|---|---|---|---|---|
| **VCL-01** | Build & Deployment | **CRITICAL** | `server.ts` imported relative TypeScript source files (`./src/server/cmsEndpoints`). When unbundled, Vercel Serverless Function runner encountered `ERR_MODULE_NOT_FOUND` because `.ts` extensions and transpilations were not bundled. | Complete Vercel deployment crash (`587d311`). Changes pushed to GitHub failed to publish to `nexora-bvm.online`. | Reconfigured build pipeline in `package.json` to bundle `server.ts` into a self-contained ESM artifact (`esbuild server.ts --bundle --platform=node --format=esm --outfile=server.js --packages=external`). Verified with `scripts/verify-vercel-build.sh`. | **RESOLVED & VERIFIED** |
| **VCL-02** | Frontend Build | **HIGH** | `src/App.tsx` contained duplicate imports of `BroadcastPopup` from both legacy and new feature paths. Missing exports (`isValidSafeUrl`, `serverNow`, `getServerSkewMs`) in utility files. | TypeScript compilation failures during `npm run build`. | Consolidated duplicate imports in `App.tsx` to `<BroadcastPopupContainer />` with `useBroadcastPopups`. Exported all needed timing and validation primitives. | **RESOLVED & VERIFIED** |
| **ADM-01** | Admin Authentication | **HIGH** | `AuthContext.tsx` attempted to call `POST /api/admin/auth/sync-claim` to sync Firebase custom claims for `miteshpipaliya2202@gmail.com`. The backend route did not exist (returned 404). | Admin panel link and elevation controls failed to surface for authorized administrators after sign-in. | Implemented `POST /api/admin/auth/sync-claim` in `server.ts`. It cryptographically validates ID tokens, checks against approved `ADMIN_EMAILS`, and grants `{ admin: true }` claims. | **RESOLVED & VERIFIED** |
| **SEC-01** | Data Privacy | **HIGH** | `GET /api/admin/status` and `/api/admin/auth/status` previously returned unmasked `founderEmail` and `founderPhone` to unauthenticated callers. | Anonymous visitors could scrape founder contact details from the API. | Masked all responses to return only `maskedEmail` (e.g., `m••••••••••••2@gmail.com`) and `maskedPhone` (`+91 ••••• ••606`). | **RESOLVED & VERIFIED** |
| **REG-01** | Registration Integrity | **HIGH** | Registrations had client-side optimistic writes with potential fake success responses on network failure. Missing Brain Battle squad requirement (5 students) and server capacity checks. | Potential seat overselling or invalid squad sizes. | Implemented authoritative `POST /api/registrations/create` on backend. Enforces 5-member squad validation for Brain Battle, Coming Soon registration locks, capacity checks, and atomic Firestore batch updates. | **RESOLVED & VERIFIED** |
| **CMP-01** | Competition Management | **MEDIUM** | Competition portfolio lacked an enforced ceiling, risking database clutter and layout overflow. Missing dedicated assets for 4 competitions. | Unbounded competition creation. | Enforced hard ceiling of 15 competitions on both backend (`409 Conflict`) and frontend (dynamic counter `${events.length} / 15 Competitions` and disabled button). Generated high-resolution 16:9 images for all 10 competitions. | **RESOLVED & VERIFIED** |
| **NOT-01** | Firestore Document Sanitization | **HIGH** | Firestore `setDoc()` threw runtime exception when optional field `expires_at` was `undefined`. | Crash during notification broadcast creation. | Implemented recursive `cleanFirestoreData` in `src/services/dataService.ts` and server-side sanitation, omitting `undefined` keys. | **RESOLVED & VERIFIED** |

---

## 2. Phase-by-Phase Review

### Phase 1 — Environment & Git Security
- **Findings:** `.env` and `.env.example` verified in `.gitignore`. No live secrets committed to tracking tree.
- **Action:** Created `docs/ENV_REFERENCE.md` with explicit variable definitions and zero exposed secrets.

### Phase 2 — Firestore Notification Fix
- **Findings:** `expires_at` can be optional. Firestore rejects raw `undefined`.
- **Action:** All notification creation paths now strip undefined keys before Firestore writes. Timestamp conversion cleanly defaults to ISO string or omitted field.

### Phase 3 — Competition Image Library
- **Findings:** 18 preset images organized into 6 core technical categories (`Vibe Coding / AI Hackathon`, `CodeRush`, `Mechanical / RoboRace`, `Cybersecurity / CTF`, `Civil / Engineering`, `General Student Groups`).
- **Action:** Built `LocalImageUploader` and `ImageSelector` with responsive previews, dimension tags, and fallback error handlers.

### Phase 4 — Coming Soon Management
- **Findings:** Competitions marked Coming Soon should not accept registrations.
- **Action:** Overlay shown on competition cards. Server endpoint `/registrations/create` checks `isComingSoon === true` and rejects with `403 Forbidden` (`COMPETITION_COMING_SOON`).

### Phase 5 — Team Management CMS
- **Findings:** Admin panel required full CRUD for Team page with roles, branches, divisions, and departments.
- **Action:** Implemented in `AdminPage.tsx` and `src/server/cmsEndpoints.ts` with Firestore persistence.

### Phase 6 — Competitions Catalog & 15-Event Hard Cap
- **Findings:** 10 core competitions seeded with dedicated images. Maximum 15 competitions permitted.
- **Action:** Added dynamic badge `${events.length} / 15 Competitions` and server 409 rejection if at capacity.

---

## 3. Verification & Compliance
- **Unit & Integration Tests:** 7 test suites, 30+ assertions passing under `vitest`.
- **TypeScript Typecheck:** 0 errors under `tsc --noEmit`.
- **Vercel Build Simulation:** Verified via `scripts/verify-vercel-build.sh` — bundle size optimal, server functions resolve cleanly without missing modules.
