import { describe, it, expect } from 'vitest';
import { 
  isUserOnline, 
  formatLastSeen, 
  PRESENCE_LEASE_TIMEOUT_MS, 
  type UserPresenceRecord 
} from '../src/services/presenceService';

describe('Real-Time Student Presence Service', () => {
  it('identifies user as online when last_seen is within lease timeout', () => {
    const record: UserPresenceRecord = {
      user_id: 'user_123',
      is_online: true,
      last_seen: Date.now() - 10_000 // 10s ago
    };
    expect(isUserOnline(record)).toBe(true);
  });

  it('identifies user as offline when last_seen exceeds lease timeout', () => {
    const record: UserPresenceRecord = {
      user_id: 'user_123',
      is_online: true,
      last_seen: Date.now() - (PRESENCE_LEASE_TIMEOUT_MS + 5_000)
    };
    expect(isUserOnline(record)).toBe(false);
  });

  it('handles multi-tab sessions: user remains online if any session lease is active', () => {
    const now = Date.now();
    const record: UserPresenceRecord = {
      user_id: 'user_123',
      is_online: false, // top-level was marked false on one tab close
      last_seen: now - 30_000,
      sessions: {
        tab_closed: now - 70_000,
        tab_active: now - 15_000 // active session within 65s
      }
    };
    expect(isUserOnline(record)).toBe(true);
  });

  it('identifies user as offline if all sessions expired', () => {
    const now = Date.now();
    const record: UserPresenceRecord = {
      user_id: 'user_123',
      is_online: true,
      last_seen: now - (PRESENCE_LEASE_TIMEOUT_MS + 20_000),
      sessions: {
        tab_1: now - (PRESENCE_LEASE_TIMEOUT_MS + 20_000),
        tab_2: now - (PRESENCE_LEASE_TIMEOUT_MS + 10_000)
      }
    };
    expect(isUserOnline(record)).toBe(false);
  });

  it('formats last seen timestamps cleanly', () => {
    const now = Date.now();
    expect(formatLastSeen(now - 15_000)).toBe('Just now');
    expect(formatLastSeen(now - 120_000)).toBe('2m ago');
    expect(formatLastSeen(now - 7200_000)).toBe('2h ago');
    expect(formatLastSeen(null)).toBe('Never seen');
    expect(formatLastSeen(undefined)).toBe('Never seen');
  });
});
