/**
 * src/shared/lib/serverClock.ts
 * High-precision server clock synchronization to prevent local client clock skew
 * from misfiring scheduled broadcast popups or expirations.
 */

let serverOffsetMs = 0;
let lastSyncTime = 0;
let isSyncing = false;

export async function syncServerClock(): Promise<number> {
  if (isSyncing) return serverOffsetMs;
  isSyncing = true;
  const t0 = Date.now();
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    const t1 = Date.now();
    if (res.ok) {
      const data = await res.json();
      if (typeof data.serverTimeMs === 'number') {
        // Round trip latency compensation
        const roundTrip = t1 - t0;
        const estimatedServerTime = data.serverTimeMs + roundTrip / 2;
        serverOffsetMs = estimatedServerTime - t1;
        lastSyncTime = Date.now();
      }
    }
  } catch {
    // Graceful fallback: maintain previous offset
  } finally {
    isSyncing = false;
  }
  return serverOffsetMs;
}

export function getServerNow(): number {
  // If never synced or older than 10 minutes, trigger background sync
  if (typeof window !== 'undefined' && Date.now() - lastSyncTime > 10 * 60 * 1000 && !isSyncing) {
    syncServerClock().catch(() => {});
  }
  return Date.now() + serverOffsetMs;
}

export function getServerDate(): Date {
  return new Date(getServerNow());
}

export function formatScheduledTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return isoString;
  }
}

// Auto-sync on client load
if (typeof window !== 'undefined') {
  syncServerClock().catch(() => {});
}
