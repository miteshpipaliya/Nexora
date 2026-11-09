# NEXORA Change Request State (v5)

**Execution Date:** 2026-11-04  
**Project:** NEXORA — Student Technology & Innovation Community (BVM)  
**Production URL:** https://www.nexora-bvm.online  
**Repository:** miteshpipaliya/Nexora  

## Final Verification Gates
- `npx tsc --noEmit`: PASS (0 errors)
- `npm test`: PASS (12 test files, 53 tests passed)
- `npm run build`: PASS (Vite client + Esbuild server.js bundle generated)
- Smoke Checklist: Verified across all 11 user journeys

## Work Packages Status

| Package | Description | Status | Evidence / Notes |
|---------|-------------|--------|------------------|
| **WP1** | Google Logo & Trust Signals (R1) | Closed | Added canonical link, 192px/48px/32px/16px square icons, Organization Schema JSON-LD with official stable logo, `public/robots.txt`, and `public/sitemap.xml`. |
| **WP2** | Remove Campus Dispatches Section (R2) | Closed | Completely removed "Campus Dispatches & Live Announcements" from `HomePage.tsx` without leaving vertical whitespace or layout gaps. |
| **WP3** | WhatsApp-Style Toast + Bell Sync (R3) | Closed | Created `BroadcastToast.tsx` with right-side slide-in, 10s auto-dismiss, hover pause, max stack 3, Web Audio chime with localStorage mute switch, deduplication (<5m old), and cross-tab dismissal sync. |
| **WP4** | Competition Counter Switch `show_capacity` (R4) | Closed | Implemented boolean `show_capacity` switch in Admin (Create/Edit), public endpoints, `HomePage`, `CompetitionsHubPage`, and `DynamicCompetitionPage` via reusable `RegistrationCounter.tsx`. |
| **WP5** | Team Page, Role Order, Publish, Division (R5) | Closed | Updated role hierarchy (Founder #1, Faculty #2, Tech Ops #3, Full-Stack Lead #4, Event Coord #5, Design Director #6, PR Outreach #7, Volunteer #8); made role order numeric input; converted division to free-text (1-20 chars); removed Divisions CRUD; fixed publish toggle DB sync; implemented 1-column Founder row + 2-column desktop grid. |
| **WP6** | Admin Password Verification Persistence (R6) | Closed | Created `src/server/adminSecurity.ts` with scrypt hashing, NFKC normalization, authoritative Firestore database `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b`, and CLI recovery tool `scripts/admin-password-cli.ts`. |
| **WP7** | Brevo Reset-Password OTP Delivery (R7) | Closed | Built `src/server/brevoMailer.ts` validating API keys at runtime, rejecting `@gmail.com` unverified fallback, enforcing 10s abort timeout, safe client error mappings, and added `GET /api/admin/email-diagnostics`. |
| **WP8** | Copy Protection & Form Usability Guard (R8) | Closed | Applied global CSS `user-select: none` on public body; allowed inputs, textareas, selects, `contenteditable="true"`, and `.allow-select`; mounted `CopyGuard.tsx` with non-intrusive event prevention. |
| **WP9** | Safe Deployment & Verification (R9) | Closed | Zero build regressions; 53/53 tests passing; complete documentation updated in `docs/`. |

## Documentation Artifacts
- **docs/CHANGE_PROMPT.md**: Prompt v5 saved verbatim.
- **docs/DECISIONS.md**: Architectural decisions D-014 through D-020.
- **docs/MANUAL_STEPS.md**: Owner-only manual deployment and DNS steps.
- **docs/SMOKE_TEST.md**: Post-implementation verification checklist.
- **docs/CHANGE_REPORT.md**: Executive summary and release notes for the founder.
