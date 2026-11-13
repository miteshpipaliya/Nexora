import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  normalizePassword,
  hashPasswordScrypt,
  verifyPasswordScrypt,
  type AdminPasswordRecord
} from '../src/server/adminPassword';

describe('Admin Security Password Module (Package B)', () => {
  it('hashes and verifies the exact password with scrypt and salt', () => {
    const rawPassword = 'CorrectHorseBatteryStaple2026!';
    const { passwordHash, salt } = hashPasswordScrypt(rawPassword);

    expect(passwordHash).toBeDefined();
    expect(salt).toBeDefined();
    expect(salt.length).toBe(32); // 16 bytes hex

    const isMatch = verifyPasswordScrypt(rawPassword, passwordHash, salt);
    expect(isMatch).toBe(true);

    const isWrong = verifyPasswordScrypt('WrongPassword123!', passwordHash, salt);
    expect(isWrong).toBe(false);
  });

  it('normalizes Unicode NFKC identically across setup and verify', () => {
    // String with non-normalized character
    const raw1 = 'Admin\u0041\u030ASecret2026!'; // A + ring above
    const raw2 = 'Admin\u00C5Secret2026!';         // precomposed Å

    const { passwordHash, salt } = hashPasswordScrypt(raw1);
    expect(verifyPasswordScrypt(raw2, passwordHash, salt)).toBe(true);
  });

  it('simulates cross-instance persistence: instance A saves hash, instance B verifies', () => {
    // Instance A sets password in shared store
    const sharedFirestoreStore: Record<string, any> = {};

    const pass = 'SuperSecretFounderPassword#2026';
    const recA = hashPassword(pass, { version: 1 });
    sharedFirestoreStore['founder'] = recA;

    // Instance B (cold start restart) reads only from shared store with no in-memory cache
    const docB = sharedFirestoreStore['founder'] as AdminPasswordRecord;
    expect(docB).toBeDefined();
    expect(docB.passwordVersion).toBe(1);

    const verifiedOnInstanceB = verifyPassword(pass, docB);
    expect(verifiedOnInstanceB).toBe(true);

    const wrongOnInstanceB = verifyPassword('WrongPass!', docB);
    expect(wrongOnInstanceB).toBe(false);
  });

  it('enforces password policy and rejects weak or prohibited passwords', () => {
    // Under 12 chars
    expect(validatePasswordPolicy('Short1!').valid).toBe(false);
    // Missing uppercase
    expect(validatePasswordPolicy('lowercaseonly12345!').valid).toBe(false);
    // Missing lowercase
    expect(validatePasswordPolicy('UPPERCASEONLY12345!').valid).toBe(false);
    // Missing digit
    expect(validatePasswordPolicy('NoDigitsIncludedHere!').valid).toBe(false);
    // Missing symbol
    expect(validatePasswordPolicy('NoSymbolsIncludedHere123').valid).toBe(false);
    // Contains founder email
    expect(validatePasswordPolicy('admin-owner@example.test!2026', null, 'admin-owner@example.test').valid).toBe(false);

    // Strong compliant password
    expect(validatePasswordPolicy('Nexora@SuperStrong2026!Key').valid).toBe(true);
  });

  it('rejects new password if identical to the previous password record', () => {
    const oldPass = 'ExistingStrongPassword2026!#';
    const oldRec = hashPassword(oldPass, { version: 1 });

    const duplicateCheck = validatePasswordPolicy(oldPass, oldRec);
    expect(duplicateCheck.valid).toBe(false);
    expect(duplicateCheck.reason).toContain('previous password');

    const freshPass = 'BrandNewDifferentPassword2026!#';
    const newCheck = validatePasswordPolicy(freshPass, oldRec);
    expect(newCheck.valid).toBe(true);
  });

  it('invalidates old sessions when sessionsRevokedBefore is updated', () => {
    const now = Date.now();
    const oldSessionIat = now - 60000; // Issued 1 minute ago

    // Password reset happens at current time
    const updatedRecord = hashPassword('NewFounderPassword2026!#', { version: 2 });
    const revokedBefore = updatedRecord.sessionsRevokedBefore;

    // A session issued prior to revokedBefore must fail validation
    const isSessionValid = oldSessionIat >= revokedBefore;
    expect(isSessionValid).toBe(false);

    // A fresh session issued after revocation is accepted
    const newSessionIat = now + 1000;
    const isNewSessionValid = newSessionIat >= revokedBefore;
    expect(isNewSessionValid).toBe(true);
  });

  it('increments passwordVersion and records scrypt parameters', () => {
    const initial = hashPassword('FirstPassword2026!#', { version: 1 });
    expect(initial.passwordVersion).toBe(1);
    expect(initial.algorithm).toBe('scrypt');
    expect(initial.params.N).toBe(16384);
    expect(initial.params.keylen).toBe(64);

    const updated = hashPassword('SecondPassword2026!#', { version: initial.passwordVersion + 1 });
    expect(updated.passwordVersion).toBe(2);
    expect(verifyPassword('SecondPassword2026!#', updated)).toBe(true);
    expect(verifyPassword('FirstPassword2026!#', updated)).toBe(false);
  });
});
