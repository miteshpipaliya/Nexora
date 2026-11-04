# NEXORA Do-Not-Break Smoke Test Checklist (v6)

**Testing Date:** 2026-11-04  
**Environment:** Local Dev & Production Staging  
**Production URL:** https://www.nexora-bvm.online  

---

## 1. Do-Not-Break Feature Verification (Before & After)

| Item | Status | Verified Functionality |
|------|--------|------------------------|
| **Home Page** | PASS | Cosmic galaxy background, interactive 3D hero core, live statistics, core competition cards, and BVM affiliation details render seamlessly. |
| **About Page** | PASS | Mission statement, technical innovation philosophy, and student community governance render without errors. |
| **Competitions List** | PASS | Hub page displays active and published technical challenges with status badges, capacity meters, and dynamic routes. |
| **Competition Details** | PASS | Dynamic routes (`/competitions/:slug`) load live event records, prize distributions, rules, judging rubrics, and registration CTA. Guarded with `Array.isArray`. |
| **Student Signup with OTP** | PASS | Validates student credentials, enforces 60-second cooldown rate limit, dispatches 6-digit verification code with safe error codes, and verifies keyed HMAC challenge. |
| **Login with Email & Google** | PASS | Firebase email/password and Google OAuth popup providers initialize cleanly. |
| **Forgot & Reset Password** | PASS | Dispatches recovery code, verifies single-use token, updates password hash securely. |
| **Competition Registration** | PASS | Transactional creation (`uid_slug`), capacity check, server-computed fee (₹50 BVM / ₹70 External), duplicate prevention, and Firestore security enforcement. |
| **Profile View & Edit** | PASS | Authenticated profile loads; whitelisted updates persist to Firestore matching `isValidUserProfile` rules. |
| **Notification Bell** | PASS | Real-time subscription to published broadcasts, unread count badge, speaker switch (Sound on/off), and "Test sound" button. Dynamically updates document title to `(N) NEXORA` when tab is hidden. |
| **Broadcast Toast & Sound** | PASS | WhatsApp-style corner toast (bottom-right desktop, top-right mobile) slides in with gentle bounce and original Web Audio synthesized two-tone chime (880Hz -> 1320Hz). Auto-dismisses at 10s (pauses on hover), swipe-to-dismiss on touch, multi-tab single playback claim via BroadcastChannel. |
| **Contact Form** | PASS | Direct submission routed through server endpoint with IP rate limiting and payload size caps. |
| **Store Coming Soon** | PASS | NEXORA merchandise teaser page renders cleanly with responsive cards. |
| **Team Page** | PASS | Founder digital credential renders; active team members load from `/api/team/public` with `s-maxage=60` cache and whitelisted public fields. |
| **Admin Login (2FA & Session)** | PASS | Factor 1 Admin Security Password checked against authoritative scrypt hash in Firestore with 30s TTL cache. 5-failure lockout (HTTP 423). Factor 2 OTP dispatched via Brevo. Elevated session issued with 15-minute validity. |
| **Admin Competitions CRUD** | PASS | Create, edit, publish, and delete operations enforced with hard ceiling of 15 competitions and transactional slug collision handling. |
| **Admin Notifications CRUD** | PASS | Immediate post ("Post now") and scheduled broadcasts with audit log entries. Preview button triggers local toast and sound. |
| **Admin Images CRUD** | PASS | Preset image library loaded; in-use deletion protection verified. |
| **Admin Team Members CRUD** | PASS | Team meta roles (1 to 8 hierarchy with Faculty Member #2) and member publishing controls functional. |
| **Logout** | PASS | Client session cleared, elevated token destroyed, storage cleaned. |

---

## 2. Multi-Browser Broadcast Smoke Test (Package D)

- **Setup:** Opened home page in two browser sessions (one signed in as founder, one signed out as visitor).
- **Audio Unlock:** Clicked once on the viewport in both browsers to fulfill browser autoplay policy.
- **Broadcast Trigger:** Published an announcement from Admin Console ("Hackathon Registration Now Open").
- **Results:**
  - Both sessions displayed the non-blocking WhatsApp-style toast on the right side within ~3 seconds without page reload.
  - Exactly **one** tab synthesized the two-tone chime (multi-tab playback lock acquired via `BroadcastChannel`).
  - Bell unread badge incremented from 0 to 1.
  - Toggling the speaker switch to "Sound off" silenced subsequent notifications.
  - Refreshing the page retrieved the broadcast from cache as seen, preventing repeat toast/chime.
