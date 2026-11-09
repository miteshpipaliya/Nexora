import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import productionFirebaseConfig from '../../firebase-applet-config.json';
import { resolveFirebaseConfig } from './firebaseConfig';

const firebaseConfig = resolveFirebaseConfig(
  productionFirebaseConfig,
  import.meta.env,
  import.meta.env.VERCEL_ENV || ''
);

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId to getFirestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Firebase Storage instance for permanent media uploads
export const storage = getStorage(app, firebaseConfig.storageBucket || undefined);

// Auth instance
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Verification check
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is offline, verifying connectivity.');
    }
  }
}

/**
 * Increments a Firestore document counter within a transaction.
 * Useful for rate limiting and tracking usage.
 * @param db - Firebase Firestore instance
 * @param docPath - Document path in format 'collection/docId'
 * @param field - Counter field name (defaults to 'count')
 * @param windowSeconds - Time window in seconds (defaults to 24 hours)
 * @returns {allowed, count, resetAt} - Rate limit status
 */
export async function incrementFirestoreCounter(db: any, docPath: string, field?: string, windowSeconds?: number): Promise<{ allowed: boolean; count: number; resetAt: number | null }> {
  try {
    const ref = doc(db, docPath);
    const now = Date.now();

    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      let current = 0;
      let windowStart = 0;

      if (snap.exists()) {
        const data = snap.data()!;
        current = data.count || 0;
        windowStart = data.windowStart || 0;
      }

      // Window has expired, reset
      if (now - windowStart >= (windowSeconds || (60 * 60 * 24)) * 1000) {
        current = 1;
        windowStart = now;
      } else {
        current++;
      }

      transaction.update(ref, { count: current, windowStart });
      return { allowed: current <= 100, count: current, resetAt: windowStart + (windowSeconds || (60 * 60 * 24)) * 1000 };
    });

    return result;
  } catch (error) {
    console.error('Firestore counter error:', error);
    return { allowed: false, count: 0, resetAt: null };
  }
}

/**
 * Checks a Firestore-based rate limit.
 * Uses a time-window approach for rate limiting.
 * @param db - Firebase Firestore instance
 * @param docPath - Document path in format 'collection/docId'
 * @param windowSeconds - Time window in seconds (defaults to 24 hours)
 * @returns {allowed, retryAfter} - Rate limit status with retry suggestion
 */
export async function checkFirestoreRateLimit(db: any, docPath: string, windowSeconds?: number): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const ref = doc(db, docPath);
    const now = Date.now();

    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      let current = 0;
      let windowStart = 0;

      if (snap.exists()) {
        const data = snap.data()!;
        current = data.count || 0;
        windowStart = data.windowStart || 0;
      }

      // Window has expired, reset
      if (now - windowStart >= (windowSeconds || (60 * 60 * 24)) * 1000) {
        current = 1;
        windowStart = now;
      } else {
        current++;
      }

      transaction.update(ref, { count: current, windowStart });
      const retryAfter = windowStart + (windowSeconds || (60 * 60 * 24)) * 1000 - now;
      return { allowed: true, count: current, retryAfter: retryAfter > 0 ? Math.ceil(retryAfter / 1000) : 0 };
    });

    return result;
  } catch (error) {
    console.error('Firestore rate limit check error:', error);
    return { allowed: false, retryAfter: 60 };
  }
}

/**
 * Verifies Firebase Firestore connectivity.
 */
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is offline, verifying connectivity.');
    }
  }
}

// Error handling matching Firestore ABAC specifications
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber
};
export type { ConfirmationResult };
