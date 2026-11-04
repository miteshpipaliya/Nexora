# NEXORA Do-Not-Break Smoke Test Checklist

**Testing Date:** 2026-11-04  
**Environment:** Local Dev & Production Staging

## Baseline Verification (Before Changes)

| Item | Status | Verified Functionality |
|------|--------|------------------------|
| **Home Page** | PASS | Loaded hero, interactive galaxy, vision, and core competition cards |
| **About Page** | PASS | Loaded mission, BVM affiliation, values, and student technology ecosystem |
| **Competitions List** | PASS | 6 official competitions rendered with banners, tags, and detail links |
| **Competition Details** | PASS | `/competitions/zerocode` rendered rules, judging criteria, FAQ, prizes |
| **Student Signup with OTP** | PASS | `/api/auth/send-email-otp` & `/api/auth/verify-email-otp` endpoints operational |
| **Login with Email & Google** | PASS | Google popup provider & Firebase auth credentials ready |
| **Forgot & Reset Password** | PASS | `/api/auth/reset-password` endpoints active |
| **Competition Registration** | PASS | Individual & Team modal validations active, deterministic doc IDs enforced |
| **Profile View & Edit** | PASS | Student profile loaded, form inputs responsive |
| **Notification Bell** | PASS | Dropdown opens, displays notifications from collection |
| **Contact Form** | PASS | Contact message submission active with Firestore sync |
| **Store Coming Soon** | PASS | Store merchandise teaser page renders cleanly |
| **Team Page** | PASS | Founder digital credential renders; regular members load from API/fallback |
| **Admin Login (2FA & Session)** | PASS | Password check & HMAC elevated session token issued |
| **Admin Competitions CRUD** | PASS | Create, edit, publish, delete routes guarded with elevated admin check |
| **Admin Notifications CRUD** | PASS | Broadcast creation, preview, and delete functioning |
| **Admin Images CRUD** | PASS | Preset library loaded, in-use checks enforced |
| **Admin Team Members CRUD** | PASS | Meta and member endpoints guarded |
| **Logout** | PASS | Session revoked, client storage cleared |
