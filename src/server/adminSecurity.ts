/**
 * src/server/adminSecurity.ts
 * Dedicated admin security functions, persistence helpers, and re-exports from adminPassword.
 */

import {
  hashPassword,
  verifyPassword,
  normalizePassword,
  type AdminPasswordRecord,
  type ScryptParams
} from './adminPassword';

export * from './adminPassword';

export interface AdminSecurityRecord {
  algorithm: 'scrypt';
  params?: ScryptParams;
  salt: string;
  passwordHash: string;
  hash?: string;
  passwordVersion: number;
  sessionsRevokedBefore?: number;
  updatedAt: number;
}

/**
 * Derives password hash and salt with NFKC normalization.
 */
export function hashAdminPassword(password: string, customSalt?: string) {
  const norm = normalizePassword(password);
  const derived = hashPassword(norm, { customSalt, version: 1 });
  return {
    passwordHash: derived.hash,
    salt: derived.salt,
    algorithm: derived.algorithm,
    params: derived.params,
    passwordVersion: derived.passwordVersion,
    updatedAt: derived.updatedAt
  };
}

/**
 * Constant-time verification of password against stored hash.
 */
export function verifyAdminPasswordHash(candidate: string, passwordHash: string, salt: string): boolean {
  return verifyPassword(candidate, { hash: passwordHash, salt });
}

/**
 * Authoritatively writes the admin security record to Cloud Firestore with read-back verification.
 */
export async function writeAdminSecurityRecord(
  db: any,
  password: string,
  options?: { previousVersion?: number }
): Promise<AdminSecurityRecord> {
  const norm = normalizePassword(password);
  const nextVersion = (options?.previousVersion || 0) + 1;
  const derived = hashPassword(norm, { version: nextVersion });
  const record: AdminSecurityRecord = {
    algorithm: 'scrypt',
    params: derived.params,
    salt: derived.salt,
    passwordHash: derived.hash,
    hash: derived.hash,
    passwordVersion: nextVersion,
    sessionsRevokedBefore: derived.sessionsRevokedBefore,
    updatedAt: derived.updatedAt
  };

  await db.collection('_admin_security').doc('founder').set(record);
  try {
    if (typeof db.collection === 'function') {
      const statusDoc = db.collection('systemConfig')?.doc('status');
      if (statusDoc?.set) {
        await statusDoc.set(
          { initialized: true, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    }
  } catch {}

  // Read-back verification
  const readBack = await db.collection('_admin_security').doc('founder').get();
  if (!readBack?.exists || !readBack?.data || !readBack.data() || readBack.data().passwordHash !== record.passwordHash) {
    throw new Error('Durable persistence verification failed: Document was not read back correctly from storage.');
  }

  return record;
}

/**
 * Reads admin security record from Cloud Firestore.
 */
export async function readAdminSecurityRecord(db: any): Promise<AdminSecurityRecord | null> {
  const snap = await db.collection('_admin_security').doc('founder').get();
  if (!snap || !snap.exists) return null;
  const data = typeof snap.data === 'function' ? snap.data() : snap.data;
  if (!data) return null;
  return {
    ...data,
    passwordHash: data.passwordHash || data.hash,
    hash: data.hash || data.passwordHash,
    passwordVersion: typeof data.passwordVersion === 'number' ? data.passwordVersion : 1
  } as AdminSecurityRecord;
}

/**
 * Resolves an authoritative Firestore instance using firebaseAdminConfig.
 */
export async function getAdminFirestoreInstance(): Promise<any> {
  const { resolveFirebaseAdminConfig } = await import('./firebaseAdminConfig');
  const config = resolveFirebaseAdminConfig(process.env, process.env.VERCEL_ENV || 'development');
  const adminApp = await import('firebase-admin/app');
  const adminFs = await import('firebase-admin/firestore');
  const apps = adminApp.getApps();
  let appInstance = apps.find((candidate: any) => candidate.options?.projectId === config.projectId);
  if (!appInstance) {
    const credential = config.serviceAccount
      ? adminApp.cert({
          projectId: config.serviceAccount.project_id,
          clientEmail: config.serviceAccount.client_email,
          privateKey: config.serviceAccount.private_key
        })
      : config.clientEmail && config.privateKey
        ? adminApp.cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey: config.privateKey
          })
        : undefined;
    appInstance = adminApp.initializeApp(
      { projectId: config.projectId, ...(credential ? { credential } : {}) },
      `nexora-admin-${Date.now()}`
    );
  }
  return adminFs.getFirestore(appInstance, config.databaseId);
}
