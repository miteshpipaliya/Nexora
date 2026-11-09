/**
 * src/server/adminPassword.ts
 * Dedicated, authoritative admin password security module (Package B).
 * Used by server runtime and CLI scripts (scripts/admin-password-cli.ts).
 * 
 * Features:
 * - Scrypt key derivation (N=16384, r=8, p=1, keylen=64)
 * - 16-byte cryptographically secure random salt
 * - Unicode NFKC normalization without silent trimming
 * - Constant-time comparison via crypto.timingSafeEqual
 * - Full metadata stored: algorithm, params, salt, hash, passwordVersion, sessionsRevokedBefore, updatedAt
 * - Password policy validation (>=12 chars, upper, lower, digit, symbol, not founder email, not previous password)
 */

import crypto from 'crypto';

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
  keylen: number;
}

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64
};

export interface AdminPasswordRecord {
  algorithm: 'scrypt';
  params: ScryptParams;
  salt: string;
  hash: string;
  passwordVersion: number;
  sessionsRevokedBefore: number;
  updatedAt: number;
}

const FOUNDER_EMAILS = [
  'miteshpipaliya2202@gmail.com',
  'mitesh.aiml@gmail.com'
];

/**
 * Normalizes password string using Unicode NFKC so composite characters match across keyboards/browsers.
 * Preserves leading/trailing characters without silent trimming per policy.
 */
export function normalizePassword(password: string): string {
  if (typeof password !== 'string') return '';
  return password.normalize('NFKC');
}

/**
 * Enforces strict Admin Security Password policy:
 * - At least 12 characters long
 * - Contains uppercase letter
 * - Contains lowercase letter
 * - Contains numeric digit
 * - Contains special symbol
 * - Not equal to the founder email address
 * - Not equal to the previous password
 */
export function validatePasswordPolicy(
  password: string,
  previousRecord?: AdminPasswordRecord | null,
  customFounderEmail?: string
): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required' };
  }

  const normalized = normalizePassword(password);

  if (normalized.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters long' };
  }
  if (!/[A-Z]/.test(normalized)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(normalized)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(normalized)) {
    return { valid: false, reason: 'Password must contain at least one numeric digit' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(normalized)) {
    return { valid: false, reason: 'Password must contain at least one special symbol' };
  }

  const bannedEmails = [...FOUNDER_EMAILS];
  if (customFounderEmail) bannedEmails.push(customFounderEmail.toLowerCase().trim());

  const lowerPass = normalized.toLowerCase();
  for (const email of bannedEmails) {
    if (lowerPass.includes(email.toLowerCase())) {
      return { valid: false, reason: 'Password must not contain the founder email address' };
    }
  }

  if (previousRecord && previousRecord.hash && previousRecord.salt) {
    if (verifyPassword(normalized, previousRecord)) {
      return { valid: false, reason: 'New password cannot be identical to the previous password' };
    }
  }

  return { valid: true };
}

/**
 * Derives an scrypt hash and 16-byte random salt for an admin password.
 */
export function hashPassword(
  password: string,
  options?: {
    customSalt?: string;
    version?: number;
    params?: ScryptParams;
  }
): AdminPasswordRecord {
  const norm = normalizePassword(password);
  const salt = options?.customSalt || crypto.randomBytes(16).toString('hex');
  const params = options?.params || DEFAULT_SCRYPT_PARAMS;
  const hash = crypto.scryptSync(norm, salt, params.keylen, {
    N: params.N,
    r: params.r,
    p: params.p
  }).toString('hex');

  const now = Date.now();
  return {
    algorithm: 'scrypt',
    params,
    salt,
    hash,
    passwordVersion: typeof options?.version === 'number' ? options.version : 1,
    sessionsRevokedBefore: now,
    updatedAt: now
  };
}

/**
 * Verifies a candidate password against stored record or hash/salt in constant time.
 */
export function verifyPassword(
  candidate: string,
  recordOrHash: AdminPasswordRecord | { hash: string; salt: string } | { passwordHash: string; salt: string } | string,
  customSalt?: string
): boolean {
  if (!candidate || !recordOrHash) return false;

  try {
    let hash = '';
    let salt = '';
    let params = DEFAULT_SCRYPT_PARAMS;

    if (typeof recordOrHash === 'object') {
      const rec = recordOrHash as any;
      hash = rec.hash || rec.passwordHash || '';
      salt = rec.salt || '';
      if (rec.params && typeof rec.params.N === 'number') {
        params = rec.params;
      }
    } else {
      hash = recordOrHash;
      salt = customSalt || '';
    }

    if (!hash || !salt) return false;

    const norm = normalizePassword(candidate);
    const candidateHash = crypto.scryptSync(norm, salt, params.keylen || 64, {
      N: params.N || 16384,
      r: params.r || 8,
      p: params.p || 1
    }).toString('hex');

    const candBuf = Buffer.from(candidateHash, 'hex');
    const storedBuf = Buffer.from(hash, 'hex');

    if (candBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(candBuf, storedBuf);
  } catch {
    return false;
  }
}

// Backward-compatibility aliases for existing imports
export const hashPasswordScrypt = (pwd: string, customSalt?: string) => {
  const res = hashPassword(pwd, { customSalt });
  return { passwordHash: res.hash, salt: res.salt };
};

export const verifyPasswordScrypt = (candidate: string, stored: any, customSalt?: string) => {
  return verifyPassword(candidate, stored, customSalt);
};

/**
 * Cryptographically generates a secure, high-entropy Admin Security Password
 * exceeding all policy requirements (upper, lower, digits, symbols, >= 16 chars).
 */
export function generateStrongAdminPassword(length = 20): string {
  const actualLength = Math.max(16, length);
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()_+-=[]{};:,.<>?';
  const allChars = uppers + lowers + digits + symbols;

  // Guarantee minimum representation of each required character category
  const chars: string[] = [
    uppers[crypto.randomInt(0, uppers.length)],
    uppers[crypto.randomInt(0, uppers.length)],
    lowers[crypto.randomInt(0, lowers.length)],
    lowers[crypto.randomInt(0, lowers.length)],
    digits[crypto.randomInt(0, digits.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
    symbols[crypto.randomInt(0, symbols.length)]
  ];

  while (chars.length < actualLength) {
    chars.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Cryptographic Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join('');
}
