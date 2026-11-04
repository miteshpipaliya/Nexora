export interface FirebaseAdminEnvironment {
  FIREBASE_SERVICE_ACCOUNT?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIRESTORE_DATABASE_ID?: string;
}

export interface ResolvedFirebaseAdminConfig {
  projectId: string;
  databaseId: string;
  serviceAccount?: { project_id: string; client_email: string; private_key: string; [key: string]: unknown };
  clientEmail?: string;
  privateKey?: string;
}

const PRODUCTION_PROJECT_ID = 'gen-lang-client-0089073748';
const PRODUCTION_DATABASE_ID = 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b';

function parseServiceAccount(raw: string): ResolvedFirebaseAdminConfig['serviceAccount'] {
  let account: any;
  try {
    account = JSON.parse(raw);
  } catch {
    try {
      account = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid JSON or base64-encoded service account JSON.');
    }
  }
  if (!account || typeof account !== 'object' || !account.project_id || !account.client_email || !account.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required project_id, client_email, or private_key fields.');
  }
  return {
    ...account,
    project_id: String(account.project_id),
    client_email: String(account.client_email),
    private_key: String(account.private_key).replace(/\\n/g, '\n')
  };
}

export function resolveFirebaseAdminConfig(
  environment: FirebaseAdminEnvironment,
  vercelEnvironment: string
): ResolvedFirebaseAdminConfig {
  const isPreview = vercelEnvironment === 'preview';
  const expectedProjectId = environment.FIREBASE_PROJECT_ID?.trim();
  const databaseId = environment.FIRESTORE_DATABASE_ID?.trim();
  if (isPreview && (!expectedProjectId || !databaseId)) {
    throw new Error('Preview deployments require isolated FIREBASE_PROJECT_ID and FIRESTORE_DATABASE_ID settings.');
  }

  if (environment.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    const serviceAccount = parseServiceAccount(environment.FIREBASE_SERVICE_ACCOUNT.trim());
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT could not be parsed.');
    if (expectedProjectId && serviceAccount.project_id !== expectedProjectId) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT project does not match FIREBASE_PROJECT_ID.');
    }
    return {
      projectId: serviceAccount.project_id,
      databaseId: databaseId || PRODUCTION_DATABASE_ID,
      serviceAccount
    };
  }

  if (environment.FIREBASE_CLIENT_EMAIL?.trim() && environment.FIREBASE_PRIVATE_KEY?.trim()) {
    return {
      projectId: expectedProjectId || PRODUCTION_PROJECT_ID,
      databaseId: databaseId || PRODUCTION_DATABASE_ID,
      clientEmail: environment.FIREBASE_CLIENT_EMAIL.trim(),
      privateKey: environment.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  if (isPreview) {
    throw new Error('Preview deployments require a staging FIREBASE_SERVICE_ACCOUNT or staging FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
  }
  return {
    projectId: expectedProjectId || PRODUCTION_PROJECT_ID,
    databaseId: databaseId || PRODUCTION_DATABASE_ID
  };
}
