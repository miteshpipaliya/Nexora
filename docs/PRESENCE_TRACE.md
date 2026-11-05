# NEXORA Real-Time Presence & Online Status Trace

## Date: 2026-11-05
**Task**: Presence Root Cause Analysis & Architecture Plan (Prompt 2)

### 1. Root Cause Analysis: Why Everyone Shows Offline
1. **Missing or Inaccessible Field**:
   - In `src/pages/Admin/AdminPage.tsx` (lines 2526–2530), status was calculated using:
     `const online = isUserOnline(presence);`
     `const lastSeen = presence?.last_seen ? formatLastSeen(presence.last_seen) : (typeof s.last_active === 'number' && s.last_active > 0 ? formatLastSeen(s.last_active) : 'Never');`
   - In the database, the `users` documents never had `last_active` updated by any client code.
   - The fallback in `presenceService.ts` attempted to write to `userPresence/{userId}`, but `firestore.rules` had no matching rule allowing client writes to `userPresence`, so those writes were silently rejected by permissions or bypassed.
2. **Stateless Serverless In-Memory Heartbeats**:
   - The old heartbeat endpoint in `server.ts` (`POST /api/presence/heartbeat`) stored active user IDs in an in-memory `onlinePresenceMap = new Map()`.
   - On Vercel serverless environments, each serverless invocation runs in an isolated ephemeral execution environment. Cold starts and independent instances wipe or partition in-memory Maps.
   - An admin querying `/api/admin/stats` hit a different instance from the student's heartbeat, finding an empty map.
   - Furthermore, `/api/presence/heartbeat` was unauthenticated and logged raw client IP addresses.
3. **Fake Student Fallback in `getAllStudents`**:
   - When Firestore user queries encountered errors, `dataService.getAllStudents` fell back to creating invented demo records (e.g., enrollment `2208012001`, 3rd Year).
   - This masked permission failures and presented false records in administrative views.

### 2. Standardized Architecture: Lease-Based `presenceSessions`
- **Collection**: `presenceSessions`
- **Document ID**: Unique UUID generated per browser tab and stored in `sessionStorage` (`nexora_tab_presence_session_id`).
  - Reloading the same tab retains the session document.
  - Opening a second tab creates a separate session document.
- **Document Schema**:
  ```typescript
  interface PresenceSessionDocument {
    uid: string;            // Firebase Auth UID of the authenticated user
    startedAt: string;      // ISO string
    lastSeen: any;          // FieldValue.serverTimestamp()
    expireAt: any;          // Timestamp set to lastSeen + 24 hours (for Firestore TTL policy)
  }
  ```
- **Session Lease Threshold**:
  - Heartbeat interval: **45 seconds** (tolerate background tab throttling to ~60s).
  - Online lease threshold: **150 seconds** (2.5 minutes).
  - An account is **Online** if at least ONE session document exists with `now - lastSeen < 150 seconds`.
  - Closing a tab triggers a best-effort delete of that specific session doc via `deleteDoc` / REST `pagehide` keepalive.
  - If a device crashes, loses power, or kills mobile safari without running unload handlers, the lease naturally expires after 150 seconds, flipping the user to **Offline**.
- **Admin Real-Time Aggregation**:
  - The admin dashboard registers a single collection listener on `presenceSessions`.
  - Aggregates active sessions grouped by `uid`:
    `uid -> { isOnline: boolean, lastSeen: number, sessionCount: number }`.
  - A 10-second client-side interval timer continuously re-evaluates `now - lastSeen < 150_000` so students flip to Offline automatically without requiring a database mutation.
  - If the listener errors (e.g. permission denied or missing claim), status displays **Unknown** ("Presence unavailable") with an actionable admin alert—never a misleading "Offline".
- **Security Rules**:
  - Document ID validated with UUID regex: `sessionDocId.matches('^[a-fA-F0-9\\-]+$')`
  - Create: `isSignedIn() && request.resource.data.uid == request.auth.uid && request.resource.data.keys().hasOnly(['uid', 'startedAt', 'lastSeen', 'expireAt'])`
  - Update: `isSignedIn() && resource.data.uid == request.auth.uid && request.resource.data.uid == request.auth.uid && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastSeen', 'expireAt'])`
  - Delete: `isSignedIn() && resource.data.uid == request.auth.uid`
  - Read: `isAdmin()`
