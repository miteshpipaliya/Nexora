# NEXORA Fix State (v6)

**Execution Date:** 2026-11-04  
**Project:** NEXORA — Student Technology & Innovation Community (BVM)  
**Production URL:** https://www.nexora-bvm.online  
**Target Database:** `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`

---

## Work Packages & Items

| Item | Description | Status | Evidence / Notes |
|------|-------------|--------|------------------|
| **Package A** | Brevo Sender Error & OTP Email Subsystem | Open | Initialized |
| **Package B** | Forget Old Admin Password & Secure Scrypt Storage | Open | Initialized |
| **C-01** | `firestore.rules` Custom Claims Only (No hardcoded emails) | Open | Initialized |
| **C-02** | `users` collection field whitelist and client trust removal | Open | Initialized |
| **C-03** | Server-only transactional registration creation (`uid_slug`) | Open | Initialized |
| **C-04** | `userNotificationReads` owner-only rules with `uid_` prefix | Open | Initialized |
| **C-05** | `contactMessages` rate-limited endpoint & size caps | Open | Initialized |
| **C-06** | Safe public projection for events, notifications, team | Open | Initialized |
| **C-07** | `firebase.json` named database & `storage.rules` | Open | Initialized |
| **C-08** | Public endpoints PII removal, header rewrite delete, HMAC secret check | Open | Initialized |
| **C-09** | Security headers in `vercel.json` & CSP Report-Only | Open | Initialized |
| **C-10** | Pre-login admin endpoints rate limits & auth hardening | Open | Initialized |
| **C-11** | Clean single npm lockfile, remove `bun.lock` | Open | Initialized |
| **B-01** | Process-level uncaughtException/unhandledRejection & safe 503 on missing credentials | Open | Initialized |
| **B-02** | Structured logs replacing empty catch blocks | Open | Initialized |
| **B-03** | Finite number helper replacing `Number(x) ?? default` | Open | Initialized |
| **B-04** | CMS body validation with zod & ErrorBoundaries | Open | Initialized |
| **B-05** | `/api/team/public` cache headers (`s-maxage 60`) & field whitelist | Open | Initialized |
| **B-06** | Move in-memory maps to Firestore with expiresAt / persist audit log | Open | Initialized |
| **B-07** | Build load check script and post-deploy `/api/health` test | Open | Initialized |
| **B-08** | Migration safety check for admin password data | Open | Initialized |
| **Package D** | WhatsApp-Style Broadcast Pop-up with Sound & Multi-Tab Sync | Open | Initialized |

---
