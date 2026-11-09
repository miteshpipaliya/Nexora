import { describe, expect, it } from 'vitest';
import { resolveFirebaseConfig, type NexoraFirebaseConfig } from '../src/services/firebaseConfig';

const productionConfig: NexoraFirebaseConfig = {
  apiKey: 'production-public-key',
  authDomain: 'production.firebaseapp.com',
  projectId: 'production-project',
  storageBucket: 'production.appspot.com',
  appId: 'production-app',
  messagingSenderId: 'production-sender',
  firestoreDatabaseId: 'production-db'
};

describe('Firebase environment selection', () => {
  it('fails closed instead of using production Firebase from an unconfigured Vercel Preview', () => {
    expect(() => resolveFirebaseConfig(productionConfig, {}, 'preview'))
      .toThrow(/Preview Firebase isolation is not configured/);
  });

  it('uses a complete isolated Preview Firebase configuration', () => {
    const previewConfig = resolveFirebaseConfig(productionConfig, {
      VITE_FIREBASE_API_KEY: 'staging-public-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'staging.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'staging-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'staging.appspot.com',
      VITE_FIREBASE_APP_ID: 'staging-app',
      VITE_FIRESTORE_DATABASE_ID: 'staging-db'
    }, 'preview');

    expect(previewConfig).toMatchObject({
      apiKey: 'staging-public-key',
      authDomain: 'staging.firebaseapp.com',
      projectId: 'staging-project',
      appId: 'staging-app',
      firestoreDatabaseId: 'staging-db'
    });
    expect(previewConfig.projectId).not.toBe(productionConfig.projectId);
  });

  it('preserves the committed Firebase config in production builds unless explicitly overridden', () => {
    expect(resolveFirebaseConfig(productionConfig, {}, 'production')).toEqual(productionConfig);
  });
});
