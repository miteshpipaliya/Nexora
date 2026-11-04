import crypto from 'node:crypto';

export type StudentOtpPurpose = 'signup' | 'reset-password';

export interface StudentOtpChallenge {
  email: string;
  hash: string | null;
  expiresAt: number;
  attempts: number;
  purpose: StudentOtpPurpose;
  lastSentAt: number;
  status: 'pending' | 'consumed' | 'locked' | 'expired';
}

interface StudentOtpAuthorization {
  email: string;
  tokenHash: string | null;
  purpose: StudentOtpPurpose;
  expiresAt: number;
  status: 'pending' | 'consumed' | 'expired';
}

export type StudentOtpVerification =
  | { status: 'valid' }
  | { status: 'invalid'; remainingAttempts: number }
  | { status: 'missing' | 'expired' | 'locked' | 'consumed' };

export class StudentOtpRateLimitError extends Error {
  constructor(public waitSeconds: number) {
    super(`Please wait ${waitSeconds}s before requesting another verification code.`);
    this.name = 'StudentOtpRateLimitError';
  }
}

export class StudentOtpStorageError extends Error {
  constructor() {
    super('Persistent email verification storage is unavailable.');
    this.name = 'StudentOtpStorageError';
  }
}

const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const challengeKey = (email: string, purpose: StudentOtpPurpose) => digest(`${purpose}:${email.toLowerCase().trim()}`);
const sameHex = (left: string | null, right: string) => {
  if (!left || !/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const leftBytes = Buffer.from(left, 'hex');
  const rightBytes = Buffer.from(right, 'hex');
  return leftBytes.length === rightBytes.length && crypto.timingSafeEqual(leftBytes, rightBytes);
};

/** Firestore-backed for Vercel; local memory fallback is only available outside serverless. */
export class StudentOtpStore {
  private challenges = new Map<string, StudentOtpChallenge>();
  private authorizations = new Map<string, StudentOtpAuthorization>();
  private rateLimits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly getDb: () => Promise<any>,
    private readonly requirePersistence: boolean,
    private readonly rateLimitKey: string | (() => string)
  ) {}

  private async database() {
    try {
      const db = await this.getDb();
      if (!db && this.requirePersistence) throw new StudentOtpStorageError();
      return db;
    } catch (error) {
      if (this.requirePersistence) throw new StudentOtpStorageError();
      return null;
    }
  }

  async checkIpRateLimit(ip: string, now = Date.now()): Promise<boolean> {
    const rateLimitKey = typeof this.rateLimitKey === 'function' ? this.rateLimitKey() : this.rateLimitKey;
    const rateId = crypto.createHmac('sha256', rateLimitKey).update(ip).digest('hex');
    const db = await this.database();
    if (!db) {
      const previous = this.rateLimits.get(rateId);
      if (!previous || now - previous.windowStart >= 10 * 60 * 1000) {
        this.rateLimits.set(rateId, { count: 1, windowStart: now });
        return true;
      }
      if (previous.count >= 15) return false;
      previous.count += 1;
      return true;
    }

    const ref = db.collection('_otp_ratelimits').doc(rateId);
    return db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(ref);
      const previous = snapshot.exists ? snapshot.data() : null;
      if (!previous || now - previous.windowStart >= 10 * 60 * 1000) {
        transaction.set(ref, { count: 1, windowStart: now });
        return true;
      }
      if (previous.count >= 15) return false;
      transaction.set(ref, { count: previous.count + 1, windowStart: previous.windowStart });
      return true;
    });
  }

  async setChallenge(email: string, purpose: StudentOtpPurpose, hash: string, expiresAt: number, now = Date.now()): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = challengeKey(normalizedEmail, purpose);
    const record: StudentOtpChallenge = {
      email: normalizedEmail, hash, expiresAt, attempts: 0, purpose, lastSentAt: now, status: 'pending'
    };
    const db = await this.database();
    if (!db) {
      const current = this.challenges.get(id);
      this.enforceCooldown(current?.lastSentAt, now);
      this.challenges.set(id, record);
      return;
    }

    const ref = db.collection('_otp_challenges').doc(id);
    await db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists ? snapshot.data() as StudentOtpChallenge : null;
      this.enforceCooldown(current?.lastSentAt, now);
      transaction.set(ref, record);
    });
  }

  async getChallenge(email: string, purpose: StudentOtpPurpose): Promise<StudentOtpChallenge | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = challengeKey(normalizedEmail, purpose);
    const db = await this.database();
    if (!db) {
      const local = this.challenges.get(id);
      return local?.status === 'pending' && local.expiresAt > Date.now() ? local : undefined;
    }

    const ref = db.collection('_otp_challenges').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return undefined;
    const challenge = snapshot.data() as StudentOtpChallenge;
    return challenge.status === 'pending' && challenge.expiresAt > Date.now() ? challenge : undefined;
  }

  async verifyChallenge(email: string, purpose: StudentOtpPurpose, actualHash: string, now = Date.now()): Promise<StudentOtpVerification> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = challengeKey(normalizedEmail, purpose);
    const db = await this.database();
    if (!db) {
      const challenge = this.challenges.get(id);
      return this.verifyLocal(id, challenge, actualHash, now);
    }

    const ref = db.collection('_otp_challenges').doc(id);
    return db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { status: 'missing' } as StudentOtpVerification;
      const challenge = snapshot.data() as StudentOtpChallenge;
      return this.evaluateChallenge(transaction, ref, challenge, actualHash, now);
    });
  }

  async deleteChallenge(email: string, purpose: StudentOtpPurpose): Promise<void> {
    const id = challengeKey(email, purpose);
    const db = await this.database();
    if (!db) {
      this.challenges.delete(id);
      return;
    }
    await db.collection('_otp_challenges').doc(id).delete();
  }

  async setAuthorization(email: string, purpose: StudentOtpPurpose, token: string, expiresAt: number): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = challengeKey(normalizedEmail, purpose);
    const record: StudentOtpAuthorization = {
      email: normalizedEmail,
      tokenHash: digest(token),
      purpose,
      expiresAt,
      status: 'pending'
    };
    const db = await this.database();
    if (!db) {
      this.authorizations.set(id, record);
      return;
    }
    await db.collection('_reset_authorizations').doc(id).set(record);
  }

  async consumeAuthorization(email: string, purpose: StudentOtpPurpose, token: string, now = Date.now()): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = challengeKey(normalizedEmail, purpose);
    const db = await this.database();
    if (!db) {
      const authorization = this.authorizations.get(id);
      if (!authorization || authorization.status !== 'pending' || authorization.expiresAt < now || !sameHex(authorization.tokenHash, digest(token))) return false;
      this.authorizations.set(id, { ...authorization, tokenHash: null, status: 'consumed' });
      return true;
    }

    const ref = db.collection('_reset_authorizations').doc(id);
    return db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return false;
      const authorization = snapshot.data() as StudentOtpAuthorization;
      if (authorization.status !== 'pending' || authorization.expiresAt < now || !sameHex(authorization.tokenHash, digest(token))) return false;
      transaction.set(ref, { ...authorization, tokenHash: null, status: 'consumed' });
      return true;
    });
  }

  private enforceCooldown(lastSentAt: number | undefined, now: number) {
    if (lastSentAt && now - lastSentAt < 30_000) {
      throw new StudentOtpRateLimitError(Math.ceil((30_000 - (now - lastSentAt)) / 1000));
    }
  }

  private verifyLocal(id: string, challenge: StudentOtpChallenge | undefined, actualHash: string, now: number): StudentOtpVerification {
    if (!challenge) return { status: 'missing' };
    return this.evaluateChallenge(null, id, challenge, actualHash, now);
  }

  private evaluateChallenge(transaction: any, ref: any, challenge: StudentOtpChallenge, actualHash: string, now: number): StudentOtpVerification {
    if (challenge.status !== 'pending') return { status: challenge.status === 'locked' ? 'locked' : 'consumed' };
    if (now > challenge.expiresAt) {
      this.write(transaction, ref, { ...challenge, hash: null, status: 'expired' });
      return { status: 'expired' };
    }

    const attempts = challenge.attempts + 1;
    if (sameHex(challenge.hash, actualHash)) {
      this.write(transaction, ref, { ...challenge, attempts, hash: null, status: 'consumed' });
      return { status: 'valid' };
    }

    const remainingAttempts = Math.max(0, 5 - attempts);
    this.write(transaction, ref, {
      ...challenge,
      attempts,
      hash: remainingAttempts ? challenge.hash : null,
      status: remainingAttempts ? 'pending' : 'locked'
    });
    return remainingAttempts ? { status: 'invalid', remainingAttempts } : { status: 'locked' };
  }

  private write(transaction: any, ref: any, value: StudentOtpChallenge) {
    if (transaction) transaction.set(ref, value);
    else this.challenges.set(ref, value);
  }
}
