/**
 * src/services/presenceService.ts
 * Real-Time Student Online/Offline Presence Tracking
 *
 * Implements multi-tab heartbeat leasing, disconnect detection,
 * automatic reconnect on visibility change, and secure Firestore sync.
 */

import { doc, setDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';

export interface UserPresenceRecord {
  user_id: string;
  is_online: boolean;
  last_seen: number;
  last_active_at?: string;
  sessions?: Record<string, number>;
  client_info?: {
    user_agent?: string;
    platform?: string;
  };
}

// Presence lease threshold: Heartbeat dispatched every 25 seconds; lease valid for 65 seconds
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;
export const PRESENCE_LEASE_TIMEOUT_MS = 65_000;

let currentHeartbeatTimer: NodeJS.Timeout | null = null;
let activePresenceUserId: string | null = null;
let currentTabSessionId: string | null = null;
let isListenersRegistered = false;

/**
 * Returns or creates a stable session ID for this browser tab
 */
export function getTabSessionId(): string {
  if (currentTabSessionId) return currentTabSessionId;
  if (typeof window === 'undefined') return 'server_session';

  try {
    const existing = window.sessionStorage.getItem('nexora_tab_session_id');
    if (existing) {
      currentTabSessionId = existing;
      return existing;
    }
    const generated = 'tab_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    window.sessionStorage.setItem('nexora_tab_session_id', generated);
    currentTabSessionId = generated;
    return generated;
  } catch {
    currentTabSessionId = 'tab_' + Math.random().toString(36).slice(2, 10);
    return currentTabSessionId;
  }
}

/**
 * Checks whether a given presence document represents an actively connected user
 */
export function isUserOnline(presence?: UserPresenceRecord | null, leaseMs = PRESENCE_LEASE_TIMEOUT_MS): boolean {
  if (!presence) return false;
  const now = Date.now();

  // If multi-tab session tracking is present, check if any active session is within the lease window
  if (presence.sessions && typeof presence.sessions === 'object') {
    const sessionTimes = Object.values(presence.sessions).filter(
      (ts): ts is number => typeof ts === 'number' && Number.isFinite(ts)
    );
    if (sessionTimes.length > 0) {
      const mostRecentSession = Math.max(...sessionTimes);
      if (now - mostRecentSession < leaseMs) {
        return true;
      }
    }
  }

  // If explicitly flagged offline and no active session, user is offline
  if (presence.is_online === false) return false;

  const lastSeen = typeof presence.last_seen === 'number' ? presence.last_seen : 0;
  if (lastSeen <= 0) return false;
  return (now - lastSeen) < leaseMs;
}

/**
 * Formats a last_seen timestamp into human-readable relative time
 */
export function formatLastSeen(lastSeen?: number | null): string {
  if (!lastSeen || typeof lastSeen !== 'number') return 'Never seen';
  const diffMs = Date.now() - lastSeen;
  if (diffMs < 0) return 'Just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return new Date(lastSeen).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Dispatches a single heartbeat ping to Firestore
 */
async function sendHeartbeat(userId: string): Promise<void> {
  if (!userId || !db) return;
  const sessionId = getTabSessionId();
  const now = Date.now();

  try {
    const presenceRef = doc(db, 'userPresence', userId);
    await setDoc(
      presenceRef,
      {
        user_id: userId,
        is_online: true,
        last_seen: now,
        last_active_at: new Date(now).toISOString(),
        sessions: {
          [sessionId]: now
        }
      },
      { merge: true }
    );
  } catch (err) {
    // Non-fatal: network fluctuation or permissions during token refresh
    console.debug('[PRESENCE] Heartbeat write silently bypassed:', err);
  }
}

/**
 * Dispatches a leave notification on tab unload / disconnect
 */
async function sendDisconnect(userId: string, isFullLogout: boolean = false): Promise<void> {
  if (!userId || !db) return;
  const sessionId = getTabSessionId();

  try {
    const presenceRef = doc(db, 'userPresence', userId);
    const updatePayload: Record<string, any> = {
      last_seen: Date.now(),
      last_active_at: new Date().toISOString(),
      [`sessions.${sessionId}`]: deleteField()
    };
    if (isFullLogout) {
      updatePayload.is_online = false;
      updatePayload.sessions = {};
    }
    await setDoc(presenceRef, updatePayload, { merge: true });
  } catch (err) {
    console.debug('[PRESENCE] Disconnect write silently bypassed:', err);
  }
}

/**
 * Starts continuous heartbeat tracking for the authenticated user
 */
export function startPresenceHeartbeat(userId: string): void {
  if (!userId) return;

  // If already tracking this exact user, ping immediately and retain
  if (activePresenceUserId === userId && currentHeartbeatTimer) {
    void sendHeartbeat(userId);
    return;
  }

  // Stop previous tracking if switching user
  if (activePresenceUserId && activePresenceUserId !== userId) {
    stopPresenceHeartbeat(activePresenceUserId);
  }

  activePresenceUserId = userId;

  // Immediate first heartbeat
  void sendHeartbeat(userId);

  // Setup periodic heartbeat
  if (currentHeartbeatTimer) {
    clearInterval(currentHeartbeatTimer);
  }
  currentHeartbeatTimer = setInterval(() => {
    if (activePresenceUserId) {
      void sendHeartbeat(activePresenceUserId);
    }
  }, PRESENCE_HEARTBEAT_INTERVAL_MS);

  // Register window lifecycle listeners once
  if (!isListenersRegistered && typeof window !== 'undefined') {
    isListenersRegistered = true;

    // Visibility change: When student switches tabs back, trigger immediate heartbeat
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && activePresenceUserId) {
        void sendHeartbeat(activePresenceUserId);
      }
    });

    // Online event: network reconnect
    window.addEventListener('online', () => {
      if (activePresenceUserId) {
        void sendHeartbeat(activePresenceUserId);
      }
    });

    // Page unload / tab close
    const handleUnload = () => {
      if (activePresenceUserId) {
        void sendDisconnect(activePresenceUserId, false);
      }
    };
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
  }
}

/**
 * Stops continuous heartbeat tracking (e.g. on user logout)
 */
export function stopPresenceHeartbeat(userId?: string): void {
  const targetId = userId || activePresenceUserId;

  if (currentHeartbeatTimer) {
    clearInterval(currentHeartbeatTimer);
    currentHeartbeatTimer = null;
  }

  if (targetId) {
    void sendDisconnect(targetId, true);
  }

  if (!userId || userId === activePresenceUserId) {
    activePresenceUserId = null;
  }
}
