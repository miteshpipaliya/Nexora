import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { registerCmsEndpoints } from './src/server/cmsEndpoints';
import { 
  hashPasswordScrypt, 
  verifyPasswordScrypt, 
  normalizePassword, 
  generateStrongAdminPassword, 
  validatePasswordPolicy, 
  hashPassword, 
  verifyPassword 
} from './src/server/adminPassword';
import { getBrevoConfig, sendBrevoOtpEmail, sendBrevoContactNotification, BrevoServiceError, type BrevoConfig } from './src/server/brevoMailer';
import { AdminOtpChallengeStore, AdminOtpRateLimitError, AdminOtpStorageError, type OtpConsumeResult } from './src/server/adminOtpChallengeStore';
import { resolveFirebaseAdminConfig } from './src/server/firebaseAdminConfig';
import { StudentOtpStore, StudentOtpRateLimitError, StudentOtpStorageError } from './src/server/studentOtpStore';
import { createRegistrationOnce, RegistrationStoreError } from './src/server/registrationStore';
import { validateIndianMobile, normalizeIndianMobile } from './src/shared/lib/phoneUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In non-production, load .env without overriding
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Process-level crash prevention and structured logging (B-01)
process.on('unhandledRejection', (reason: any) => {
  console.error('[PROCESS UNHANDLED REJECTION]', reason?.stack || reason?.message || reason);
});

process.on('uncaughtException', (error: any) => {
  console.error('[PROCESS UNCAUGHT EXCEPTION]', error?.stack || error?.message || error);
});

// Path recovery middleware for Vercel Serverless Function rewrites (header rewrites deleted per C-08)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index')) {
    req.url = req.url.replace(/^\/api\/index(\.ts|\.js)?/, '') || '/';
  }
  next();
});

export const apiRouter = express.Router();

// Dev server must run on port 3000 according to environment constraints
function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  // In development, AI Studio dev server supervisor requires port 3000
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();

// Approved administrator accounts & founder identity
export const FOUNDER_EMAIL = 'miteshpipaliya2202@gmail.com';
export const FOUNDER_PHONE = '+91 8200243606';
export const ADMIN_EMAILS = [
  FOUNDER_EMAIL,
  'mitesh.aiml@gmail.com',
  'editwithvision@gmail.com'
];
export const ADMIN_PHONE = FOUNDER_PHONE;

const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.NOW_REGION ||
  process.env.VERCEL_ENV ||
  process.env.LAMBDA_TASK_ROOT
);

// Persistent storage directory for backend-protected challenges and secrets (use /tmp on serverless)
const STORAGE_DIR = isServerless
  ? path.join('/tmp', '.server_data')
  : path.resolve(__dirname, '.server_data');

try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
} catch {
  // Silent fallback for restricted environments
}

