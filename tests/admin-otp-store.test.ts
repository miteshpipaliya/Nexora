import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { AdminOtpChallengeStore, AdminOtpRateLimitError, AdminOtpStorageError, type AdminOtpChallenge } from '../src/server/adminOtpChallengeStore';

const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

function challenge(overrides: Partial<AdminOtpChallenge> = {}): AdminOtpChallenge {
  return {
    flow: 'password-reset',
    hash: hash('654321'),
    expiresAt: 20_000,
    attempts: 0,
    lastSentAt: 10_000,
    status: 'pending',
    ...overrides
  };
}

function firestoreDouble() {
  const documents = new Map<string, AdminOtpChallenge>();
  const makeRef = (id: string) => ({ id, collection: '_admin_challenges' });
  const db = {
    collection: (collectionName: string) => ({
      doc: (id: string) => ({
        key: `${collectionName}/${id}`,
        get: async () => {
          const value = documents.get(`${collectionName}/${id}`);
          return { exists: Boolean(value), data: () => value };
        }
      })
    }),
    runTransaction: async (operation: (transaction: any) => Promise<unknown>) => {
      const writes = new Map<string, AdminOtpChallenge>();
      const transaction = {
        get: async (ref: { key: string }) => {
          const value = documents.get(ref.key);
          return { exists: Boolean(value), data: () => value };
        },
        set: (ref: { key: string }, value: AdminOtpChallenge) => writes.set(ref.key, value)
      };
      const result = await operation(transaction);
      for (const [key, value] of writes) documents.set(key, value);
      return result;
    }
  };
  return { db, documents, makeRef };
}

describe('AdminOtpChallengeStore', () => {
  afterEach(() => vi.restoreAllMocks());

  it('enforces resend cooldown and persists only the challenge hash', async () => {
    const store = new AdminOtpChallengeStore(async () => null, false);
    await store.create('reset', challenge(), 60_000);

    await expect(store.create('reset', challenge({ lastSentAt: 11_000 }), 60_000))
      .rejects.toBeInstanceOf(AdminOtpRateLimitError);
    await expect(store.get('reset')).resolves.toMatchObject({ hash: hash('654321'), status: 'pending' });
  });

  it('expires challenges, limits attempts, and consumes a valid code once', async () => {
    const store = new AdminOtpChallengeStore(async () => null, false);
    await store.create('expired', challenge({ expiresAt: 100 }), 0);
    await expect(store.consume('expired', hash('654321'), 101)).resolves.toEqual({ status: 'expired' });

    await store.create('wrong', challenge(), 0);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(store.consume('wrong', hash('000000'), 10_001 + attempt))
        .resolves.toMatchObject({ status: 'invalid' });
    }
    await expect(store.consume('wrong', hash('000000'), 10_005)).resolves.toEqual({ status: 'locked' });

    await store.create('valid', challenge(), 0);
    await expect(store.consume('valid', hash('654321'), 10_001)).resolves.toEqual({ status: 'valid' });
    await expect(store.consume('valid', hash('654321'), 10_002)).resolves.toEqual({ status: 'consumed' });
  });

  it('fails closed when persistence is required but unavailable', async () => {
    const store = new AdminOtpChallengeStore(async () => null, true);
    await expect(store.create('reset', challenge(), 60_000)).rejects.toBeInstanceOf(AdminOtpStorageError);
  });

  it('shares challenges across server instances and prevents OTP replay', async () => {
    const { db } = firestoreDouble();
    const firstInstance = new AdminOtpChallengeStore(async () => db, true);
    const secondInstance = new AdminOtpChallengeStore(async () => db, true);
    await firstInstance.create('reset', challenge(), 60_000);

    await expect(secondInstance.get('reset')).resolves.toMatchObject({ hash: hash('654321') });
    await expect(secondInstance.consume('reset', hash('654321'), 10_001)).resolves.toEqual({ status: 'valid' });
    await expect(firstInstance.consume('reset', hash('654321'), 10_002)).resolves.toEqual({ status: 'consumed' });
  });

  it('keeps resend cooldowns across server instances', async () => {
    const { db } = firestoreDouble();
    const firstInstance = new AdminOtpChallengeStore(async () => db, true);
    const secondInstance = new AdminOtpChallengeStore(async () => db, true);
    await firstInstance.create('reset', challenge(), 60_000);

    await expect(secondInstance.create('reset', challenge({ lastSentAt: 11_000 }), 60_000))
      .rejects.toBeInstanceOf(AdminOtpRateLimitError);
  });
});
