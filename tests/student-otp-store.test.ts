import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { StudentOtpStore, StudentOtpRateLimitError, StudentOtpStorageError } from '../src/server/studentOtpStore';

const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

function firestoreDouble() {
  const records = new Map<string, any>();
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        key: `${name}/${id}`,
        get: async () => {
          const value = records.get(`${name}/${id}`);
          return { exists: Boolean(value), data: () => value };
        },
        set: async (value: any) => records.set(`${name}/${id}`, value),
        delete: async () => records.delete(`${name}/${id}`)
      })
    }),
    runTransaction: async (operation: (transaction: any) => Promise<unknown>) => {
      const writes = new Map<string, any>();
      const transaction = {
        get: async (ref: { key: string }) => {
          const value = records.get(ref.key);
          return { exists: Boolean(value), data: () => value };
        },
        set: (ref: { key: string }, value: any) => writes.set(ref.key, value)
      };
      const result = await operation(transaction);
      for (const [key, value] of writes) records.set(key, value);
      return result;
    }
  };
  return { db };
}

describe('StudentOtpStore', () => {
  it('expires challenges, counts failed attempts, and consumes the right OTP once', async () => {
    const store = new StudentOtpStore(async () => null, false, 'x'.repeat(32));
    await store.setChallenge('student@example.com', 'signup', hash('123456'), 2_000, 1_000);
    await expect(store.verifyChallenge('student@example.com', 'signup', hash('000000'), 1_001)).resolves.toEqual({ status: 'invalid', remainingAttempts: 4 });
    for (let i = 0; i < 3; i++) await store.verifyChallenge('student@example.com', 'signup', hash('000000'), 1_002 + i);
    await expect(store.verifyChallenge('student@example.com', 'signup', hash('123456'), 1_006)).resolves.toEqual({ status: 'valid' });
    await expect(store.verifyChallenge('student@example.com', 'signup', hash('123456'), 1_007)).resolves.toEqual({ status: 'consumed' });

    await store.setChallenge('expired@example.com', 'reset-password', hash('123456'), 10, 1);
    await expect(store.verifyChallenge('expired@example.com', 'reset-password', hash('123456'), 11)).resolves.toEqual({ status: 'expired' });
  });

  it('locks after five wrong attempts and enforces resend cooldown', async () => {
    const store = new StudentOtpStore(async () => null, false, 'x'.repeat(32));
    await store.setChallenge('student@example.com', 'signup', hash('123456'), 50_000, 10_000);
    await expect(store.setChallenge('student@example.com', 'signup', hash('654321'), 60_000, 20_000)).rejects.toBeInstanceOf(StudentOtpRateLimitError);
    for (let i = 0; i < 4; i++) await store.verifyChallenge('student@example.com', 'signup', hash('000000'), 10_001 + i);
    await expect(store.verifyChallenge('student@example.com', 'signup', hash('000000'), 10_005)).resolves.toEqual({ status: 'locked' });
  });

  it('shares OTP and single-use authorization state across instances', async () => {
    const { db } = firestoreDouble();
    const first = new StudentOtpStore(async () => db, true, 'x'.repeat(32));
    const second = new StudentOtpStore(async () => db, true, 'x'.repeat(32));
    await first.setChallenge('student@example.com', 'signup', hash('123456'), 20_000, 1_000);
    await expect(second.verifyChallenge('student@example.com', 'signup', hash('123456'), 1_001)).resolves.toEqual({ status: 'valid' });
    await second.setAuthorization('student@example.com', 'signup', 'signed-token', 10_000);
    await expect(first.consumeAuthorization('student@example.com', 'signup', 'signed-token', 2_000)).resolves.toBe(true);
    await expect(second.consumeAuthorization('student@example.com', 'signup', 'signed-token', 2_001)).resolves.toBe(false);
  });

  it('applies a shared IP rate limit and fails closed if persistence is required', async () => {
    const { db } = firestoreDouble();
    const first = new StudentOtpStore(async () => db, true, 'x'.repeat(32));
    const second = new StudentOtpStore(async () => db, true, 'x'.repeat(32));
    for (let i = 0; i < 15; i++) expect(await first.checkIpRateLimit('203.0.113.2', 1_000 + i)).toBe(true);
    await expect(second.checkIpRateLimit('203.0.113.2', 1_020)).resolves.toBe(false);
    const unavailable = new StudentOtpStore(async () => null, true, 'x'.repeat(32));
    await expect(unavailable.checkIpRateLimit('203.0.113.3')).rejects.toBeInstanceOf(StudentOtpStorageError);
  });
});
