import crypto from 'node:crypto';

export interface AdminOtpChallenge {
  flow: 'setup' | 'admin-login' | 'password-reset';
  hash: string | null;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  status: 'pending' | 'consumed' | 'locked' | 'expired' | 'delivery_failed';
  passwordTokenExpiresAt?: number;
}

export type OtpConsumeResult =
  | { status: 'valid' }
  | { status: 'invalid'; remainingAttempts: number }
  | { status: 'expired' | 'missing' | 'locked' | 'consumed' };

export class AdminOtpRateLimitError extends Error {
  constructor(public waitSeconds: number) {
    super(`Please wait ${waitSeconds}s before requesting another code.`);
    this.name = 'AdminOtpRateLimitError';
  }
}

export class AdminOtpStorageError extends Error {
  constructor() {
    super('Persistent administrator OTP storage is unavailable.');
    this.name = 'AdminOtpStorageError';
  }
}

function safeHashEquals(expected: string | null, actual: string): boolean {
  if (!expected || !/^[a-f0-9]{64}$/i.test(expected) || !/^[a-f0-9]{64}$/i.test(actual)) return false;
  const expectedBytes = Buffer.from(expected, 'hex');
  const actualBytes = Buffer.from(actual, 'hex');
  return expectedBytes.length === actualBytes.length && crypto.timingSafeEqual(expectedBytes, actualBytes);
}

/** Firestore-backed in serverless, in-memory only for local development/tests. */
export class AdminOtpChallengeStore {
  private local = new Map<string, AdminOtpChallenge>();

  constructor(
    private readonly getDb: () => Promise<any>,
    private readonly requirePersistence: boolean
  ) {}

  private async database() {
    const db = await this.getDb();
    if (!db && this.requirePersistence) throw new AdminOtpStorageError();
    return db;
  }

  async get(id: string): Promise<AdminOtpChallenge | null> {
    const db = await this.database();
    if (!db) return this.local.get(id) ?? null;
    const snapshot = await db.collection('_admin_challenges').doc(id).get();
    return snapshot.exists ? snapshot.data() as AdminOtpChallenge : null;
  }

  async create(id: string, challenge: AdminOtpChallenge, cooldownMs: number): Promise<void> {
    const db = await this.database();
    if (!db) {
      const previous = this.local.get(id);
      this.enforceCooldown(previous, challenge.lastSentAt, cooldownMs);
      if (previous?.flow === 'admin-login' && ['consumed', 'locked'].includes(previous.status)) {
        throw new Error('This administrator login challenge is no longer active.');
      }
      this.local.set(id, challenge);
      return;
    }

    const ref = db.collection('_admin_challenges').doc(id);
    await db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(ref);
      const previous = snapshot.exists ? snapshot.data() as AdminOtpChallenge : null;
      this.enforceCooldown(previous, challenge.lastSentAt, cooldownMs);
      if (previous?.flow === 'admin-login' && ['consumed', 'locked'].includes(previous.status)) {
        throw new Error('This administrator login challenge is no longer active.');
      }
      transaction.set(ref, challenge);
    });
  }

  async consume(id: string, actualHash: string, now = Date.now()): Promise<OtpConsumeResult> {
    const db = await this.database();
    if (!db) {
      const challenge = this.local.get(id);
      return this.consumeLocal(id, challenge, actualHash, now);
    }

    const ref = db.collection('_admin_challenges').doc(id);
    return db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { status: 'missing' } as OtpConsumeResult;
      const challenge = snapshot.data() as AdminOtpChallenge;
      if (challenge.status !== 'pending') return { status: challenge.status === 'locked' ? 'locked' : 'consumed' } as OtpConsumeResult;
      if (now > challenge.expiresAt) {
        transaction.set(ref, { ...challenge, hash: null, status: 'expired' });
        return { status: 'expired' } as OtpConsumeResult;
      }
      return this.evaluateAndPersist(transaction, ref, challenge, actualHash);
    });
  }

  async invalidate(id: string): Promise<void> {
    const db = await this.database();
    if (!db) {
      const challenge = this.local.get(id);
      if (challenge) this.local.set(id, { ...challenge, hash: null, status: 'delivery_failed' });
      return;
    }
    const ref = db.collection('_admin_challenges').doc(id);
    await db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return;
      const challenge = snapshot.data() as AdminOtpChallenge;
      transaction.set(ref, { ...challenge, hash: null, status: 'delivery_failed' });
    });
  }

  private enforceCooldown(previous: AdminOtpChallenge | null | undefined, now: number, cooldownMs: number) {
    if (!previous || !previous.lastSentAt || cooldownMs <= 0) return;
    const elapsed = now - previous.lastSentAt;
    if (elapsed < cooldownMs) throw new AdminOtpRateLimitError(Math.ceil((cooldownMs - elapsed) / 1000));
  }

  private consumeLocal(id: string, challenge: AdminOtpChallenge | undefined, actualHash: string, now: number): OtpConsumeResult {
    if (!challenge) return { status: 'missing' };
    if (challenge.status !== 'pending') return { status: challenge.status === 'locked' ? 'locked' : 'consumed' };
    if (now > challenge.expiresAt) {
      this.local.set(id, { ...challenge, hash: null, status: 'expired' });
      return { status: 'expired' };
    }
    return this.evaluateAndPersist(null, id, challenge, actualHash);
  }

  private evaluateAndPersist(transaction: any, ref: any, challenge: AdminOtpChallenge, actualHash: string): OtpConsumeResult {
    if (safeHashEquals(challenge.hash, actualHash)) {
      const consumed = { ...challenge, hash: null, status: 'consumed' as const };
      if (transaction) transaction.set(ref, consumed);
      else this.local.set(ref, consumed);
      return { status: 'valid' };
    }

    const attempts = challenge.attempts + 1;
    const remainingAttempts = Math.max(0, 5 - attempts);
    const locked = remainingAttempts === 0;
    const updated = { ...challenge, attempts, hash: locked ? null : challenge.hash, status: locked ? 'locked' as const : 'pending' as const };
    if (transaction) transaction.set(ref, updated);
    else this.local.set(ref, updated);
    return locked ? { status: 'locked' } : { status: 'invalid', remainingAttempts };
  }
}
