// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { isValidSafeUrl, sanitizeSafeUrl } from '../src/shared/lib/safeUrl';
import { getSeenBroadcastIds, markBroadcastSeenLocally } from '../src/features/notifications/useBroadcastPopups';
import { InAppNotification } from '../src/types';

describe('WP8: safeUrl Security Validation', () => {
  it('rejects XSS and malicious protocols', () => {
    expect(isValidSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isValidSafeUrl('JAVASCRIPT:alert(document.cookie)')).toBe(false);
    expect(isValidSafeUrl('java\nscript:alert(1)')).toBe(false);
    expect(isValidSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
    expect(isValidSafeUrl('vbscript:msgbox("xss")')).toBe(false);
    expect(isValidSafeUrl('blob:https://example.com/uuid')).toBe(false);
  });

  it('rejects protocol-relative URLs that evade same-origin checks', () => {
    expect(isValidSafeUrl('//evil.com')).toBe(false);
    expect(isValidSafeUrl('//google.com/phishing')).toBe(false);
    expect(isValidSafeUrl('/\\evil.com')).toBe(false);
  });

  it('accepts valid internal same-origin relative paths', () => {
    expect(isValidSafeUrl('/competitions/zerocode')).toBe(true);
    expect(isValidSafeUrl('/store')).toBe(true);
    expect(isValidSafeUrl('/about')).toBe(true);
    expect(isValidSafeUrl('/competitions/ctf?tab=rules')).toBe(true);
  });

  it('accepts valid https and http URLs', () => {
    expect(isValidSafeUrl('https://bvmengineering.ac.in')).toBe(true);
    expect(isValidSafeUrl('http://localhost:3000')).toBe(true);
  });

  it('sanitizes strings properly', () => {
    expect(sanitizeSafeUrl('javascript:bad')).toBeNull();
    expect(sanitizeSafeUrl('  /competitions  ')).toBe('/competitions');
  });
});

describe('WP8: Broadcast Queue and Scheduling Helpers', () => {
  function computeDisplayAt(scheduledForMs: number, delaySeconds: number): number {
    return scheduledForMs + delaySeconds * 1000;
  }

  function isLive(displayAtMs: number, expiresAtMs: number | null, nowMs: number): boolean {
    if (displayAtMs > nowMs) return false;
    if (expiresAtMs !== null && expiresAtMs <= nowMs) return false;
    return true;
  }

  function sortQueue(items: InAppNotification[]): InAppNotification[] {
    const priorityWeight = (p: string) => (p === 'Urgent' ? 3 : p === 'High' ? 2 : 1);
    return [...items].sort((a, b) => {
      const pDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (pDiff !== 0) return pDiff;
      const timeA = typeof a.display_at === 'number' ? a.display_at : 0;
      const timeB = typeof b.display_at === 'number' ? b.display_at : 0;
      return timeA - timeB;
    });
  }

  it('computes display_at accurately with delay seconds', () => {
    const now = 1700000000000;
    const delaySec = 120; // 2 minutes
    expect(computeDisplayAt(now, delaySec)).toBe(now + 120000);
  });

  it('evaluates isLive correctly based on display_at and expires_at', () => {
    const now = 1700000000000;
    const futureDisplay = now + 60000;
    const pastDisplay = now - 60000;
    const futureExpiry = now + 120000;
    const pastExpiry = now - 10000;

    // In future -> not live
    expect(isLive(futureDisplay, null, now)).toBe(false);
    // In past without expiry -> live
    expect(isLive(pastDisplay, null, now)).toBe(true);
    // In past with future expiry -> live
    expect(isLive(pastDisplay, futureExpiry, now)).toBe(true);
    // In past with past expiry -> not live (expired)
    expect(isLive(pastDisplay, pastExpiry, now)).toBe(false);
  });

  it('orders queue by Urgent, High, Normal, then oldest first', () => {
    const items: InAppNotification[] = [
      { id: '1', title: 'Normal Late', message: '', category: 'Announcement', priority: 'Normal', audience: 'all', status: 'Published', display_at: 200, created_at: '' },
      { id: '2', title: 'Urgent Late', message: '', category: 'Announcement', priority: 'Urgent', audience: 'all', status: 'Published', display_at: 200, created_at: '' },
      { id: '3', title: 'High Early', message: '', category: 'Announcement', priority: 'High', audience: 'all', status: 'Published', display_at: 100, created_at: '' },
      { id: '4', title: 'Urgent Early', message: '', category: 'Announcement', priority: 'Urgent', audience: 'all', status: 'Published', display_at: 100, created_at: '' },
      { id: '5', title: 'Normal Early', message: '', category: 'Announcement', priority: 'Normal', audience: 'all', status: 'Published', display_at: 100, created_at: '' }
    ];

    const sorted = sortQueue(items);
    expect(sorted.map(s => s.id)).toEqual(['4', '2', '3', '5', '1']);
  });

  it('tracks seen notifications in localStorage and deduplicates', () => {
    localStorage.clear();
    expect(getSeenBroadcastIds().has('notif_123')).toBe(false);

    markBroadcastSeenLocally('notif_123');
    expect(getSeenBroadcastIds().has('notif_123')).toBe(true);

    markBroadcastSeenLocally('notif_456');
    expect(getSeenBroadcastIds().has('notif_123')).toBe(true);
    expect(getSeenBroadcastIds().has('notif_456')).toBe(true);
  });
});
