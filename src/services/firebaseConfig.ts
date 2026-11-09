export interface NexoraFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  appId: string;
  messagingSenderId?: string;
  measurementId?: string;
  firestoreDatabaseId: string;
}

export type FirebaseConfigEnvironment = Record<string, string | undefined>;

const REQUIRED_PREVIEW_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIRESTORE_DATABASE_ID'
] as const;

export function resolveFirebaseConfig(
  productionConfig: NexoraFirebaseConfig,
  environment: FirebaseConfigEnvironment,
  vercelEnvironment: string
): NexoraFirebaseConfig {
  if (vercelEnvironment === 'preview') {
    const missing = REQUIRED_PREVIEW_KEYS.filter((key) => !environment[key]?.trim());
    if (missing.length) {
      throw new Error(`Preview Firebase isolation is not configured. Missing: ${missing.join(', ')}.`);
    }
  }

  return {
    ...productionConfig,
    apiKey: environment.VITE_FIREBASE_API_KEY?.trim() || productionConfig.apiKey,
    authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN?.trim() || productionConfig.authDomain,
    projectId: environment.VITE_FIREBASE_PROJECT_ID?.trim() || productionConfig.projectId,
    storageBucket: environment.VITE_FIREBASE_STORAGE_BUCKET?.trim() || productionConfig.storageBucket,
    appId: environment.VITE_FIREBASE_APP_ID?.trim() || productionConfig.appId,
    messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || productionConfig.messagingSenderId,
    measurementId: environment.VITE_FIREBASE_MEASUREMENT_ID?.trim() || productionConfig.measurementId,
    firestoreDatabaseId: environment.VITE_FIRESTORE_DATABASE_ID?.trim() || productionConfig.firestoreDatabaseId
  };
}
