import { describe, it, expect, beforeEach } from 'vitest';
import { hashPasswordScrypt, verifyPasswordScrypt } from '../src/server/adminSecurity';

describe('Admin Security Password Module (WP6)', () => {
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
    const { passwordHash, salt } = hashPasswordScrypt(pass);
    sharedFirestoreStore['founder'] = {
      passwordHash,
      salt,
      updatedAt: Date.now(),
      passwordVersion: 1
    };

    // Instance B (cold start restart) reads only from shared store with no in-memory cache
    const docB = sharedFirestoreStore['founder'];
    expect(docB).toBeDefined();

    const verifiedOnInstanceB = verifyPasswordScrypt(pass, docB.passwordHash, docB.salt);
    expect(verifiedOnInstanceB).toBe(true);

    const wrongOnInstanceB = verifyPasswordScrypt('WrongPass!', docB.passwordHash, docB.salt);
    expect(wrongOnInstanceB).toBe(false);
  });
});
