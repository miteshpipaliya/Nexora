import { describe, it, expect } from 'vitest';
import {
  hashAdminPassword,
  verifyAdminPasswordHash,
  writeAdminSecurityRecord,
  readAdminSecurityRecord,
  AdminSecurityRecord
} from '../src/server/adminSecurity';

// In-memory mock Firestore simulating cross-instance durable database
class MockFirestore {
  private collections: Map<string, Map<string, any>> = new Map();
  public simulateNetworkFailure = false;

  collection(colName: string) {
    if (this.simulateNetworkFailure) {
      throw new Error('503 Service Unavailable: Simulated Firestore network outage');
    }
    if (!this.collections.has(colName)) {
      this.collections.set(colName, new Map());
    }
    const col = this.collections.get(colName)!;

    return {
      doc: (docId: string) => ({
        get: async () => {
          if (this.simulateNetworkFailure) {
            throw new Error('503 Service Unavailable: Simulated Firestore read failure');
          }
          const exists = col.has(docId);
          return {
            exists,
            data: () => (exists ? JSON.parse(JSON.stringify(col.get(docId))) : undefined)
          };
        },
        set: async (data: any, options?: { merge?: boolean }) => {
          if (this.simulateNetworkFailure) {
            throw new Error('503 Service Unavailable: Simulated Firestore write failure');
          }
          if (options?.merge && col.has(docId)) {
            col.set(docId, { ...col.get(docId), ...JSON.parse(JSON.stringify(data)) });
          } else {
            col.set(docId, JSON.parse(JSON.stringify(data)));
          }
        },
        delete: async () => {
          if (this.simulateNetworkFailure) {
            throw new Error('503 Service Unavailable: Simulated Firestore delete failure');
          }
          col.delete(docId);
        }
      })
    };
  }
}

describe('WP6 — Admin Password Cold-Start Persistence & Two-Instance Isolation', () => {
  it('Instance A writes password, Instance B (fresh container memory) reads and verifies identical password', async () => {
    const sharedFirestore = new MockFirestore();

    // Instance A sets password
    const passwordA = 'NexoraFounder2026!AlphaSecretKey';
    const writtenRecord = await writeAdminSecurityRecord(sharedFirestore, passwordA);
    expect(writtenRecord).toBeDefined();
    expect(writtenRecord.passwordHash).toBeDefined();
    expect(writtenRecord.passwordVersion).toBe(1);

    // Instance B spins up with zero in-memory state, connecting to shared Firestore
    const recordFromB = await readAdminSecurityRecord(sharedFirestore);
    expect(recordFromB).not.toBeNull();
    expect(recordFromB!.passwordHash).toBe(writtenRecord.passwordHash);
    expect(recordFromB!.salt).toBe(writtenRecord.salt);

    // Instance B verifies the typed password
    const verified = verifyAdminPasswordHash(passwordA, recordFromB!.passwordHash, recordFromB!.salt);
    expect(verified).toBe(true);

    // Instance B rejects wrong password with false (translates to 401)
    const wrongVerified = verifyAdminPasswordHash('WrongPasswordAttempt123', recordFromB!.passwordHash, recordFromB!.salt);
    expect(wrongVerified).toBe(false);
  });

  it('Unicode NFKC normalization guarantees identical hashes regardless of character composition', () => {
    // e.g. composed vs decomposed unicode characters
    const pass1 = 'Nexora\u00e92026!MasterKey'; // é as single codepoint
    const pass2 = 'Nexorae\u03012026!MasterKey'; // e + combining acute accent

    const { passwordHash, salt } = hashAdminPassword(pass1);
    // Verifying with pass2 must pass because of NFKC normalization
    const matches = verifyAdminPasswordHash(pass2, passwordHash, salt);
    expect(matches).toBe(true);
  });

  it('Durable read-back verification detects and rejects simulated write failures', async () => {
    const brokenDb = {
      collection: () => ({
        doc: () => ({
          set: async () => {}, // silently "succeeds"
          get: async () => ({ exists: false, data: () => undefined }) // but document does not exist!
        })
      })
    };

    await expect(writeAdminSecurityRecord(brokenDb, 'TestPassword123456789!')).rejects.toThrow(
      'Durable persistence verification failed'
    );
  });

  it('Simulated Firestore outage raises storage error (503) instead of reporting incorrect password', async () => {
    const offlineDb = new MockFirestore();
    offlineDb.simulateNetworkFailure = true;

    await expect(readAdminSecurityRecord(offlineDb)).rejects.toThrow('503 Service Unavailable');
  });
});
