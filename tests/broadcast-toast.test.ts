import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSeenBroadcastIds,
  markBroadcastSeenLocally,
  formatRelativeTime,
  playNotificationChime
} from '../src/components/common/BroadcastToast';

describe('Broadcast Toast Subsystem (WP3 / R3)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Deduplication & Local Storage Cache', () => {
    it('returns empty set initially', () => {
      const seen = getSeenBroadcastIds();
      expect(seen.size).toBe(0);
    });

    it('stores and retrieves seen broadcast IDs', () => {
      markBroadcastSeenLocally('notif-1');
      markBroadcastSeenLocally('notif-2');
      const seen = getSeenBroadcastIds();
      expect(seen.has('notif-1')).toBe(true);
      expect(seen.has('notif-2')).toBe(true);
      expect(seen.has('notif-3')).toBe(false);
    });

    it('caps cache at 200 items', () => {
      for (let i = 0; i < 250; i++) {
        markBroadcastSeenLocally(`notif-${i}`);
      }
      const seen = getSeenBroadcastIds();
      expect(seen.size).toBe(200);
      expect(seen.has('notif-0')).toBe(false);
      expect(seen.has('notif-249')).toBe(true);
    });
  });

  describe('Relative Time Formatting', () => {
    it('formats recent timestamps as "just now"', () => {
      const nowStr = new Date(Date.now() - 10000).toISOString();
      expect(formatRelativeTime(nowStr)).toBe('just now');
    });

    it('formats minutes ago properly', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
    });

    it('formats hours ago properly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('formats days ago properly', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
    });

    it('handles undefined or invalid date strings gracefully', () => {
      expect(formatRelativeTime(undefined)).toBe('just now');
      expect(formatRelativeTime('invalid-date')).toBe('just now');
    });
  });

  describe('Chime audio invocation', () => {
    it('is enabled by default across all clients', async () => {
      const { isNotificationSoundEnabled } = await import('../src/shared/lib/notificationSound');
      expect(isNotificationSoundEnabled()).toBe(true);
    });

    it('does not throw when audio context is unavailable or invoked', () => {
      expect(() => playNotificationChime()).not.toThrow();
      expect(() => playNotificationChime('notif-test-1', true)).not.toThrow();
    });
  });
});
