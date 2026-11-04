/**
 * src/server/adminSecurity.ts
 * Dedicated, resilient admin security module for hashing, verifying, and persisting
 * the founder Admin Security Password (WP6).
 * Uses crypto.scryptSync with 16-byte random salt, constant-time compare, and Unicode NFKC normalization.
 */

import crypto from 'crypto';

export interface AdminSecurityRecord {
  passwordHash: string;
  salt: string;
  updatedAt: number;
  passwordVersion?: number;
}

/**
 * Normalizes password string using Unicode NFKC so composite characters match across keyboards/browsers.
 */
export function normalizePassword(password: string): string {
  if (typeof password !== 'string') return '';
  return password.normalize('NFKC');
}

/**
 * Generates an scrypt hash and 16-byte random salt for an admin password.
 */
export function hashPasswordScrypt(password: string, customSalt?: string): { passwordHash: string; salt: string } {
  const norm = normalizePassword(password);
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(norm, salt, 64).toString('hex');
  return { passwordHash, salt };
}

/**
 * Verifies a candidate password against stored scrypt hash and salt in constant time.
 * Supports either (candidate, record) or (candidate, storedHash, storedSalt).
 */
export function verifyPasswordScrypt(
  candidate: string,
  storedHashOrRecord: string | { passwordHash: string; salt: string },
  storedSalt?: string
): boolean {
  if (!candidate || !storedHashOrRecord) return false;
  try {
    let hash = '';
    let salt = '';
    if (typeof storedHashOrRecord === 'object') {
      hash = storedHashOrRecord.passwordHash;
      salt = storedHashOrRecord.salt;
    } else {
      hash = storedHashOrRecord;
      salt = storedSalt || '';
    }
    if (!hash || !salt) return false;

    const norm = normalizePassword(candidate);
    const candidateHash = crypto.scryptSync(norm, salt, 64).toString('hex');
    const hashBuf = Buffer.from(candidateHash, 'hex');
    const storedBuf = Buffer.from(hash, 'hex');
    if (hashBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, storedBuf);
  } catch {
    return false;
  }
}
