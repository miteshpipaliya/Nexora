/**
 * src/services/presenceService.ts
 * Real-Time Student Online/Offline Presence Tracking (Prompt 2)
 *
 * Implements short session leases in Firestore collection `presenceSessions`:
 * - 1 document per browser tab: `presenceSessions/{sessionId}` (UUID in sessionStorage)
 * - Heartbeat dispatched every 45 seconds using serverTimestamp()
 * - Online threshold: 150 seconds (2.5 minutes)
 * - Automatic refresh on visibilitychange, online, reconnect
 * - Best-effort session removal on pagehide and logout
 * - Pure computePresence helper for unit testing
 */

import { doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface PresenceSessionData {
  uid: string;
  startedAt: string;
  lastSeen: any;
  expireAt: any;
}

export interface UserPresenceState {
  online?: boolean;
  lastSeen?: number;
  sessionCount?: number;
  user_id?: string;
  is_online?: boolean;
  last_seen?: number;
  sessions?: Record<string, number>;
}
export type UserPresenceRecord = UserPresenceState;

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 45_000;
export const PRESENCE_LEASE_TIMEOUT_MS = 150_000;

let currentHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
let activePresenceUserId: string | null = null;
let currentTabSessionId: string | null = null;
let isListenersRegistered = false;

/**
 * Returns or creates a stable UUID for this browser tab session.
 * Survives page reloads within the same tab, but opening a new tab creates a fresh session.
 */
export function getTabSessionId(): string {
  if (currentTabSessionId) return currentTabSessionId;
  if (typeof window === 'undefined') return 'server-session';

  try {
    const existing = window.sessionStorage.getItem('nexora_tab_presence_session_id');
    if (existing && /^[a-fA-F0-9\-]{36}$/.test(existing)) {
      currentTabSessionId = existing;
      return existing;
    }
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    window.sessionStorage.setItem('nexora_tab_presence_session_id', newId);
    currentTabSessionId = newId;
    return newId;
  } catch {
    currentTabSessionId = '00000000-0000-4000-8000-000000000000';
    return currentTabSessionId;
  }
}

/**
 * Pure function to compute presence for a user from their active sessions.
 * Online when at least one session was updated within the lease window.
 */
export function computePresence(
  sessions: Array<{ lastSeen: number | Timestamp | string | null }>,
  now: number = Date.now(),
  leaseMs: number = PRESENCE_LEASE_TIMEOUT_MS
): UserPresenceState {
  if (!sessions || sessions.length === 0) {
    return { online: false, lastSeen: 0, sessionCount: 0 };
  }

  let latestLastSeen = 0;
  let activeCount = 0;

  for (const s of sessions) {
    if (!s || s.lastSeen == null) continue;
    let ts = 0;
    if (typeof s.lastSeen === 'number') {
      ts = s.lastSeen;
    } else if (typeof (s.lastSeen as any).toMillis === 'function') {
      ts = (s.lastSeen as any).toMillis();
    } else if (typeof s.lastSeen === 'string') {
      ts = new Date(s.lastSeen).getTime();
    }

    if (ts > latestLastSeen) {
      latestLastSeen = ts;
    }

    if (now - ts < leaseMs && ts > 0) {
      activeCount += 1;
    }
  }

  const isOnline = activeCount > 0 && (now - latestLastSeen < leaseMs);
  return {
    online: isOnline,
    lastSeen: latestLastSeen,
    sessionCount: activeCount
  };
}

/**
 * Formats a last_seen epoch millisecond into human-readable relative string
 * or Asia/Kolkata date format when older than an hour.
 */
export function formatPresenceLastSeen(lastSeen?: number | null, now: number = Date.now()): string {
  if (!lastSeen || lastSeen <= 0) return 'Never seen';
  const diffMs = now - lastSeen;
  if (diffMs < 0) return 'Just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  // For older than 24 hours, format using Asia/Kolkata timezone
  try {
    const dateObj = new Date(lastSeen);
    const timeStr = dateObj.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const isToday = new Date(now).toDateString() === dateObj.toDateString();
    if (isToday) {
      return `Today at ${timeStr}`;
    }

    const dateStr = dateObj.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric'
    });
    return `${dateStr} at ${timeStr}`;
  } catch {
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

/**
 * Dispatches a single heartbeat ping to Firestore collection `presenceSessions`.
 */
export async function sendSessionHeartbeat(userId: string): Promise<void> {
  if (!userId || !db) return;
  const sessionId = getTabSessionId();

  try {
    const sessionRef = doc(db, 'presenceSessions', sessionId);
    const expireTimestamp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await setDoc(
      sessionRef,
      {
        uid: userId,
        startedAt: new Date().toISOString(),
        lastSeen: serverTimestamp(),
        expireAt: expireTimestamp
      },
      { merge: true }
    );
  } catch (err) {
    // Failures must never crash the UI or throw uncaught errors
    console.debug('[PRESENCE] Session heartbeat write note:', err);
  }
}

/**
 * Dispatches a best-effort delete of this tab's session lease document.
 */
export async function removeSessionDoc(userId?: string): Promise<void> {
  if (!db) return;
  const sessionId = getTabSessionId();

  try {
    const sessionRef = doc(db, 'presenceSessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (err) {
    console.debug('[PRESENCE] Session delete note:', err);
  }

  // Also best-effort REST keepalive beacon if window supports it
  if (typeof navigator !== 'undefined' && typeof window !== 'undefined' && auth.currentUser) {
    try {
      auth.currentUser.getIdToken().then((token) => {
        if (!token) return;
        const projectId = 'gen-lang-client-0089073748';
        const dbId = 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/presenceSessions/${sessionId}`;
        fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true
        }).catch(() => {});
      }).catch(() => {});
    } catch {}
  }
}

/**
 * Starts continuous heartbeat leasing for the signed-in user.
 */
export function startPresenceHeartbeat(userId: string): void {
  if (!userId) return;

  if (activePresenceUserId === userId && currentHeartbeatTimer) {
    void sendSessionHeartbeat(userId);
    return;
  }

  if (activePresenceUserId && activePresenceUserId !== userId) {
    stopPresenceHeartbeat(activePresenceUserId);
  }

  activePresenceUserId = userId;
  void sendSessionHeartbeat(userId);

  if (currentHeartbeatTimer) {
    clearInterval(currentHeartbeatTimer);
  }
  currentHeartbeatTimer = setInterval(() => {
    if (activePresenceUserId) {
      void sendSessionHeartbeat(activePresenceUserId);
    }
  }, PRESENCE_HEARTBEAT_INTERVAL_MS);

  // Register window lifecycle hooks once
  if (!isListenersRegistered && typeof window !== 'undefined') {
    isListenersRegistered = true;

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && activePresenceUserId) {
        void sendSessionHeartbeat(activePresenceUserId);
      }
    });

    window.addEventListener('online', () => {
      if (activePresenceUserId) {
        void sendSessionHeartbeat(activePresenceUserId);
      }
    });

    const handleUnload = () => {
      if (activePresenceUserId) {
        void removeSessionDoc(activePresenceUserId);
      }
    };
    window.addEventListener('pagehide', handleUnload);
  }
}

/**
 * Stops continuous heartbeat tracking (e.g. on user logout) and removes this session.
 */
export function stopPresenceHeartbeat(userId?: string): void {
  const targetId = userId || activePresenceUserId;

  if (currentHeartbeatTimer) {
    clearInterval(currentHeartbeatTimer);
    currentHeartbeatTimer = null;
  }

  if (targetId) {
    void removeSessionDoc(targetId);
  }

  if (!userId || userId === activePresenceUserId) {
    activePresenceUserId = null;
  }
}

// Backward compatibility helper
export function isUserOnline(presence?: any, leaseMs: number = PRESENCE_LEASE_TIMEOUT_MS): boolean {
  if (!presence) return false;
  if (presence.sessions && typeof presence.sessions === 'object') {
    const sessionValues = Object.values(presence.sessions);
    const hasActiveSession = sessionValues.some((val: any) => {
      const ts = typeof val === 'number' ? val : 0;
      return (Date.now() - ts) < leaseMs;
    });
    return hasActiveSession;
  }
  if (typeof presence.online === 'boolean') return presence.online;
  const lastSeen = typeof presence.lastSeen === 'number' ? presence.lastSeen : (typeof presence.last_seen === 'number' ? presence.last_seen : 0);
  if (lastSeen <= 0) return false;
  return (Date.now() - lastSeen) < leaseMs;
}

export function formatLastSeen(lastSeen?: number | null): string {
  return formatPresenceLastSeen(lastSeen);
}
