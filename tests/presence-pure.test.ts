import { describe, it, expect } from 'vitest';
import { computePresence, formatPresenceLastSeen, PRESENCE_LEASE_TIMEOUT_MS } from '../src/services/presenceService';

describe('Pure Presence Computation (computePresence)', () => {
  it('returns offline state when sessions array is empty or undefined', () => {
    expect(computePresence([])).toEqual({ online: false, lastSeen: 0, sessionCount: 0 });
    expect(computePresence(null as any)).toEqual({ online: false, lastSeen: 0, sessionCount: 0 });
  });

  it('marks user online when single session is within 150s lease window', () => {
    const now = 1000000;
    const sessions = [{ lastSeen: now - 30_000 }];
    const res = computePresence(sessions, now);
    expect(res.online).toBe(true);
    expect(res.sessionCount).toBe(1);
    expect(res.lastSeen).toBe(now - 30_000);
  });

  it('marks user offline when single session is older than 150s lease window', () => {
    const now = 1000000;
    const sessions = [{ lastSeen: now - 150_001 }];
    const res = computePresence(sessions, now);
    expect(res.online).toBe(false);
    expect(res.sessionCount).toBe(0);
    expect(res.lastSeen).toBe(now - 150_001);
  });

  it('evaluates boundary at exactly 150s lease timeout', () => {
    const now = 1000000;
    const boundaryActive = [{ lastSeen: now - 149_999 }];
    expect(computePresence(boundaryActive, now).online).toBe(true);

    const boundaryExpired = [{ lastSeen: now - 150_000 }];
    expect(computePresence(boundaryExpired, now).online).toBe(false);
  });

  it('handles multi-tab sessions correctly: online if at least one tab is active', () => {
    const now = 1000000;
    const sessions = [
      { lastSeen: now - 180_000 }, // expired tab
      { lastSeen: now - 20_000 }    // active tab
    ];
    const res = computePresence(sessions, now);
    expect(res.online).toBe(true);
    expect(res.sessionCount).toBe(1);
    expect(res.lastSeen).toBe(now - 20_000);
  });

  it('counts all active tab sessions in sessionCount', () => {
    const now = 1000000;
    const sessions = [
      { lastSeen: now - 10_000 },
      { lastSeen: now - 25_000 },
      { lastSeen: now - 200_000 }
    ];
    const res = computePresence(sessions, now);
    expect(res.online).toBe(true);
    expect(res.sessionCount).toBe(2);
    expect(res.lastSeen).toBe(now - 10_000);
  });

  it('handles Firestore Timestamp-like objects with toMillis()', () => {
    const now = 1000000;
    const sessions = [
      { lastSeen: { toMillis: () => now - 15_000 } }
    ];
    const res = computePresence(sessions as any, now);
    expect(res.online).toBe(true);
    expect(res.sessionCount).toBe(1);
    expect(res.lastSeen).toBe(now - 15_000);
  });
});

describe('Presence Last Seen Formatter (formatPresenceLastSeen)', () => {
  it('formats recent timestamps as Just now or minutes', () => {
    const now = Date.now();
    expect(formatPresenceLastSeen(now - 5_000, now)).toBe('Just now');
    expect(formatPresenceLastSeen(now - 180_000, now)).toBe('3m ago');
    expect(formatPresenceLastSeen(now - 3600_000 * 3, now)).toBe('3h ago');
    expect(formatPresenceLastSeen(0, now)).toBe('Never seen');
    expect(formatPresenceLastSeen(null, now)).toBe('Never seen');
  });

  it('formats older timestamps with Asia/Kolkata date representation', () => {
    const now = new Date('2026-11-05T12:00:00Z').getTime();
    const threeDaysAgo = now - 3 * 24 * 3600_000;
    const formatted = formatPresenceLastSeen(threeDaysAgo, now);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
