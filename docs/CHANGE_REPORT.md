# NEXORA Platform Change Report (v5 Execution)

**Execution Date:** 2026-11-04  
**Project:** NEXORA — Student Technology & Innovation Community  
**Institution:** Birla Vishvakarma Mahavidyalaya (BVM) Engineering College, Vallabh Vidyanagar, Gujarat  
**Production URL:** https://www.nexora-bvm.online  
**Founder & Lead Architect:** Mitesh Pipaliya (`miteshpipaliya2202@gmail.com`, `mitesh.aiml@gmail.com`)  

---

## Executive Summary

The NEXORA platform change request (Prompt v5) has been executed across all nine work packages (WP1–WP9). Every requirement has been validated with end-to-end type safety, automated unit testing (12 test suites, 53 tests passing), and production compilation.

---

## Work Packages Detail & Deliverables

### WP1: Google Logo & Trust Signals (R1)
- **Square Favicon Suite:** Added square icon declarations (`16x16`, `32x32`, `48x48`, `192x192`, `apple-touch-icon 180x180`, `site.webmanifest`) to `index.html`.
- **Canonical URL:** Configured `<link rel="canonical" href="https://www.nexora-bvm.online/" />`.
- **Structured Schema (JSON-LD):** Added Organization schema linking the official stable logo (`https://www.nexora-bvm.online/logo.png`), disambiguated description, BVM parent organization, contact information, and GitHub repository.
- **Search Engine Discovery:** Created `public/robots.txt` and `public/sitemap.xml` with all flagship routes and competition paths.

### WP2: Campus Dispatches Elimination (R2)
- **HomePage Cleanup:** Completely removed the `CAMPUS DISPATCHES & LIVE ANNOUNCEMENTS` section from `HomePage.tsx`.
- **Whitespace Discipline:** Eliminated all lingering vertical spacing and margins between the Hero/Competitions section and "The NEXORA Philosophy".

### WP3: WhatsApp-Style Broadcast Notification Toast (R3)
- **Right Slide-in Toast (`BroadcastToast.tsx`):** Renders toasts in bottom-right corner (max stack: 3) with circular NEXORA avatar, bold title, 3-line message clamp, relative timestamp ("just now", "5m ago"), action button, and close (X) button.
- **Auto-Dismiss & Hover Pause:** Each toast auto-dismisses after 10 seconds; hovering pauses the timer with visual progress bar indicator.
- **Web Audio Chime:** Gentle two-tone chime (587 Hz &rarr; 880 Hz) generated via Web Audio API with a persistent mute toggle in `localStorage`.
- **Deduplication & Cross-Tab Sync:** Seen notifications cached in `localStorage` (capped at 200). Closing in one tab syncs instantly across tabs via `storage` events. Announcements older than 5 minutes on first load are routed to the Bell only.

### WP4: Competition Capacity Switch & Images (R4)
- **Capacity Switch (`show_capacity`):** Added boolean flag to `CompetitionEvent` schema and backend endpoints (`POST /admin/competitions`, `PUT /admin/competitions/:slug`).
- **Standardized Presentation (`RegistrationCounter.tsx`):**
  - **ON (`show_capacity: true`):** `{registered_count} / {capacity} seats filled` with percentage and progress bar.
  - **OFF (`show_capacity: false`):** Shows singular/plural registered count (e.g., "Be the first to register", "1 student registered", "12 students registered") with no capacity denominator or progress bar.
- **Image Association:** All flagship competitions (`zerocode`, `coderush`, `pathfinder`, `ctf`, `roborace`, `brainbattle`) now explicitly point to their dedicated high-resolution banners in `/images/competitions/`.
- **Updated Pages:** Admin event modals, `HomePage.tsx`, `CompetitionsHubPage.tsx`, and `DynamicCompetitionPage.tsx`.

### WP5: Team Member Hierarchy, Publish Toggle, and Division (R5)
- **Role Hierarchy:** Standardized role responsibility ordering:
  1. Founder & Lead Architect
  2. Faculty Member
  3. Technical Operations Head
  4. Full-Stack Engineering Lead
  5. Event Coordinator
  6. Design & Creative Director
  7. Public Relations & Outreach Head
  8. Member or Volunteer
- **Dynamic Role Ordering:** Made role `display_order` an editable numeric field in Admin CMS; sorting dynamically responds to order values.
- **Publish Toggle:** Fixed `enabled` toggle in Admin to persist directly to Firestore and filter public views.
- **Free-Text Division:** Replaced rigid Classroom Division dropdown with a clean text input (`maxLength={20}`) and removed the obsolete Divisions CRUD subtab.
- **Grid Layout:** Founder featured prominently on their own row; team members follow in a clean 2-column desktop / tablet grid (1-column on mobile).

### WP6: Admin Security Password Scrypt Persistence & CLI (R6)
- **Scrypt Hashing (`src/server/adminSecurity.ts`):** 16-byte random salt, Unicode NFKC normalization, constant-time comparison.
- **Explicit Authoritative Firestore DB:** Persisted to `_admin_security/founder` in `ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b` with read-back verification.
- **CLI Management Tool:** `npm run admin:password -- --set` and `npm run admin:password -- --clear` via `scripts/admin-password-cli.ts`.

### WP7: Brevo OTP Reset-Password Subsystem & Diagnostics (R7)
- **Isolated Mailer (`src/server/brevoMailer.ts`):** Validates Brevo API keys and sender emails at invocation time; strictly rejects unverified `@gmail.com` addresses.
- **10-Second Abort Controller:** Prevents hanging requests during network latency.
- **Safe Error Codes:** Client receives mapped error codes (`EMAIL_NOT_CONFIGURED`, `EMAIL_PROVIDER_REJECTED`, `EMAIL_RATE_LIMITED`, `EMAIL_TIMEOUT`) without leaking internal secrets.
- **Diagnostics Route:** Added `GET /api/admin/email-diagnostics` for real-time config checks.

### WP8: Content Copy Deterrent & Input Usability Guard (R8)
- **Global CSS:** `user-select: none` across public viewports.
- **Focus Preservation:** `input, textarea, select, [contenteditable="true"], .allow-select, pre, code` explicitly maintain `user-select: text !important`.
- **Component Guard (`CopyGuard.tsx`):** Intercepts clipboard events on public content without impeding keyboard shortcuts, tab navigation, or form input. Bypassed on `/admin` routes.

---

## Verification Gates Output

| Gate | Command | Result |
|------|---------|--------|
| TypeScript Check | `npx tsc --noEmit` | **PASS (0 errors)** |
| Lint Check | `npm run lint` | **PASS (0 errors, exit code 0)** |
| Automated Test Suite | `npm test -- --run` | **PASS (12/12 test suites, 53/53 tests passed)** |
| Production Build | `npm run build` | **PASS (Vite client + Esbuild server bundle generated)** |

---

## Owner Next Steps (Manual Configuration)

1. **Brevo Domain Authentication:** Verify `nexora-bvm.online` in Brevo DNS settings (DKIM & SPF) and configure sender as `no-reply@nexora-bvm.online`.
2. **Admin Password Initialization:** Run `npm run admin:password -- --set` to set the production admin password in Firestore.
3. **Vercel Env Cleanup:** Remove `ADMIN_SECURITY_PASSWORD` plain-text variable from Vercel dashboard once the scrypt hash is stored in Firestore.
