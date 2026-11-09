import { describe, expect, it } from 'vitest';
import { resolveFirebaseAdminConfig } from '../src/server/firebaseAdminConfig';

const stagingServiceAccount = {
  project_id: 'nexora-staging',
  client_email: 'firebase-admin@nexora-staging.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\\nprivate-key-fixture\\n-----END PRIVATE KEY-----\\n'
};

describe('Firebase Admin deployment configuration', () => {
  it('requires distinct project and database identifiers for Preview', () => {
    expect(() => resolveFirebaseAdminConfig({}, 'preview'))
      .toThrow(/isolated FIREBASE_PROJECT_ID and FIRESTORE_DATABASE_ID/);
  });

  it('requires staging Admin credentials for Preview and checks the credential project', () => {
    expect(() => resolveFirebaseAdminConfig({
      FIREBASE_PROJECT_ID: 'nexora-staging',
      FIRESTORE_DATABASE_ID: '(default)'
    }, 'preview')).toThrow(/staging FIREBASE_SERVICE_ACCOUNT/);

    expect(() => resolveFirebaseAdminConfig({
      FIREBASE_PROJECT_ID: 'nexora-staging',
      FIRESTORE_DATABASE_ID: '(default)',
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ ...stagingServiceAccount, project_id: 'nexora-production' })
    }, 'preview')).toThrow(/does not match FIREBASE_PROJECT_ID/);
  });

  it('accepts matching staging credentials and normalizes escaped key newlines', () => {
    const resolved = resolveFirebaseAdminConfig({
      FIREBASE_PROJECT_ID: 'nexora-staging',
      FIRESTORE_DATABASE_ID: '(default)',
      FIREBASE_SERVICE_ACCOUNT: Buffer.from(JSON.stringify(stagingServiceAccount)).toString('base64')
    }, 'preview');

    expect(resolved.projectId).toBe('nexora-staging');
    expect(resolved.databaseId).toBe('(default)');
    expect(resolved.serviceAccount?.private_key).toContain('\n');
  });

  it('uses the existing Firebase project and named database defaults in production', () => {
    const resolved = resolveFirebaseAdminConfig({}, 'production');
    expect(resolved).toMatchObject({
      projectId: 'gen-lang-client-0089073748',
      databaseId: 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b'
    });
  });
});
