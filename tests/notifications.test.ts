import { describe, it, expect } from 'vitest';
import { cleanFirestoreData } from '../src/services/dataService';

describe('Phase 2 — Firestore Notification and Data Sanitization', () => {
  it('cleanFirestoreData removes undefined properties recursively', () => {
    const dirtyData = {
      title: 'Global Hackathon',
      expires_at: undefined,
      nested: {
        created_by: undefined,
        active: true,
        count: 0,
        emptyList: []
      },
      tags: ['ai', 'bvm']
    };

    const cleaned = cleanFirestoreData(dirtyData);
    expect(cleaned).toHaveProperty('title', 'Global Hackathon');
    expect(cleaned).not.toHaveProperty('expires_at');
    expect(cleaned.nested).toHaveProperty('active', true);
    expect(cleaned.nested).toHaveProperty('count', 0);
    expect(cleaned.nested).not.toHaveProperty('created_by');
    expect(cleaned.tags).toEqual(['ai', 'bvm']);
  });

  it('cleanFirestoreData preserves null and boolean false values correctly', () => {
    const dataWithFalsy = {
      isComingSoon: false,
      registration_open: false,
      fee: 0,
      metadata: null,
      unwanted: undefined
    };

    const cleaned = cleanFirestoreData(dataWithFalsy);
    expect(cleaned.isComingSoon).toBe(false);
    expect(cleaned.registration_open).toBe(false);
    expect(cleaned.fee).toBe(0);
    expect(cleaned.metadata).toBeNull();
    expect(cleaned).not.toHaveProperty('unwanted');
  });

  it('handles notification with valid ISO expiry date', () => {
    const isoDate = new Date(Date.now() + 86400000).toISOString();
    const notificationPayload = {
      id: 'notif_test_1',
      title: 'Workshop Alert',
      message: 'Workshop starts tomorrow.',
      expires_at: isoDate,
      audience: 'all'
    };

    const cleaned = cleanFirestoreData(notificationPayload);
    expect(cleaned.expires_at).toBe(isoDate);
  });

  it('handles notification without expiry date without passing undefined', () => {
    const rawNotif = {
      id: 'notif_test_2',
      title: 'Permanent Resource',
      message: 'Guidebook published.',
      expires_at: undefined,
      publish_at: undefined
    };

    const cleaned = cleanFirestoreData(rawNotif);
    expect(cleaned).not.toHaveProperty('expires_at');
    expect(cleaned).not.toHaveProperty('publish_at');
    expect(Object.keys(cleaned)).toEqual(['id', 'title', 'message']);
  });
});