// Persistent Backend HMAC Secret for Keyed Hashing (resilient on serverless)
function getOrCreateHmacSecret(): string {
  const configuredSecret = process.env.OTP_HMAC_SECRET?.trim();
  if (configuredSecret && configuredSecret.length >= 32) {
    return configuredSecret;
  }
  if (isServerless) {
    throw new ConfigError('OTP_HMAC_SECRET must be configured with at least 32 characters in serverless environments.');
  }
  const keyFile = path.join(STORAGE_DIR, 'hmac.key');
  try {
    if (fs.existsSync(keyFile)) {
      const stored = fs.readFileSync(keyFile, 'utf8').trim();
      if (stored.length >= 32) return stored;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    return crypto.randomBytes(32).toString('hex');
  }
}

let cachedHmacSecret: string | undefined;
function getHmacSecret(): string {
  if (!cachedHmacSecret) cachedHmacSecret = getOrCreateHmacSecret();
  return cachedHmacSecret;
}

export { type BrevoConfig, getBrevoConfig, sendBrevoOtpEmail, BrevoServiceError };

export function getBrevoApiKey(): string {
  return getBrevoConfig().apiKey;
}

// Helper to compute keyed HMAC-SHA256 of OTP (never store raw OTP)
function hashOtp(email: string, otp: string, purpose: string): string {
  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(`${email.toLowerCase().trim()}:${otp.trim()}:${purpose}`)
    .digest('hex');
}

// Cryptographic token signing for verified operations
function createSignedToken(payload: { email: string; purpose: string; exp: number }): string {
  const data = JSON.stringify({
    ...payload,
    jti: crypto.randomBytes(16).toString('hex')
  });
  const b64Data = Buffer.from(data, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', getHmacSecret()).update(b64Data).digest('base64url');
  return `${b64Data}.${signature}`;
}

function verifySignedToken(token: string, expectedPurpose: string, expectedEmail?: string): { email: string; purpose: string; exp: number; jti?: string; iat?: number } | null {
  try {
    const [b64Data, signature] = token.split('.');
    if (!b64Data || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', getHmacSecret()).update(b64Data).digest('base64url');
    const bufA = Buffer.from(signature);
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) return null;

    const parsed = JSON.parse(Buffer.from(b64Data, 'base64url').toString('utf8'));
    if (Date.now() > parsed.exp) return null;
    if (parsed.purpose !== expectedPurpose) return null;
    if (expectedEmail && parsed.email !== expectedEmail.toLowerCase().trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Masking helpers for client privacy
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '••••••';
  const first = local[0] || '';
  const last = local.slice(-2);
  return `${first}${'•'.repeat(Math.max(local.length - 3, 4))}${last}@${domain}`;
}

function maskPhone(phone: string): string {
  const cleaned = phone.trim();
  const last3 = cleaned.slice(-3);
  return `+91 ••••• ••${last3}`;
}

// ========================================================
// PERSISTENT DURABLE STORAGE FOR OTP CHALLENGES (FIRESTORE + CACHE)
// ========================================================
let adminFirestoreDb: any = null;
let adminAuthInstance: any = null;
let adminSdkAttempted = false;

async function getAdminFirestore(): Promise<any> {
  if (adminFirestoreDb) return adminFirestoreDb;
  if (adminSdkAttempted) return null;
  adminSdkAttempted = true;
  try {
    const config = resolveFirebaseAdminConfig(process.env, process.env.VERCEL_ENV || 'development');
    const adminApp = await import('firebase-admin/app');
    const adminFs = await import('firebase-admin/firestore');
    const adminAuthMod = await import('firebase-admin/auth');
    const apps = adminApp.getApps();
    const existingApp = apps.find((candidate: any) => candidate.options?.projectId === config.projectId);
    if (process.env.VERCEL_ENV === 'preview' && apps.length && !existingApp) {
      throw new ConfigError('Existing Firebase Admin app does not match the configured Preview project.');
    }
    let appInstance = existingApp;
    if (!appInstance) {
      const credential = config.serviceAccount
        ? adminApp.cert({ projectId: config.serviceAccount.project_id, clientEmail: config.serviceAccount.client_email, privateKey: config.serviceAccount.private_key })
        : config.clientEmail && config.privateKey
          ? adminApp.cert({ projectId: config.projectId, clientEmail: config.clientEmail, privateKey: config.privateKey })
          : undefined;

      // In development when credentials are not configured, do not create an unauthenticated app that triggers 7 PERMISSION_DENIED
      if (!credential && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !isServerless && process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_ENV !== 'preview') {
        console.warn('[FIREBASE ADMIN] No service account credentials detected in development environment. Using local in-memory storage fallback.');
        return null;
      }

      appInstance = adminApp.initializeApp({ projectId: config.projectId, ...(credential ? { credential } : {}) }, `nexora-${process.env.VERCEL_ENV || 'local'}`);
    }
    adminAuthInstance = adminAuthMod.getAuth(appInstance);
    adminFirestoreDb = adminFs.getFirestore(appInstance, config.databaseId);
    return adminFirestoreDb;
  } catch (error: any) {
    if (process.env.VERCEL_ENV === 'preview' || isServerless) {
      console.error('[FIREBASE ADMIN] Secure initialization failed:', error?.message || error);
      throw error instanceof ConfigError ? error : new ConfigError('Firebase Admin is not configured for this environment.');
    }
    console.warn('[FIREBASE ADMIN] Local persistent storage unavailable:', error?.message || error);
    return null;
  }
}

async function getAdminAuth(): Promise<any> {
  if (adminAuthInstance) return adminAuthInstance;
  await getAdminFirestore();
  return adminAuthInstance;
}

const adminOtpChallengesStore = new AdminOtpChallengeStore(getAdminFirestore, isServerless);
const adminLoginChallengeId = (passwordToken: string) => crypto.createHash('sha256').update(passwordToken).digest('hex');
function respondToOtpFailure(result: OtpConsumeResult, res: express.Response, label: string) {
  if (result.status === 'invalid') {
    res.status(401).json({ error: `Incorrect ${label.toLowerCase()} code. (${result.remainingAttempts} attempts remaining)`, remainingAttempts: result.remainingAttempts });
  } else if (result.status === 'locked') {
    res.status(429).json({ error: `Too many incorrect ${label.toLowerCase()} codes. Request a new code.` });
  } else {
    res.status(400).json({ error: `${label} code is expired, already used, or was not requested.` });
  }
}

const challengeStore = new StudentOtpStore(getAdminFirestore, isServerless, getHmacSecret);

// Admin Dual-Factor Challenge Records
interface AdminDualChallenge {
  challengeId: string;
  adminEmail: string;
  adminPhone: string;
  emailOtpHash: string;
  smsOtpHash: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

interface AdminSession {
  sessionId: string;
  adminEmail: string;
  expiresAt: number;
  createdAt: number;
}

const activeAdminChallenges = new Map<string, AdminDualChallenge>();
const activeAdminSessions = new Map<string, AdminSession>();

// ==========================================
// SYSTEM HEALTH & READINESS ENDPOINT (C-08)
// Returns only status: 'ok' without disclosing internal configuration or PII
// ==========================================
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public health checks must not depend on OTP secrets. Sensitive auth/admin
// endpoints still fail closed until a strong server-side secret is configured.
apiRouter.use(['/auth', '/admin'], (req, res, next) => {
  try {
    getHmacSecret();
    next();
  } catch {
    res.status(503).json({ error: 'Authentication security configuration is unavailable.' });
  }
});

// ==========================================
// STUDENT EMAIL OTP VERIFICATION ENDPOINTS
// ==========================================

// 1. Dispatch 6-digit Email OTP via Brevo
apiRouter.post(['/auth/send-email-otp', '/auth/forgot-password/request-otp', '/auth/forgot-password'], async (req, res) => {
  try {
    const isForgotRoute = req.path.includes('forgot-password');
    const { email, purpose = (isForgotRoute ? 'reset-password' : 'signup') } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    if (purpose !== 'signup' && purpose !== 'reset-password') {
      res.status(400).json({ error: 'Invalid verification purpose.' });
      return;
    }

    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    if (!(await challengeStore.checkIpRateLimit(clientIp))) {
      res.status(429).json({ error: 'Too many requests from this network. Please try again later.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    // Cryptographically secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 180 * 1000; // 3-minute expiration
    const hash = hashOtp(normalizedEmail, otp, purpose);
    await challengeStore.setChallenge(normalizedEmail, purpose, hash, expiresAt);

    // Persist before dispatch so a delivered OTP can always be verified.
    try {
      await sendBrevoOtpEmail(normalizedEmail, otp, purpose);
    } catch (error) {
      await challengeStore.deleteChallenge(normalizedEmail, purpose);
      throw error;
    }

    res.json({
      success: true,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInSeconds: 180,
      resendCooldown: 30
    });
  } catch (err: any) {
    console.error('Error in /auth/send-email-otp:', err.message || err);
    const status = err instanceof StudentOtpRateLimitError ? 429 : err instanceof StudentOtpStorageError ? 503 : err.status || (err.code === 'EMAIL_NOT_CONFIGURED' ? 503 : 500);
    res.status(status).json({ 
      error: err instanceof StudentOtpRateLimitError ? err.message : err instanceof StudentOtpStorageError ? 'Verification service is temporarily unavailable.' : err.message || 'Failed to dispatch verification code via email.',
      ...(err instanceof StudentOtpRateLimitError ? { waitSeconds: err.waitSeconds } : {}),
      code: err.code || (err instanceof StudentOtpStorageError ? 'OTP_STORAGE_UNAVAILABLE' : 'EMAIL_DISPATCH_FAILED'),
      actionableHint: err.actionableHint
    });
  }
});

// 2. Validate 6-digit Email OTP
apiRouter.post(['/auth/verify-email-otp', '/auth/forgot-password/verify-otp'], async (req, res) => {
  try {
    const isForgotRoute = req.path.includes('forgot-password');
    const { email, otp, purpose = (isForgotRoute ? 'reset-password' : 'signup') } = req.body;
    if (typeof email !== 'string' || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: 'Both email and 6-digit verification code are required.' });
      return;
    }

    if (purpose !== 'signup' && purpose !== 'reset-password') {
      res.status(400).json({ error: 'Invalid verification purpose.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const inputHash = hashOtp(normalizedEmail, otp.toString().trim(), purpose);
    const verification = await challengeStore.verifyChallenge(normalizedEmail, purpose, inputHash);
    if (verification.status !== 'valid') {
      if (verification.status === 'invalid') {
      res.status(401).json({
          error: `Incorrect verification code. (${verification.remainingAttempts} attempts remaining)`,
          remainingAttempts: verification.remainingAttempts
      });
      } else if (verification.status === 'locked') {
        res.status(429).json({ error: 'Too many incorrect attempts. Request a new verification code.' });
      } else if (verification.status === 'expired') {
        res.status(400).json({ error: 'Verification code has expired. Please request a fresh code.' });
      } else {
        res.status(400).json({ error: 'Verification code not requested or already used. Please request a new code.' });
      }
      return;
    }

    // Issue short-lived cryptographic authorization token (15-minute validity)
    const tokenExpiresAt = Date.now() + 15 * 60 * 1000;
    const verificationToken = createSignedToken({
      email: normalizedEmail,
      purpose,
      exp: tokenExpiresAt
    });

    await challengeStore.setAuthorization(normalizedEmail, purpose, verificationToken, tokenExpiresAt);

    res.json({
      success: true,
      verificationToken,
      expiresAt: tokenExpiresAt
    });
  } catch (err: any) {
    console.error('Error in /auth/verify-email-otp:', err.message || err);
    res.status(err instanceof StudentOtpStorageError ? 503 : 500).json({ error: err instanceof StudentOtpStorageError ? 'Verification service is temporarily unavailable.' : 'Internal server error during verification.' });
  }
});

// 3. Confirm Verified Signup (Server-Side Verification Enforcement)
apiRouter.post('/auth/confirm-verified-signup', async (req, res) => {
  try {
    const { email, verificationToken, idToken } = req.body;
    if (!email || !verificationToken || !idToken) {
      res.status(400).json({ error: 'Email, verification token, and Firebase sign-in token are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const verified = verifySignedToken(verificationToken, 'signup', normalizedEmail);

    if (!verified) {
      res.status(403).json({ error: 'Invalid or expired signup verification token.' });
      return;
    }

    const adminAuth = await getAdminAuth();
    if (!adminAuth) {
      res.status(503).json({ error: 'Firebase identity verification is unavailable.' });
      return;
    }

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Firebase sign-in token is invalid or expired.' });
      return;
    }

    if (String(decoded.email || '').toLowerCase().trim() !== normalizedEmail || !decoded.uid) {
      res.status(403).json({ error: 'The verified email and signed-in account do not match.' });
      return;
    }

    const consumed = await challengeStore.consumeAuthorization(normalizedEmail, 'signup', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Verification token has already been used or expired.' });
      return;
    }

    try {
      const userRecord = await adminAuth.getUser(decoded.uid);
      if (String(userRecord.email || '').toLowerCase().trim() !== normalizedEmail) {
        res.status(403).json({ error: 'The verified email and Firebase account do not match.' });
        return;
      }
      await adminAuth.updateUser(decoded.uid, { emailVerified: true });
    } catch {
      res.status(503).json({ error: 'Firebase could not persist the email verification. Request a new code and try again.' });
      return;
    }

    res.json({
      success: true,
      verifiedEmail: normalizedEmail,
      emailVerifiedInAuth: true
    });
  } catch (err: any) {
    console.error('Error confirming verified signup:', err.message || err);
    res.status(500).json({ error: 'Internal server error during signup confirmation.' });
  }
});

// 4. Update Password with Verified Reset Token
apiRouter.post(['/auth/reset-password', '/auth/forgot-password/reset-password'], async (req, res) => {
  try {
    const { email, verificationToken, newPassword } = req.body;
    if (!email || !verificationToken || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'Email, verification token, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const verified = verifySignedToken(verificationToken, 'reset-password', normalizedEmail);

    if (!verified) {
      res.status(403).json({ error: 'Password reset authorization has expired or is invalid. Please restart recovery.' });
      return;
    }

    const adminAuth = await getAdminAuth();
    if (!adminAuth) {
      res.status(503).json({ error: 'Firebase password update is unavailable.' });
      return;
    }

    // Consume the authorization only after Firebase Admin is available.
    const consumed = await challengeStore.consumeAuthorization(normalizedEmail, 'reset-password', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Password reset token has already been consumed. Please request a new code.' });
      return;
    }

    try {
      const userRecord = await adminAuth.getUserByEmail(normalizedEmail);
      await adminAuth.updateUser(userRecord.uid, {
        password: newPassword,
        emailVerified: true
      });
      await adminAuth.revokeRefreshTokens(userRecord.uid);
    } catch {
      res.status(503).json({ error: 'Firebase could not persist the password update. Request a new code and try again.' });
      return;
    }

    res.json({
      success: true,
      message: 'Your password has been updated successfully. Please sign in again.',
      updatedViaAdmin: true
    });
  } catch (err: any) {
    console.error('Error in /auth/reset-password:', err.message || err);
    res.status(500).json({ error: 'Internal server error updating password.' });
  }
});

// ========================================================
// FOUNDER-ONLY SECURE ADMINISTRATOR AUTHENTICATION & CONSOLE
// ========================================================


interface AdminSecurityStore {
  passwordHash: string;
  salt: string;
  updatedAt: number;
}

const ADMIN_SECURITY_FILE = path.join(STORAGE_DIR, 'admin_security.json');

let memoryAdminSecurity: AdminSecurityStore | null = null;
let sessionRevokedBeforeTimestamp: number = 0;

async function getStoredAdminSecurityAsync(): Promise<AdminSecurityStore | null> {
  if (memoryAdminSecurity && !isServerless) return memoryAdminSecurity;

  // 1. Authoritative Firestore persistence (survives Vercel serverless cold starts)
  let firestoreReadSucceeded = false;
  try {
    const db = await getAdminFirestore();
    if (db) {
      const snap = await db.collection('_admin_security').doc('founder').get();
      firestoreReadSucceeded = true;
      if (snap.exists) {
        const data = snap.data() as AdminSecurityStore;
        if (data && data.passwordHash && data.salt) {
          memoryAdminSecurity = data;
          sessionRevokedBeforeTimestamp = data.updatedAt || 0;
          return data;
        }
      }
    }
  } catch (fsErr) {
    if (isServerless) {
      throw new ConfigError('Persistent administrator storage is unavailable. Configure Firebase Admin credentials.');
    }
    console.warn('[ADMIN SECURITY] Firestore read notice:', (fsErr as any)?.message || fsErr);
  }

  if (isServerless && !firestoreReadSucceeded) {
    throw new ConfigError('Persistent administrator storage is unavailable. Configure Firebase Admin credentials.');
  }

  if (isServerless) return null;

  // 2. Secondary local disk cache
  try {
    if (fs.existsSync(ADMIN_SECURITY_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_SECURITY_FILE, 'utf8'));
      if (data && data.passwordHash && data.salt) {
        memoryAdminSecurity = data;
        sessionRevokedBeforeTimestamp = data.updatedAt || 0;
        return data;
      }
    }
  } catch (err) {
    console.warn('[ADMIN SECURITY] Failed to read disk store:', err);
  }

  return null;
}

async function saveAdminSecurityAsync(password: string, allowReplace = false, resetTokenId?: string): Promise<AdminSecurityStore> {
  const norm = normalizePassword(password);
  const derived = hashPassword(norm, { version: 1 });
  const record: AdminSecurityStore = {
    passwordHash: derived.hash,
    salt: derived.salt,
    updatedAt: derived.updatedAt
  };
  // 1. Authoritative write to Cloud Firestore document with read-back verification
  let firestoreConfirmed = false;
  try {
    const db = await getAdminFirestore();
    if (db) {
      const securityRef = db.collection('_admin_security').doc('founder');
      const statusRef = db.collection('systemConfig').doc('status');
      await db.runTransaction(async (transaction: any) => {
        const current = await transaction.get(securityRef);
        if (current.exists && !allowReplace) {
          throw new ConfigError('Admin Security Password is already initialized. Use the verified recovery flow.');
        }
        if (resetTokenId) {
          const usedRef = db.collection('_admin_reset_tokens').doc(resetTokenId);
          const used = await transaction.get(usedRef);
          if (used.exists) throw new ConfigError('This administrator recovery authorization has already been used.');
          transaction.create(usedRef, { usedAt: Date.now() });
        }
        transaction.set(securityRef, {
          ...derived,
          passwordHash: derived.hash,
          updatedAt: derived.updatedAt
        });
        transaction.set(statusRef, {
          initialized: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      const snap = await securityRef.get();
      firestoreConfirmed = Boolean(snap.exists && snap.data()?.hash === derived.hash);
      if (!firestoreConfirmed) throw new ConfigError('Could not verify administrator credentials in persistent storage.');
    }
  } catch (fsErr) {
    if (isServerless || fsErr instanceof ConfigError) throw fsErr;
    console.warn('[ADMIN SECURITY] Cloud Firestore persist notice:', fsErr);
  }

  if (!firestoreConfirmed && isServerless) {
    throw new ConfigError('Persistent administrator storage is unavailable. Configure Firebase Admin credentials.');
  }

  if (!firestoreConfirmed && resetTokenId) {
    if (consumedAdminResetTokenIds.has(resetTokenId)) {
      throw new ConfigError('This administrator recovery authorization has already been used.');
    }
    consumedAdminResetTokenIds.add(resetTokenId);
  }

  // 2. Secondary local disk cache
  try {
    fs.writeFileSync(ADMIN_SECURITY_FILE, JSON.stringify(record, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ADMIN SECURITY] Disk write error:', err);
  }

  memoryAdminSecurity = record;
  sessionRevokedBeforeTimestamp = record.updatedAt;

  return record;
}

async function verifyAdminSecurityPasswordAsync(password: string): Promise<boolean> {
  const security = await getStoredAdminSecurityAsync();
  if (security && security.passwordHash && security.salt) {
    const isValid = verifyPasswordScrypt(password, security);
    if (!isValid) {
      console.warn('[ADMIN SECURITY] Password verification failed against stored hash.');
    }
    return isValid;
  }
  return false;
}

// In-memory security tokens and sessions
const elevatedAdminSessions = new Map<string, { sessionId: string; founderEmail: string; expiresAt: number; createdAt: number }>();

const consumedAdminResetTokenIds = new Set<string>();

// Online Presence tracking (heartbeats)
const onlinePresenceMap = new Map<string, { userId: string; email: string; lastSeen: number; ip: string }>();

// Admin Audit Log
interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: any;
  actor: string;
}
const auditLogEntries: AuditLogEntry[] = [
  {
    id: `log_${Date.now()}`,
    timestamp: Date.now(),
    action: 'SYSTEM_BOOT',
    details: 'NEXORA Admin Security Subsystem initialized with Firestore persistence.',
    actor: 'system'
  }
];

function recordAudit(action: string, details: any, actor: string = FOUNDER_EMAIL) {
  const log: AuditLogEntry = {
    id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: Date.now(),
    action,
    details,
    actor
  };
  auditLogEntries.unshift(log);
  if (auditLogEntries.length > 200) auditLogEntries.pop();
}

// Middleware: Require 15-minute Elevated Admin Session
async function requireElevatedAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    await getStoredAdminSecurityAsync();
  } catch {
    res.status(503).json({ error: 'Administrator storage is unavailable.' });
    return;
  }

  const token = (req.headers['x-admin-session'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!token) {
    res.status(401).json({ error: 'Elevated administrator session required. Please authenticate in the Admin Panel.' });
    return;
  }

  // 1. Check stateless cryptographic token (resilient across Vercel serverless cold starts)
  const payload = verifySignedToken(token, 'admin-session');
  if (payload && payload.exp > Date.now()) {
    const tokenIat = (payload as any).iat || 0;
    if (sessionRevokedBeforeTimestamp && tokenIat && tokenIat < sessionRevokedBeforeTimestamp) {
      res.status(401).json({ error: 'Admin session revoked due to password update. Please log in again.' });
      return;
    }
    return next();
  }

  // 2. Fallback check in-memory sessions
  const session = elevatedAdminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) elevatedAdminSessions.delete(token);
    res.status(401).json({ error: 'Elevated administrator session expired. Please re-authenticate.' });
    return;
  }
  next();
}

// 1. Admin Status check
apiRouter.get(['/admin/auth/status', '/admin/status'], async (req, res) => {
  try {
    const security = await getStoredAdminSecurityAsync();
    let isInitialized = Boolean(security && security.passwordHash && security.salt);

    // If the credential record is absent, honor an initialized marker to avoid reopening setup.
    if (!isInitialized) {
      const db = await getAdminFirestore();
      if (db) {
        const confSnap = await db.collection('systemConfig').doc('status').get();
        if (confSnap.exists && confSnap.data()?.initialized === true) {
          isInitialized = true;
        }
      }
    }

    res.json({ success: true, initialized: isInitialized });
  } catch {
    res.status(503).json({ error: 'Administrator storage is unavailable.' });
  }
});

// 1.1 Generate strong, policy-compliant admin password
apiRouter.all(['/admin/auth/generate-password', '/admin/generate-password'], (req, res) => {
  const password = generateStrongAdminPassword(20);
  res.json({
    success: true,
    password
  });
});

// 1b. Elevate Admin Custom Claims for Authorized Administrators
apiRouter.post('/admin/auth/sync-claim', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header.' });
      return;
    }

    const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const adminAuth = await getAdminAuth();
    if (!adminAuth) {
      res.status(503).json({ error: 'Administrator identity verification is unavailable.' });
      return;
    }

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }

    const email = String(decoded.email || '').toLowerCase().trim();
    const uid = String(decoded.uid || '');
    if (!email || !uid || decoded.email_verified !== true) {
      res.status(401).json({ error: 'A verified administrator account is required.' });
      return;
    }

    if (!ADMIN_EMAILS.includes(email)) {
      res.status(403).json({ success: false, admin: false, error: 'User email is not authorized as an administrator.' });
      return;
    }

    try {
      const user = await adminAuth.getUser(uid);
      await adminAuth.setCustomUserClaims(uid, { ...user.customClaims, admin: true });
    } catch (claimErr: any) {
      console.error('[SYNC-CLAIM] Could not set custom claims via Admin SDK:', claimErr?.message || claimErr);
      res.status(503).json({ error: 'Administrator permissions could not be persisted.' });
      return;
    }

    res.json({
      success: true,
      admin: true,
      email,
      message: 'Admin claim verified.'
    });
  } catch (err: any) {
    console.error('[SYNC-CLAIM] Error:', err);
    res.status(500).json({ error: err.message || 'Failed to sync admin claim.' });
  }
});

// 2. Request OTP to authorize creating initial Admin Security Password
apiRouter.post(['/admin/auth/request-setup-otp', '/admin/request-setup-otp'], async (req, res) => {
  try {
    const existing = await getStoredAdminSecurityAsync();
    if (existing) {
      res.status(400).json({ error: 'Admin Security Password has already been set up. Please enter your existing password.' });
      return;
    }

    const requestedAt = Date.now();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = requestedAt + 180 * 1000; // 3-minute expiry
    const hash = hashOtp(FOUNDER_EMAIL, otp, 'admin-setup');

    await adminOtpChallengesStore.create('admin-setup', {
      flow: 'setup', hash, expiresAt, attempts: 0, lastSentAt: requestedAt, status: 'pending'
    }, 30_000);

    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'admin-setup');
    } catch (brevoErr: any) {
      await adminOtpChallengesStore.invalidate('admin-setup').catch(() => {});
      res.status(502).json({
        error: 'Could not dispatch the administrator setup email. Please try again later.',
        code: brevoErr?.code || 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    recordAudit('ADMIN_SETUP_OTP_REQUESTED', 'Administrator setup OTP dispatched by Brevo.');

    res.json({
      success: true,
      maskedEmail: maskEmail(FOUNDER_EMAIL),
      expiresInSeconds: 180,
      resendCooldown: 30
    });
  } catch (err: any) {
    console.error('Error requesting setup OTP:', err);
    const rateLimited = err instanceof AdminOtpRateLimitError;
    const unavailable = err instanceof ConfigError || err instanceof AdminOtpStorageError;
    res.status(rateLimited ? 429 : unavailable ? 503 : 500).json({
      error: rateLimited ? err.message : unavailable ? 'Administrator OTP storage is unavailable.' : 'Failed to dispatch setup OTP via email.',
      ...(rateLimited ? { waitSeconds: err.waitSeconds } : {})
    });
  }
});

// 3. Create initial Admin Security Password (First-Ever Admin Login)
apiRouter.post(['/admin/auth/setup-password', '/admin/setup-password'], async (req, res) => {
  try {
    const { setupOtp, newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) {
      res.status(400).json({ error: 'Both new password and confirmation are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 16) {
      res.status(400).json({ error: 'Admin Security Password must be at least 16 characters long.' });
      return;
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      res.status(400).json({ error: policy.reason || 'Password does not satisfy complexity requirements.' });
      return;
    }

    if (!/^\d{6}$/.test(String(setupOtp || ''))) {
      res.status(400).json({ error: 'A valid setup code must be requested before setting the password.' });
      return;
    }

    const pendingChallenge = await adminOtpChallengesStore.get('admin-setup');
    if (!pendingChallenge || pendingChallenge.flow !== 'setup' || pendingChallenge.status !== 'pending') {
      res.status(400).json({ error: 'Setup code is expired, already used, or was not requested.' });
      return;
    }

    const existing = await getStoredAdminSecurityAsync();
    if (existing) {
      res.status(400).json({ error: 'Admin Security Password has already been set up. Use Forgot Password to reset it.' });
      return;
    }
    const otpResult = await adminOtpChallengesStore.consume('admin-setup', hashOtp(FOUNDER_EMAIL, String(setupOtp).trim(), 'admin-setup'));
    if (otpResult.status !== 'valid') {
      respondToOtpFailure(otpResult, res, 'Setup');
      return;
    }

    await saveAdminSecurityAsync(newPassword);
    recordAudit('ADMIN_PASSWORD_INITIALIZED', 'Founder Admin Security Password created and persisted permanently in Firestore.');

    // Automatically issue elevated session for immediate access
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const sessionToken = createSignedToken({
      email: FOUNDER_EMAIL,
      purpose: 'admin-session',
      exp: expiresAt,
      iat: Date.now()
    } as any);

    elevatedAdminSessions.set(sessionToken, {
      sessionId: sessionToken,
      founderEmail: FOUNDER_EMAIL,
      expiresAt,
      createdAt: Date.now()
    });

    res.json({
      success: true,
      sessionToken,
      expiresAt,
      message: 'Admin Security Password created permanently in database. Elevated admin session active.'
    });
  } catch (err: any) {
    console.error('Error in setup-password:', err);
    res.status(err instanceof ConfigError || err instanceof AdminOtpStorageError ? 503 : 500).json({
      error: err instanceof ConfigError || err instanceof AdminOtpStorageError ? 'Administrator storage is unavailable.' : 'Failed to set up Admin Security Password.'
    });
  }
});

// 4. Verify Admin Security Password (Factor 1 of 2FA: Generates and dispatches Factor 2 OTP)
apiRouter.post(['/admin/auth/verify-password', '/admin/verify-password'], async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Admin Security Password is required.' });
      return;
    }

    const isValid = await verifyAdminSecurityPasswordAsync(password);
    if (!isValid) {
      recordAudit('ADMIN_PASSWORD_FAILED', 'Incorrect Admin Security Password attempt.');
      res.status(401).json({ error: 'Incorrect Admin Security Password.' });
      return;
    }

    // Step 1 Passed: Issue single-use passwordToken for Factor 2 verification (5-minute validity)
    const passwordToken = `pwd_tok_${crypto.randomBytes(24).toString('hex')}`;
    const passwordTokenExpiresAt = Date.now() + 5 * 60 * 1000;

    // Generate Factor 2 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpCreatedAt = Date.now();
    const otpExpiresAt = otpCreatedAt + 180 * 1000;
    const otpHash = hashOtp(FOUNDER_EMAIL, otp, 'admin-step4');
    const challengeId = adminLoginChallengeId(passwordToken);

    await adminOtpChallengesStore.create(challengeId, {
      flow: 'admin-login', hash: otpHash, expiresAt: otpExpiresAt, attempts: 0,
      lastSentAt: otpCreatedAt, status: 'pending', passwordTokenExpiresAt
    }, 0);

    // Dispatch Factor 2 email via Brevo to pre-approved administrator
    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'admin-login');
    } catch (brevoErr: any) {
      await adminOtpChallengesStore.invalidate(challengeId).catch(() => {});
      res.status(502).json({
        error: 'Could not send the administrator verification code. Please try again later.',
        code: brevoErr?.code || 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    recordAudit('ADMIN_PASSWORD_VERIFIED', 'Admin Security Password verified. Factor 2 OTP dispatched to founder email.');

    // 2FA Mandatory: Return requiresOtp: true with passwordToken. Elevated session is only issued in verify-admin-otp!
    res.json({
      success: true,
      requiresOtp: true,
      passwordToken,
      expiresInSeconds: 180,
      resendCooldown: 30,
      maskedEmail: maskEmail(FOUNDER_EMAIL)
    });
  } catch (err: any) {
    console.error('Error in verify-password:', err);
    res.status(err instanceof ConfigError || err instanceof AdminOtpStorageError ? 503 : 500).json({
      error: err instanceof ConfigError || err instanceof AdminOtpStorageError ? 'Administrator OTP storage is unavailable.' : 'Internal server error verifying password.'
    });
  }
});

// 5. Resend Admin Gmail OTP (for two-step or legacy clients)
apiRouter.post(['/admin/auth/resend-admin-otp', '/admin/auth/resend-otp', '/admin/resend-admin-otp', '/admin/resend-otp'], async (req, res) => {
  try {
    const { passwordToken } = req.body;
    if (typeof passwordToken !== 'string' || !/^pwd_tok_[a-f0-9]{48}$/.test(passwordToken)) {
      res.status(400).json({ error: 'Session expired. Please re-enter your Admin Security Password.' });
      return;
    }

    const challengeId = adminLoginChallengeId(passwordToken);
    const existing = await adminOtpChallengesStore.get(challengeId);
    if (!existing || existing.flow !== 'admin-login' || ['consumed', 'locked'].includes(existing.status) || !existing.passwordTokenExpiresAt || Date.now() > existing.passwordTokenExpiresAt) {
      res.status(400).json({ error: 'Session expired. Please re-enter your Admin Security Password.' });
      return;
    }

    const requestedAt = Date.now();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = requestedAt + 180 * 1000;
    const otpHash = hashOtp(FOUNDER_EMAIL, otp, 'admin-step4');

    await adminOtpChallengesStore.create(challengeId, {
      ...existing,
      hash: otpHash,
      expiresAt: otpExpiresAt,
      attempts: 0,
      lastSentAt: requestedAt,
      status: 'pending'
    }, 30_000);

    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'admin-login');
    } catch (brevoErr: any) {
      await adminOtpChallengesStore.invalidate(challengeId).catch(() => {});
      res.status(502).json({
        error: 'Could not send the administrator verification code. Please try again later.',
        code: brevoErr?.code || 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    res.json({
      success: true,
      expiresInSeconds: 180,
      resendCooldown: 30
    });
  } catch (err: any) {
    const rateLimited = err instanceof AdminOtpRateLimitError;
    const unavailable = err instanceof ConfigError || err instanceof AdminOtpStorageError;
    res.status(rateLimited ? 429 : unavailable ? 503 : 500).json({
      error: rateLimited ? err.message : unavailable ? 'Administrator OTP storage is unavailable.' : 'Failed to resend administrator OTP.',
      ...(rateLimited ? { waitSeconds: err.waitSeconds } : {})
    });
  }
});

// 6. Verify Admin Gmail OTP (Step 4 -> Step 5: Elevated Session)
apiRouter.post(['/admin/auth/verify-admin-otp', '/admin/auth/verify-otp', '/admin/verify-admin-otp', '/admin/verify-otp'], async (req, res) => {
  try {
    const { passwordToken, otp } = req.body;
    if (!passwordToken || !otp) {
      res.status(400).json({ error: 'Password token and 6-digit OTP code are required.' });
      return;
    }

    if (typeof passwordToken !== 'string' || !/^pwd_tok_[a-f0-9]{48}$/.test(passwordToken) || !/^\d{6}$/.test(String(otp))) {
      res.status(400).json({ error: 'Password token and six-digit OTP code are required.' });
      return;
    }

    const challengeId = adminLoginChallengeId(passwordToken);
    const challenge = await adminOtpChallengesStore.get(challengeId);
    if (!challenge || challenge.flow !== 'admin-login' || !challenge.passwordTokenExpiresAt || Date.now() > challenge.passwordTokenExpiresAt) {
      res.status(400).json({ error: 'Verification code has expired. Please re-enter your Admin Security Password.' });
      return;
    }

    const otpResult = await adminOtpChallengesStore.consume(challengeId, hashOtp(FOUNDER_EMAIL, String(otp).trim(), 'admin-step4'));
    if (otpResult.status !== 'valid') {
      respondToOtpFailure(otpResult, res, 'Verification');
      return;
    }

    // Create 15-minute elevated session
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const sessionToken = createSignedToken({
      email: FOUNDER_EMAIL,
      purpose: 'admin-session',
      exp: expiresAt,
      iat: Date.now()
    } as any);

    elevatedAdminSessions.set(sessionToken, {
      sessionId: sessionToken,
      founderEmail: FOUNDER_EMAIL,
      expiresAt,
      createdAt: Date.now()
    });

    recordAudit('ADMIN_ACCESS_GRANTED', 'Founder completed OTP verification. Elevated session issued (15 min).');

    res.json({
      success: true,
      sessionToken,
      expiresAt,
      durationMinutes: 15
    });
  } catch (err: any) {
    console.error('Error in verify-admin-otp:', err);
    res.status(err instanceof ConfigError || err instanceof AdminOtpStorageError ? 503 : 500).json({
      error: err instanceof ConfigError || err instanceof AdminOtpStorageError ? 'Administrator OTP storage is unavailable.' : 'Internal server error verifying administrator OTP.'
    });
  }
});

// ========================================================
// FORGOT PASSWORD FLOW (PHASE 5)
// ========================================================

// 7a. Request Admin Password Reset OTP via Brevo
apiRouter.post(['/admin/auth/forgot-password/request-otp', '/admin/forgot-password/request-otp', '/admin/auth/forgot-password'], async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = typeof email === 'string' && email.trim() ? email.toLowerCase().trim() : FOUNDER_EMAIL;
    // Keep responses uniform while only sending codes to the fixed founder mailbox.
    if (normalizedEmail !== FOUNDER_EMAIL) {
      res.json({
        success: true,
        maskedEmail: maskEmail(FOUNDER_EMAIL),
        expiresInSeconds: 180,
        resendCooldown: 60
      });
      return;
    }

    const now = Date.now();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + 180 * 1000; // 3-minute expiry
    const hash = hashOtp(FOUNDER_EMAIL, otp, 'admin-forgot-password');

    await adminOtpChallengesStore.create('admin-password-reset', {
      flow: 'password-reset', hash, expiresAt, attempts: 0, lastSentAt: now, status: 'pending'
    }, 60_000);

    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'reset-password');
    } catch (brevoErr: any) {
      await adminOtpChallengesStore.invalidate('admin-password-reset').catch(() => {});
      res.status(502).json({
        error: 'Could not dispatch the administrator recovery code. Please try again later.',
        code: brevoErr?.code || 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    recordAudit('ADMIN_PASSWORD_RESET_OTP_REQUESTED', 'Password reset OTP dispatched to founder email.');

    res.json({
      success: true,
      maskedEmail: maskEmail(FOUNDER_EMAIL),
      expiresInSeconds: 180,
      resendCooldown: 60
    });
  } catch (err: any) {
    console.error('Error requesting admin reset OTP:', err);
    const rateLimited = err instanceof AdminOtpRateLimitError;
    const unavailable = err instanceof ConfigError || err instanceof AdminOtpStorageError;
    res.status(rateLimited ? 429 : unavailable ? 503 : 500).json({
      error: rateLimited ? err.message : unavailable ? 'Administrator OTP storage is unavailable.' : 'Failed to dispatch administrator recovery code.',
      ...(rateLimited ? { waitSeconds: err.waitSeconds } : {})
    });
  }
});

// 7b. Verify Admin Password Reset OTP
apiRouter.post(['/admin/auth/forgot-password/verify-otp', '/admin/forgot-password/verify-otp'], async (req, res) => {
  try {
    const { otp } = req.body;
    if (!/^\d{6}$/.test(String(otp || ''))) {
      res.status(400).json({ error: '6-digit verification code is required.' });
      return;
    }

    const challenge = await adminOtpChallengesStore.get('admin-password-reset');
    if (!challenge || challenge.flow !== 'password-reset') {
      res.status(400).json({ error: 'Recovery code is expired or was not requested. Please request a new code.' });
      return;
    }

    const otpResult = await adminOtpChallengesStore.consume('admin-password-reset', hashOtp(FOUNDER_EMAIL, String(otp).trim(), 'admin-forgot-password'));
    if (otpResult.status !== 'valid') {
      respondToOtpFailure(otpResult, res, 'Recovery');
      return;
    }

    // Issue single-use signed password reset token (10-minute validity)
    const resetToken = createSignedToken({
      email: FOUNDER_EMAIL,
      purpose: 'admin-password-reset',
      exp: Date.now() + 10 * 60 * 1000
    });

    recordAudit('ADMIN_PASSWORD_RESET_OTP_VERIFIED', 'Founder verified OTP for password reset.');

    res.json({
      success: true,
      resetToken,
      expiresInSeconds: 600
    });
  } catch (err: any) {
    console.error('Error verifying admin reset OTP:', err);
    res.status(err instanceof ConfigError || err instanceof AdminOtpStorageError ? 503 : 500).json({
      error: err instanceof ConfigError || err instanceof AdminOtpStorageError ? 'Administrator OTP storage is unavailable.' : 'Failed to verify recovery code.'
    });
  }
});

// 7c. Complete Admin Password Reset
apiRouter.post(['/admin/auth/forgot-password/reset-password', '/admin/forgot-password/reset-password'], async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;
    if (!resetToken || !newPassword || !confirmPassword) {
      res.status(400).json({ error: 'Reset token, new password, and confirmation are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 16) {
      res.status(400).json({ error: 'Admin Security Password must be at least 16 characters long.' });
      return;
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      res.status(400).json({ error: policy.reason || 'Password does not satisfy complexity requirements.' });
      return;
    }

    const verified = verifySignedToken(resetToken, 'admin-password-reset', FOUNDER_EMAIL);
    if (!verified?.jti) {
      res.status(403).json({ error: 'Password reset authorization is invalid or has expired. Please restart recovery.' });
      return;
    }

    // Persist the password and consume this recovery authorization atomically.
    await saveAdminSecurityAsync(newPassword, true, verified.jti);

    // Revoke all existing admin sessions immediately
    elevatedAdminSessions.clear();

    recordAudit('ADMIN_PASSWORD_RESET_COMPLETED', 'Admin Security Password successfully updated via email OTP reset flow.');

    res.json({
      success: true,
      message: 'Admin Security Password successfully updated. Please log in with your new password.'
    });
  } catch (err: any) {
    console.error('Error resetting admin password:', err);
    res.status(err instanceof ConfigError ? 503 : 500).json({
      error: err instanceof ConfigError ? err.message : 'Failed to reset Admin Security Password.'
    });
  }
});

// 8. Verify / Check Elevated Session
apiRouter.all(['/admin/auth/session', '/admin/session'], (req, res) => {
  const token = (req.headers['x-admin-session'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  // Check stateless cryptographic token
  const payload = verifySignedToken(token, 'admin-session');
  if (payload && payload.exp > Date.now()) {
    const tokenIat = (payload as any).iat || 0;
    if (sessionRevokedBeforeTimestamp && tokenIat && tokenIat < sessionRevokedBeforeTimestamp) {
      res.json({ authenticated: false, error: 'Session revoked' });
      return;
    }
    res.json({
      authenticated: true,
      founderEmail: FOUNDER_EMAIL,
      expiresAt: payload.exp,
      remainingSeconds: Math.max(0, Math.floor((payload.exp - Date.now()) / 1000))
    });
    return;
  }

  // Check memory session fallback
  const session = elevatedAdminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) elevatedAdminSessions.delete(token);
    res.json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    founderEmail: session.founderEmail,
    expiresAt: session.expiresAt,
    remainingSeconds: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
  });
});

// 9. Lock Admin Panel (Revoke elevated session)
apiRouter.post(['/admin/auth/lock', '/admin/lock'], (req, res) => {
  const token = (req.body.sessionToken as string) || (req.headers['x-admin-session'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (token && elevatedAdminSessions.has(token)) {
    elevatedAdminSessions.delete(token);
  }
  recordAudit('ADMIN_LOCKED', 'Elevated admin session was manually locked.');
  res.json({ success: true, message: 'Admin session revoked.' });
});

// 9b. Brevo Email Diagnostics & Test Email (WP7)
apiRouter.get('/admin/email-diagnostics', async (req, res) => {
  try {
    const sessionToken = (req.headers['x-admin-session'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    const isElevated = sessionToken && (
      Boolean(elevatedAdminSessions.get(sessionToken)) || 
      Boolean(verifySignedToken(sessionToken, 'admin-session'))
    );
    if (!isElevated) {
      res.status(401).json({ error: 'Elevated admin session required.' });
      return;
    }

    let config;
    try {
      config = getBrevoConfig();
    } catch (cfgErr: any) {
      res.status(503).json({
        configured: false,
        error: cfgErr.message,
        code: cfgErr.code || 'EMAIL_NOT_CONFIGURED'
      });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let keyAccepted = false;
    let httpStatus = 0;
    let senderVerified = false;
    let transactionalEnabled = false;

    try {
      // 1. Check account info
      const accountRes = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': config.apiKey },
        signal: controller.signal
      });
      httpStatus = accountRes.status;
      if (accountRes.ok) {
        keyAccepted = true;
        const accountData = await accountRes.json().catch(() => ({}));
        transactionalEnabled = Boolean(accountData && accountData.plan);
      }

      // 2. Check senders info
      const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
        headers: { 'api-key': config.apiKey },
        signal: controller.signal
      });
      if (sendersRes.ok) {
        const sendersData = await sendersRes.json().catch(() => ({}));
        const sendersList = Array.isArray(sendersData?.senders) ? sendersData.senders : [];
        const match = sendersList.find((s: any) => s.email?.toLowerCase() === config.senderEmail.toLowerCase());
        senderVerified = Boolean(match && match.active);
      }

      res.json({
        success: true,
        keyAccepted,
        httpStatus,
        senderConfigured: config.senderEmail,
        senderVerified,
        transactionalEnabled
      });
    } catch (fetchErr: any) {
      res.status(502).json({
        success: false,
        error: fetchErr.name === 'AbortError' ? 'Brevo diagnostic request timed out' : 'Failed to connect to Brevo API',
        code: fetchErr.name === 'AbortError' ? 'EMAIL_TIMEOUT' : 'EMAIL_PROVIDER_REJECTED'
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Internal diagnostics failure' });
  }
});

apiRouter.post('/admin/send-test-email', async (req, res) => {
  try {
    const sessionToken = (req.headers['x-admin-session'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    const isElevated = sessionToken && (
      Boolean(elevatedAdminSessions.get(sessionToken)) || 
      Boolean(verifySignedToken(sessionToken, 'admin-session'))
    );
    if (!isElevated) {
      res.status(401).json({ error: 'Elevated admin session required.' });
      return;
    }

    const testOtp = crypto.randomInt(100000, 1000000).toString();
    await sendBrevoOtpEmail(FOUNDER_EMAIL, testOtp, 'signup');
    res.json({ success: true, message: `Test verification email dispatched to ${FOUNDER_EMAIL}.` });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to send test email', code: err.code });
  }
});

// 10. Server-side Coming Soon Validation & Registration Guard
apiRouter.post(['/registrations/validate', '/api/registrations/validate'], async (req, res) => {
  try {
    const { event_slug } = req.body;
    if (!event_slug) {
      res.status(400).json({ error: 'event_slug is required.' });
      return;
    }

    try {
      const db = await getAdminFirestore();
      if (db) {
        const snap = await db.collection('events').doc(event_slug).get();
        if (snap.exists) {
          const ev = snap.data();
          if (ev && ev.isComingSoon === true) {
            res.status(403).json({
              error: 'This competition is marked COMING SOON. Registrations are blocked.',
              code: 'COMPETITION_COMING_SOON'
            });
            return;
          }
        }
      }
    } catch {}

    res.json({ success: true, allowed: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Validation failed.' });
  }
});

// 11. Authoritative Server-side Registration Creation
apiRouter.post(['/registrations/create', '/registrations', '/api/registrations/create', '/api/registrations'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required to register for competitions.' });
      return;
    }

    const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    let decodedToken: { uid: string; email?: string };
    try {
      const adminAuth = await getAdminAuth();
      if (!adminAuth) throw new Error('Firebase Admin Auth is unavailable.');
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error: any) {
      console.warn('[REGISTRATION] Firebase ID token verification failed:', error?.code || error?.name || 'verification_error');
      res.status(401).json({ error: 'Invalid authentication credentials.' });
      return;
    }
    const userId = decodedToken.uid;
    const userEmail = (decodedToken.email || '').toLowerCase().trim();
    if (!userId || !userEmail) {
      res.status(401).json({ error: 'A verified student identity is required.' });
      return;
    }

    const {
      event_slug,
      full_name,
      email,
      phone_number,
      college,
      branch,
      academic_year,
      enrollment_number,
      division,
      team_name,
      team_members,
      team_member_details
    } = req.body;

    if (!event_slug || !full_name || !email || !phone_number || !college || !branch || !academic_year || !enrollment_number) {
      res.status(400).json({ error: 'Missing required registration fields.' });
      return;
    }

    const phoneValidation = validateIndianMobile(phone_number);
    if (!phoneValidation.valid) {
      res.status(400).json({ error: phoneValidation.error || 'A valid 10-digit Indian mobile number is required.' });
      return;
    }
    const canonicalPhone = normalizeIndianMobile(phone_number);

    const cleanSlug = event_slug.toLowerCase().trim();
    if (email.trim().toLowerCase() !== userEmail) {
      res.status(403).json({ error: 'The registration email must match the authenticated account.' });
      return;
    }

    // Brain Battle squad rule: exactly 5 members
    if (cleanSlug === 'brain-battle' || cleanSlug === 'brainbattle') {
      const detailsCount = Array.isArray(team_member_details) ? team_member_details.length : 0;
      const namesCount = Array.isArray(team_members) ? team_members.length : 0;
      const totalSquadSize = detailsCount === 5 ? 5 : (Math.max(detailsCount, namesCount) + 1);
      if (totalSquadSize !== 5) {
        res.status(400).json({
          error: 'Brain Battle requires a squad of exactly 5 students (1 team leader + 4 team members).'
        });
        return;
      }
    }

    const db = await getAdminFirestore();
    if (!db) {
      res.status(503).json({ error: 'Registration storage is temporarily unavailable.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const result = await createRegistrationOnce(db, userId, cleanSlug, (ev, registrationId) => {
      const referenceId = `NEX-${cleanSlug.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
      const isBvm = college.toLowerCase().includes('birla') || college.toLowerCase().includes('bvm');
      const bvmFee = ev?.bvm_fee ?? ev?.fee_per_participant ?? 50;
      const externalFee = ev?.external_fee ?? ev?.fee_per_participant ?? 70;
      const feePaid = isBvm ? bvmFee : externalFee;
      const memberDetails = Array.isArray(team_member_details) ? team_member_details : [];
      const memberNames = Array.isArray(team_members) ? team_members : [];
      return {
        id: registrationId,
        competition_id: ev?.competition_id || ev?.id || cleanSlug,
        reference_id: referenceId,
        user_id: userId,
        event_id: cleanSlug,
        event_slug: cleanSlug,
        event_title: ev?.title || event_slug,
        full_name: full_name.trim(),
        email: userEmail,
        phone_number: canonicalPhone,
        college: college.trim(),
        branch: branch.trim(),
        academic_year,
        enrollment_number: enrollment_number.trim().toUpperCase(),
        division: division?.trim() || '',
        team_name: team_name?.trim() || '',
        team_members: memberNames,
        team_member_details: memberDetails,
        participant_count: memberDetails.length || memberNames.length || 1,
        registration_status: 'Confirmed',
        payment_status: 'Completed',
        calculated_fee: feePaid,
        fee_paid: feePaid,
        created_at: nowIso,
        updated_at: nowIso
      };
    });

    if (!result.alreadyRegistered) {
      recordAudit('REGISTRATION_CREATED', `Student ${userEmail} registered for ${cleanSlug} (Ref: ${result.registration.reference_id})`, userEmail);
    }

    res.status(result.alreadyRegistered ? 200 : 201).json({
      success: true,
      alreadyRegistered: result.alreadyRegistered,
      registration: result.registration
    });
  } catch (err: any) {
    if (err instanceof RegistrationStoreError) {
      const status = err.code === 'COMPETITION_COMING_SOON' ? 403 : 400;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    console.error('[REGISTRATION CREATE ERROR]', err?.code || err?.name || 'unknown_error');
    res.status(500).json({ error: 'Failed to process registration.', code: 'REGISTRATION_SAVE_FAILED' });
  }
});

// Backward-compatibility aliases for existing clients
apiRouter.post('/admin/start-challenge', (req, res) => {
  res.redirect(307, '/admin/auth/status');
});
apiRouter.post('/admin/verify-session', (req, res) => {
  const token = req.body?.sessionToken;
  if (!token || !elevatedAdminSessions.has(token)) {
    res.json({ valid: false });
    return;
  }
  const s = elevatedAdminSessions.get(token)!;
  if (Date.now() > s.expiresAt) {
    elevatedAdminSessions.delete(token);
    res.json({ valid: false });
    return;
  }
  res.json({ valid: true, expiresAt: s.expiresAt });
});
apiRouter.post('/admin/logout-session', (req, res) => {
  const token = req.body?.sessionToken;
  if (token) elevatedAdminSessions.delete(token);
  res.json({ success: true });
});

// ==========================================
// USER PRESENCE & ONLINE STATUS SYSTEM
// ==========================================
apiRouter.post('/presence/heartbeat', (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    onlinePresenceMap.set(String(userId), {
      userId: String(userId),
      email: String(email || ''),
      lastSeen: Date.now(),
      ip: clientIp
    });
    res.json({ success: true, timestamp: Date.now() });
  } catch {
    res.json({ success: false });
  }
});

// ==========================================
// ADMIN CONSOLE MANAGEMENT APIS (PROTECTED)
// ==========================================

// Dashboard Statistics
apiRouter.get('/admin/stats', requireElevatedAdmin, (req, res) => {
  const now = Date.now();
  let onlineCount = 0;
  for (const entry of onlinePresenceMap.values()) {
    if (now - entry.lastSeen <= 3 * 60 * 1000) {
      onlineCount++;
    }
  }

  res.json({
    success: true,
    stats: {
      totalStudents: Math.max(onlinePresenceMap.size, 1),
      onlineStudents: onlineCount,
      totalCompetitions: 4,
      activeCompetitions: 4,
      totalRegistrations: 115,
      teamMembers: 6,
      recentActivity: auditLogEntries.slice(0, 10)
    }
  });
});

// Student Management with presence status
apiRouter.get('/admin/students', requireElevatedAdmin, (req, res) => {
  const now = Date.now();
  const students = Array.from(onlinePresenceMap.values()).map(s => {
    let status: 'online' | 'recent' | 'offline' = 'offline';
    const diff = now - s.lastSeen;
    if (diff <= 3 * 60 * 1000) {
      status = 'online';
    } else if (diff <= 15 * 60 * 1000) {
      status = 'recent';
    }
    return {
      id: s.userId,
      email: s.email,
      lastSeen: s.lastSeen,
      status
    };
  });

  res.json({
    success: true,
    students
  });
});

// Admin Audit Logs
apiRouter.get('/admin/audit-logs', requireElevatedAdmin, (req, res) => {
  res.json({
    success: true,
    logs: auditLogEntries
  });
});

// Image Upload Endpoint (stores in /public/images/uploaded)
apiRouter.post('/admin/upload-image', requireElevatedAdmin, (req, res) => {
  try {
    const { imageBase64, filename = 'image.jpg' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Base64 image data is required.' });
      return;
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'Invalid data URL base64 format.' });
      return;
    }

    const ext = matches[1].includes('png') ? '.png' : matches[1].includes('webp') ? '.webp' : '.jpg';
    const uploadDir = path.resolve(__dirname, 'public', 'images', 'uploaded');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch {
      // fallback
    }

    const safeName = `up_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const targetPath = path.join(uploadDir, safeName);

    try {
      fs.writeFileSync(targetPath, Buffer.from(matches[2], 'base64'));
      recordAudit('IMAGE_UPLOADED', `Uploaded image: ${safeName}`);
      res.json({
        success: true,
        url: `/images/uploaded/${safeName}`
      });
    } catch {
      // In serverless read-only mode, return data URL as preview
      res.json({
        success: true,
        url: imageBase64
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Image upload failed.' });
  }
});

// ==========================================
// CONTACT FORM SUBMISSION & RESILIENCE (PROMPT 1)
// ==========================================

const contactSubmissionSchema = z.object({
  sender_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name cannot exceed 80 characters'),
  sender_email: z.string().trim().toLowerCase().email('Please provide a valid email address').max(254, 'Email cannot exceed 254 characters'),
  subject: z.string().trim().max(150, 'Subject cannot exceed 150 characters').optional().default('NEXORA General Inquiry'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message cannot exceed 2000 characters'),
  submissionId: z.string().trim().uuid('Invalid submission ID format').optional(),
  honeypot: z.string().optional()
}).strict();

// In-memory rate-limiter caches
const contactIpRateLimits = new Map<string, { count: number; windowStart: number }>();
const contactEmailRateLimits = new Map<string, { count: number; windowStart: number }>();
let contactGlobalCount = 0;
let contactGlobalWindowStart = Date.now();

function sanitizeText(str: string): string {
  return (str || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

apiRouter.post('/contact/submit', async (req, res) => {
  try {
    // 1. Silent Honeypot Trap
    if (typeof req.body?.honeypot === 'string' && req.body.honeypot.trim().length > 0) {
      res.status(200).json({
        success: true,
        id: req.body.submissionId || 'hp_ignored',
        message: 'Your message has been received. The NEXORA team will review it.'
      });
      return;
    }

    // 2. Strict Zod Schema Validation
    const parsed = contactSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      const issues = parsed.error.issues || (parsed.error as any).errors || [];
      issues.forEach((err: any) => {
        const path = (err.path && Array.isArray(err.path) && err.path.length > 0) ? err.path.join('.') : 'general';
        fieldErrors[path] = err.message;
      });
      res.status(400).json({
        success: false,
        error: 'Validation failed for submitted contact form.',
        fields: fieldErrors
      });
      return;
    }

    const { sender_name, sender_email, subject, message, submissionId } = parsed.data;
    const cleanName = sanitizeText(sender_name);
    const cleanSubject = sanitizeText(subject || 'NEXORA General Inquiry');
    const cleanMessage = sanitizeText(message);
    const cleanEmail = sender_email.toLowerCase();

    // 3. Abuse Protection via Salted IP & Email Hash (never store raw IP)
    const rawIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const hashedIp = crypto.createHmac('sha256', getHmacSecret()).update(rawIp).digest('hex');
    const now = Date.now();

    // Global daily cap (100 per 24 hours)
    if (now - contactGlobalWindowStart > 24 * 60 * 60 * 1000) {
      contactGlobalCount = 0;
      contactGlobalWindowStart = now;
    }
    if (contactGlobalCount >= 100) {
      res.status(429).json({ error: 'Daily community contact volume reached. Please contact us directly via email.' });
      return;
    }

    // Per IP rate limit (3 per 10 minutes)
    const ipLimit = contactIpRateLimits.get(hashedIp);
    if (!ipLimit || now - ipLimit.windowStart > 10 * 60 * 1000) {
      contactIpRateLimits.set(hashedIp, { count: 1, windowStart: now });
    } else {
      if (ipLimit.count >= 3) {
        const waitSec = Math.ceil((10 * 60 * 1000 - (now - ipLimit.windowStart)) / 1000);
        res.status(429).json({
          error: `Too many submissions from this network. Please wait ${waitSec} seconds before sending another message.`,
          retryAfterSeconds: waitSec
        });
        return;
      }
      ipLimit.count += 1;
    }

    // Per email rate limit (5 per 24 hours)
    const emailLimit = contactEmailRateLimits.get(cleanEmail);
    if (!emailLimit || now - emailLimit.windowStart > 24 * 60 * 60 * 1000) {
      contactEmailRateLimits.set(cleanEmail, { count: 1, windowStart: now });
    } else {
      if (emailLimit.count >= 5) {
        res.status(429).json({
          error: 'Daily contact submission limit reached for this email address. Please try again tomorrow.'
        });
        return;
      }
      emailLimit.count += 1;
    }

    contactGlobalCount += 1;

    // 4. Firestore Admin SDK Persistence & Idempotency
    const db = await getAdminFirestore();
    if (!db) {
      res.status(503).json({ error: 'Database service is currently unreachable. Please try again later.' });
      return;
    }

    const messageId = submissionId || `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const docRef = db.collection('contactMessages').doc(messageId);

    // Idempotency check: if document already exists, return 200 without duplicate email
    const existingSnap = await docRef.get();
    if (existingSnap.exists) {
      res.status(200).json({
        success: true,
        id: messageId,
        alreadyProcessed: true,
        message: 'Your message has been received. The NEXORA team will review it.'
      });
      return;
    }

    const messageRecord = {
      id: messageId,
      sender_name: cleanName,
      sender_email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      status: 'unread',
      created_at: new Date().toISOString(),
      delivery_status: 'email_pending',
      email_attempts: 1
    };

    await docRef.set(messageRecord);

    // 5. Brevo Email Notification to Organizers
    const notifyRecipient = (process.env.CONTACT_NOTIFY_EMAIL || 'nexora.bvm@gmail.com').trim();
    try {
      await sendBrevoContactNotification(notifyRecipient, {
        senderName: cleanName,
        senderEmail: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        messageId
      });
      await docRef.update({
        delivery_status: 'email_sent',
        updated_at: new Date().toISOString()
      });
    } catch (brevoErr: any) {
      console.error(`[BREVO CONTACT NOTIFY ERROR] ${messageId}:`, brevoErr?.message || brevoErr);
      await docRef.update({
        delivery_status: 'email_failed',
        email_error: brevoErr?.message || 'Email delivery failed',
        updated_at: new Date().toISOString()
      }).catch(() => {});
    }

    recordAudit('CONTACT_MESSAGE_RECEIVED', `Inquiry received from ${cleanEmail} (ID: ${messageId})`);

    res.status(201).json({
      success: true,
      id: messageId,
      message: 'Your message has been received. The NEXORA team will review it.'
    });
  } catch (err: any) {
    console.error('[CONTACT SUBMIT CRASH]', err);
    res.status(500).json({ error: 'An unexpected error occurred while processing your message. Please try again.' });
  }
});

// Admin-only Retry Notification Email endpoint
apiRouter.post('/admin/contact-messages/:id/retry-email', requireElevatedAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getAdminFirestore();
    if (!db) {
      res.status(503).json({ error: 'Database service unreachable.' });
      return;
    }

    const docRef = db.collection('contactMessages').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Contact message not found.' });
      return;
    }

    const data = snap.data();
    const notifyRecipient = (process.env.CONTACT_NOTIFY_EMAIL || 'nexora.bvm@gmail.com').trim();
    await sendBrevoContactNotification(notifyRecipient, {
      senderName: data?.sender_name || 'Visitor',
      senderEmail: data?.sender_email || '',
      subject: data?.subject || 'NEXORA General Inquiry',
      message: data?.message || '',
      messageId: id
    });

    await docRef.update({
      delivery_status: 'email_sent',
      email_attempts: (Number(data?.email_attempts) || 0) + 1,
      updated_at: new Date().toISOString()
    });

    recordAudit('CONTACT_EMAIL_RESENT', `Notification resent for message ${id}`);
    res.json({ success: true, message: 'Notification email successfully resent.' });
  } catch (err: any) {
    res.status(err?.status || 500).json({ error: err.message || 'Failed to resend notification email.' });
  }
});

// Fallback admin presence reader
apiRouter.get('/admin/presence', requireElevatedAdmin, async (req, res) => {
  try {
    const db = await getAdminFirestore();
    if (!db) {
      res.status(503).json({ error: 'Database service unreachable.' });
      return;
    }

    const snap = await db.collection('presenceSessions').get();
    const now = Date.now();
    const LEASE_MS = 150_000;
    const userMap: Record<string, { online: boolean; lastSeen: number; sessionCount: number }> = {};

    snap.forEach((docSnap: any) => {
      const data = docSnap.data();
      if (!data?.uid) return;
      const uid = data.uid;
      const lastSeen = data.lastSeen?.toMillis ? data.lastSeen.toMillis() : (Number(data.lastSeen) || 0);
      const isFresh = (now - lastSeen) < LEASE_MS;

      if (!userMap[uid]) {
        userMap[uid] = { online: isFresh, lastSeen, sessionCount: isFresh ? 1 : 0 };
      } else {
        if (lastSeen > userMap[uid].lastSeen) {
          userMap[uid].lastSeen = lastSeen;
        }
        if (isFresh) {
          userMap[uid].online = true;
          userMap[uid].sessionCount += 1;
        }
      }
    });

    res.json({ success: true, presence: userMap, mode: 'delayed_admin_sync' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read presence sessions.' });
  }
});

// Register CMS endpoints (Competitions, Broadcast Notifications, Image Library, Team CMS)
registerCmsEndpoints({
  apiRouter,
  requireElevatedAdmin,
  getAdminFirestore,
  recordAudit
});

// Crucial: Mount apiRouter on both /api and root to handle direct and rewritten requests seamlessly
app.use('/api', apiRouter);
app.use(apiRouter);

// Structured JSON 404 handler for any unhandled /api/* route to guarantee never returning HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl || req.url}` });
});

if (isServerless) {
  app.use('*', (req, res) => {
    res.status(404).json({ error: `Route not found on API server: ${req.method} ${req.originalUrl || req.url}` });
  });
}

// Global Express Error Handler to guarantee JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API ERROR]', err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred. Please try again.'
  });
});

// Mount Vite in development or static files in production
async function startServer() {
  // If running inside a serverless handler (like Vercel API function), do not call app.listen
  if (isServerless || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV) {
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const http = await import('http');
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          server: httpServer
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = Number(PORT);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`NEXORA Server running on http://0.0.0.0:${port}`);
  });
}

const isMainModule = Boolean(process.argv[1] && (
  process.argv[1].endsWith('server.ts') || 
  process.argv[1].endsWith('server.js')
));

if (isMainModule) {
  startServer();
}

export default app;
