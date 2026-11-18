# NEXORA Mobile PWA 1.0 — Implementation blueprint

## Architecture
The existing Vercel frontend, Firebase Authentication, Firestore database, server API, registration workflow, Razorpay integration, and admin panel remain shared. The installed Android/iOS PWA is the same deployed web application in a standalone window. **Do not create a second Firebase project or duplicate registration collection.**

## Phase 1 — implemented on this branch
- Android/iOS web manifest with existing 192px, 512px and maskable phoenix icons.
- Mobile-only service worker registration. Desktop browsers receive the normal website.
- Online-first navigation. Only the static offline page and one icon are cached; no API, login, profile, OTP, admin, registration, or payment response is cached.
- Installed mobile mode removes the first-paint gate and CSS animations/transitions and disables the animated global galaxy canvas.
- Existing Firestore subscriptions and API calls are unchanged, preserving live backend data and shared accounts.

## Phase 2 — release gates (not yet verified)
1. Check `npm run typecheck`, `npm run test`, and `npm run build` with Node 24.
2. Test Android Chrome install and iOS Safari Add to Home Screen on physical devices.
3. Verify website and installed PWA use the same production Firebase project, same registration records, same admin broadcasts and competition updates.
4. Test login persistence, logout, OTP, admin authorization, payment checkout, webhook confirmation, and registration idempotency.
5. Test offline fallback, reconnect, new release update, and background/foreground transitions. Never claim offline registrations work.
6. Confirm the desktop website's intro, animations and existing flows are unchanged.
7. Review all JavaScript-driven animation components separately; CSS motion suppression and the galaxy canvas bypass do not guarantee every custom JS effect is stopped.
8. Merge only after Vercel preview and CI pass.

## Operational notes
- Live in-app updates depend on active Firestore subscriptions or refresh logic and network connectivity; background push notifications are a separate future feature.
- Browser and iOS support for installation varies. Desktop installation is not promoted, but cannot be universally forbidden by a manifest.
- This branch does not change production Firestore, credentials, payments, or database schemas.
