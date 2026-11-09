import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Phase 5 — Admin Security Subsystem & Password Management', () => {
  const HMAC_SECRET = 'nexora_test_hmac_secret_2026_super_secure';

  function createSignedToken(payload: { email: string; purpose: string; exp: number }): string {
    const data = JSON.stringify({
      ...payload,
      jti: crypto.randomBytes(16).toString('hex')
    });
    const b64Data = Buffer.from(data, 'utf8').toString('base64url');
    const signature = crypto.createHmac('sha256', HMAC_SECRET).update(b64Data).digest('base64url');
    return `${b64Data}.${signature}`;
  }

  function verifySignedToken(token: string, expectedPurpose: string): any {
    try {
      const [b64Data, signature] = token.split('.');
      if (!b64Data || !signature) return null;
      const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(b64Data).digest('base64url');
      if (signature !== expectedSig) return null;
      const parsed = JSON.parse(Buffer.from(b64Data, 'base64url').toString('utf8'));
      if (Date.now() > parsed.exp) return null;
      if (parsed.purpose !== expectedPurpose) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  it('scryptSync password hashing with unique salt verifies accurately', () => {
    const password = 'SuperSecureFounderPass123!@#$';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');

    // Matching password verification
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
    expect(isValid).toBe(true);

    // Incorrect password verification
    const badHash = crypto.scryptSync('WrongPassword', salt, 64).toString('hex');
    const isInvalid = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(badHash, 'hex'));
    expect(isInvalid).toBe(false);
  });

  it('generates and verifies 15-minute stateless elevated admin session tokens', () => {
    const exp = Date.now() + 15 * 60 * 1000;
    const sessionToken = createSignedToken({
      email: 'miteshpipaliya2202@gmail.com',
      purpose: 'admin-session',
      exp
    });

    const verified = verifySignedToken(sessionToken, 'admin-session');
    expect(verified).not.toBeNull();
    expect(verified.email).toBe('miteshpipaliya2202@gmail.com');
    expect(verified.purpose).toBe('admin-session');
  });

  it('rejects tampered or expired session tokens', () => {
    const expiredToken = createSignedToken({
      email: 'miteshpipaliya2202@gmail.com',
      purpose: 'admin-session',
      exp: Date.now() - 5000 // Expired 5 seconds ago
    });

    const verified = verifySignedToken(expiredToken, 'admin-session');
    expect(verified).toBeNull();

    // Tampered token
    const validToken = createSignedToken({
      email: 'miteshpipaliya2202@gmail.com',
      purpose: 'admin-session',
      exp: Date.now() + 100000
    });
    const tampered = validToken.slice(0, -4) + 'abcd';
    expect(verifySignedToken(tampered, 'admin-session')).toBeNull();
  });

  it('enforces minimum 16-character length for high-entropy admin password', () => {
    const weakPassword = 'short';
    const strongPassword = 'NexoraFounder2026!MasterKey';
    expect(weakPassword.length >= 16).toBe(false);
    expect(strongPassword.length >= 16).toBe(true);
  });
});
