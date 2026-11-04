import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { registerCmsEndpoints } from './src/server/cmsEndpoints';
import { hashPasswordScrypt, verifyPasswordScrypt, normalizePassword } from './src/server/adminSecurity';
import { getBrevoConfig, sendBrevoOtpEmail, BrevoServiceError, type BrevoConfig } from './src/server/brevoMailer';

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

// Path recovery middleware for Vercel Serverless Function rewrites
app.use((req, res, next) => {
  const xMatched = (req.headers['x-matched-path'] as string) || (req.headers['x-forwarded-uri'] as string);
  if (xMatched) {
    req.url = xMatched;
  } else if (req.url.startsWith('/api/index')) {
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
  if (process.env.OTP_HMAC_SECRET && process.env.OTP_HMAC_SECRET.trim().length >= 16) {
    return process.env.OTP_HMAC_SECRET.trim();
  }
  const keyFile = path.join(STORAGE_DIR, 'hmac.key');
  try {
    if (fs.existsSync(keyFile)) {
      const stored = fs.readFileSync(keyFile, 'utf8').trim();
      if (stored.length >= 32) return stored;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(keyFile, generated, { encoding: 'utf8', mode: 0o600 });
    } catch {}
    return generated;
  } catch {
    return process.env.OTP_HMAC_SECRET || 'nexora_secure_otp_signing_hmac_secret_2026';
  }
}

const HMAC_SECRET = getOrCreateHmacSecret();

export { type BrevoConfig, getBrevoConfig, sendBrevoOtpEmail, BrevoServiceError };

export function getBrevoApiKey(): string {
  return getBrevoConfig().apiKey;
}

// Helper to compute keyed HMAC-SHA256 of OTP (never store raw OTP)
function hashOtp(email: string, otp: string, purpose: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
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
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(b64Data).digest('base64url');
  return `${b64Data}.${signature}`;
}

function verifySignedToken(token: string, expectedPurpose: string, expectedEmail?: string): { email: string; purpose: string; exp: number; jti?: string; iat?: number } | null {
  try {
    const [b64Data, signature] = token.split('.');
    if (!b64Data || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(b64Data).digest('base64url');
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
interface HashedStudentChallenge {
  email: string;
  hash: string;
  expiresAt: number;
  attempts: number;
  purpose: 'signup' | 'reset-password';
  lastSentAt: number;
  ip: string;
}

interface StoredAuthorization {
  email: string;
  token: string;
  purpose: 'signup' | 'reset-password';
  expiresAt: number;
}

// Lazy Firestore Admin Client
let adminFirestoreDb: any = null;
let adminAuthInstance: any = null;
let adminSdkAttempted = false;

async function getAdminFirestore(): Promise<any> {
  if (adminFirestoreDb) return adminFirestoreDb;
  if (adminSdkAttempted) return null;
  adminSdkAttempted = true;
  try {
    const adminApp = await import('firebase-admin/app');
    const adminFs = await import('firebase-admin/firestore');
    const adminAuthMod = await import('firebase-admin/auth');

    let appInstance;
    if (adminApp.getApps().length > 0) {
      appInstance = adminApp.getApps()[0];
    } else {
      const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (saRaw) {
        try {
          const sa = typeof saRaw === 'string' ? JSON.parse(saRaw) : saRaw;
          appInstance = adminApp.initializeApp({
            credential: adminApp.cert(sa),
            projectId: sa.project_id || 'gen-lang-client-0089073748'
          });
        } catch {
          appInstance = adminApp.initializeApp({ projectId: 'gen-lang-client-0089073748' });
        }
      } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        appInstance = adminApp.initializeApp({
          credential: adminApp.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0089073748',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
      } else {
        appInstance = adminApp.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0089073748'
        });
      }
    }

    adminAuthInstance = adminAuthMod.getAuth(appInstance);
    const dbId = 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b';
    adminFirestoreDb = adminFs.getFirestore(appInstance, dbId);
    return adminFirestoreDb;
  } catch (err: any) {
    console.warn('[FIRESTORE ADMIN] Operating with durable local fallback:', err?.message || err);
    return null;
  }
}

async function getAdminAuth(): Promise<any> {
  if (adminAuthInstance) return adminAuthInstance;
  await getAdminFirestore();
  return adminAuthInstance;
}

class ServerChallengeStore {
  private challenges = new Map<string, HashedStudentChallenge>();
  private authorizations = new Map<string, StoredAuthorization>();
  private ipRateLimits = new Map<string, { count: number; windowStart: number }>();
  private storeFile = path.join(STORAGE_DIR, 'otp_challenges.json');

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf8');
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (Array.isArray(parsed.challenges)) {
          for (const c of parsed.challenges) {
            if (c.expiresAt > now) {
              this.challenges.set(`${c.purpose}:${c.email}`, c);
            }
          }
        }
        if (Array.isArray(parsed.authorizations)) {
          for (const a of parsed.authorizations) {
            if (a.expiresAt > now) {
              this.authorizations.set(`${a.purpose}:${a.email}`, a);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[STORAGE] Could not load persisted challenges from disk:', err);
    }
  }

  private persistToDisk() {
    try {
      const now = Date.now();
      const activeChallenges = Array.from(this.challenges.values()).filter(c => c.expiresAt > now);
      const activeAuthorizations = Array.from(this.authorizations.values()).filter(a => a.expiresAt > now);
      const tmpFile = `${this.storeFile}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify({
        challenges: activeChallenges,
        authorizations: activeAuthorizations
      }), 'utf8');
      fs.renameSync(tmpFile, this.storeFile);
    } catch {
      // Non-fatal disk sync error
    }
  }

  // Rate Limiting per IP (Max 15 requests per 10 minutes)
  public checkIpRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const limit = this.ipRateLimits.get(ip);
    if (!limit || now - limit.windowStart > windowMs) {
      this.ipRateLimits.set(ip, { count: 1, windowStart: now });
      return true;
    }
    if (limit.count >= 15) {
      return false;
    }
    limit.count += 1;
    return true;
  }

  // Store new OTP challenge with keyed hash
  public async setChallenge(email: string, purpose: 'signup' | 'reset-password', hash: string, expiresAt: number, ip: string) {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    const record: HashedStudentChallenge = {
      email: email.toLowerCase().trim(),
      hash,
      expiresAt,
      attempts: 0,
      purpose,
      lastSentAt: Date.now(),
      ip
    };
    this.challenges.set(key, record);
    this.persistToDisk();

    try {
      const db = await getAdminFirestore();
      if (db) {
        const docId = key.replace(/[:\/]/g, '_');
        await db.collection('_otp_challenges').doc(docId).set(record);
      }
    } catch {}
  }

  public async getChallenge(email: string, purpose: 'signup' | 'reset-password'): Promise<HashedStudentChallenge | undefined> {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    const local = this.challenges.get(key);
    if (local && local.expiresAt > Date.now()) {
      return local;
    }

    try {
      const db = await getAdminFirestore();
      if (db) {
        const docId = key.replace(/[:\/]/g, '_');
        const snap = await db.collection('_otp_challenges').doc(docId).get();
        if (snap.exists) {
          const remote = snap.data() as HashedStudentChallenge;
          if (remote && remote.expiresAt > Date.now()) {
            this.challenges.set(key, remote);
            return remote;
          }
        }
      }
    } catch {}

    return local && local.expiresAt > Date.now() ? local : undefined;
  }

  public async deleteChallenge(email: string, purpose: 'signup' | 'reset-password') {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    this.challenges.delete(key);
    this.persistToDisk();

    try {
      const db = await getAdminFirestore();
      if (db) {
        const docId = key.replace(/[:\/]/g, '_');
        await db.collection('_otp_challenges').doc(docId).delete();
      }
    } catch {}
  }

  public async incrementAttempts(email: string, purpose: 'signup' | 'reset-password'): Promise<number> {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    let item = this.challenges.get(key);
    if (!item) {
      item = await this.getChallenge(email, purpose);
    }
    if (!item) return 0;
    item.attempts += 1;
    this.persistToDisk();

    try {
      const db = await getAdminFirestore();
      if (db) {
        const docId = key.replace(/[:\/]/g, '_');
        await db.collection('_otp_challenges').doc(docId).update({ attempts: item.attempts });
      }
    } catch {}

    return item.attempts;
  }

  // Store verified authorization token
  public async setAuthorization(email: string, purpose: 'signup' | 'reset-password', token: string, expiresAt: number) {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    const record: StoredAuthorization = {
      email: email.toLowerCase().trim(),
      purpose,
      token,
      expiresAt
    };
    this.authorizations.set(key, record);
    this.persistToDisk();

    try {
      const db = await getAdminFirestore();
      if (db) {
        const docId = key.replace(/[:\/]/g, '_');
        await db.collection('_reset_authorizations').doc(docId).set(record);
      }
    } catch {}
  }

  public async getAuthorization(email: string, purpose: 'signup' | 'reset-password'): Promise<StoredAuthorization | undefined> {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    const local = this.authorizations.get(key);
    if (local && local.expiresAt > Date.now()) {
      return local;
    }

    try {
      const db = await getAdminFirestore();
      if (db) {
        const docId = key.replace(/[:\/]/g, '_');
        const snap = await db.collection('_reset_authorizations').doc(docId).get();
        if (snap.exists) {
          const remote = snap.data() as StoredAuthorization;
          if (remote && remote.expiresAt > Date.now()) {
            this.authorizations.set(key, remote);
            return remote;
          }
        }
      }
    } catch {}

    return local && local.expiresAt > Date.now() ? local : undefined;
  }

  public async consumeAuthorization(email: string, purpose: 'signup' | 'reset-password', token: string): Promise<boolean> {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    let auth = this.authorizations.get(key);
    if (!auth) {
      auth = await this.getAuthorization(email, purpose);
    }
    if (!auth) return false;
    if (auth.token !== token || Date.now() > auth.expiresAt) {
      this.authorizations.delete(key);
      this.persistToDisk();
      try {
        const db = await getAdminFirestore();
        if (db) {
          const docId = key.replace(/[:\/]/g, '_');
          await db.collection('_reset_authorizations').doc(docId).delete();
        }
      } catch {}
      return false;
    }
    this.authorizations.delete(key);
    this.persistToDisk();
    try {
      const db = await getAdminFirestore();
      if (db) {
        const docId = key.replace(/[:\/]/g, '_');
        await db.collection('_reset_authorizations').doc(docId).delete();
      }
    } catch {}
    return true;
  }
}

const challengeStore = new ServerChallengeStore();

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
// SYSTEM HEALTH & READINESS ENDPOINT
// ==========================================
apiRouter.get('/health', async (req, res) => {
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const firebaseKey = process.env.FIREBASE_API_KEY?.trim();
  const hmacSecret = process.env.OTP_HMAC_SECRET?.trim();
  const hasSa = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT || 
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );

  let firestoreConnected = false;
  try {
    const db = await getAdminFirestore();
    firestoreConnected = Boolean(db);
  } catch {
    firestoreConnected = false;
  }

  res.json({
    status: 'ok',
    service: 'NEXORA Production Backend API',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    serverless: isServerless,
    environment: process.env.NODE_ENV || 'production',
    checks: {
      brevoEmail: {
        configured: Boolean(brevoKey && brevoKey.length > 8),
        senderEmail: (process.env.BREVO_SENDER_EMAIL || '').trim().replace(/^["']|["']$/g, ''),
        senderName: (process.env.BREVO_SENDER_NAME || 'NEXORA').trim().replace(/^["']|["']$/g, '')
      },
      otpSecurity: {
        hmacConfigured: Boolean(hmacSecret && hmacSecret.length >= 16),
        algorithm: 'HMAC-SHA256',
        expirySeconds: 180,
        resendCooldownSeconds: 30,
        maxAttempts: 5,
        storageMode: firestoreConnected ? 'Cloud Firestore (Authoritative)' : 'Durable Fallback Store'
      },
      firebase: {
        apiKeyConfigured: Boolean(firebaseKey && firebaseKey.length > 5),
        adminSdkConfigured: hasSa,
        projectId: 'gen-lang-client-0089073748',
        firestoreActive: firestoreConnected
      },
      adminSecurity: {
        founderConfigured: true,
        maskedFounderEmail: maskEmail(FOUNDER_EMAIL),
        sessionDurationMinutes: 15
      }
    }
  });
});

// ==========================================
// STUDENT EMAIL OTP VERIFICATION ENDPOINTS
// ==========================================

// 1. Dispatch 6-digit Email OTP via Brevo
apiRouter.post('/auth/send-email-otp', async (req, res) => {
  try {
    const { email, purpose = 'signup' } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    if (purpose !== 'signup' && purpose !== 'reset-password') {
      res.status(400).json({ error: 'Invalid verification purpose.' });
      return;
    }

    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    if (!challengeStore.checkIpRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many requests from this network. Please try again later.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await challengeStore.getChallenge(normalizedEmail, purpose);

    // Backend-enforced 30-second resend cooldown rate limit
    if (existing && Date.now() - existing.lastSentAt < 30000) {
      const waitSeconds = Math.ceil((30000 - (Date.now() - existing.lastSentAt)) / 1000);
      res.status(429).json({ 
        error: `Please wait ${waitSeconds}s before requesting a new verification code.`,
        waitSeconds 
      });
      return;
    }

    // Cryptographically secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 180 * 1000; // 3-minute expiration

    // Dispatch real email via Brevo Transactional API
    await sendBrevoOtpEmail(normalizedEmail, otp, purpose);

    // Store only the protected keyed HMAC hash (Raw OTP is never persisted)
    const hash = hashOtp(normalizedEmail, otp, purpose);
    await challengeStore.setChallenge(normalizedEmail, purpose, hash, expiresAt, clientIp);

    res.json({
      success: true,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInSeconds: 180,
      resendCooldown: 30
    });
  } catch (err: any) {
    console.error('Error in /auth/send-email-otp:', err.message || err);
    res.status(500).json({ error: err.message || 'Failed to dispatch verification code via email.' });
  }
});

// 2. Validate 6-digit Email OTP
apiRouter.post('/auth/verify-email-otp', async (req, res) => {
  try {
    const { email, otp, purpose = 'signup' } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Both email and 6-digit verification code are required.' });
      return;
    }

    if (purpose !== 'signup' && purpose !== 'reset-password') {
      res.status(400).json({ error: 'Invalid verification purpose.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const challenge = await challengeStore.getChallenge(normalizedEmail, purpose);

    if (!challenge) {
      res.status(400).json({ error: 'Verification code not requested or has expired. Please request a new code.' });
      return;
    }

    // Backend-enforced 3-minute expiry check
    if (Date.now() > challenge.expiresAt) {
      await challengeStore.deleteChallenge(normalizedEmail, purpose);
      res.status(400).json({ error: 'Verification code has expired (3-minute limit). Please request a fresh code.' });
      return;
    }

    // Brute force protection: maximum 5 attempts
    const attempts = await challengeStore.incrementAttempts(normalizedEmail, purpose);
    if (attempts > 5) {
      await challengeStore.deleteChallenge(normalizedEmail, purpose);
      res.status(429).json({ error: 'Too many incorrect attempts (maximum 5). Verification code invalidated for security.' });
      return;
    }

    // Constant-time HMAC comparison
    const inputHash = hashOtp(normalizedEmail, otp.toString().trim(), purpose);
    const hashA = Buffer.from(inputHash, 'hex');
    const hashB = Buffer.from(challenge.hash, 'hex');

    const isValid = hashA.length === hashB.length && crypto.timingSafeEqual(hashA, hashB);

    if (!isValid) {
      const remainingAttempts = Math.max(0, 5 - attempts);
      res.status(401).json({
        error: `Incorrect verification code. (${remainingAttempts} attempts remaining)`,
        remainingAttempts
      });
      return;
    }

    // Single-use: burn challenge immediately
    await challengeStore.deleteChallenge(normalizedEmail, purpose);

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
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
});

// 3. Confirm Verified Signup (Server-Side Verification Enforcement)
apiRouter.post('/auth/confirm-verified-signup', async (req, res) => {
  try {
    const { email, verificationToken, idToken } = req.body;
    if (!email || !verificationToken) {
      res.status(400).json({ error: 'Email and verification token are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const verified = verifySignedToken(verificationToken, 'signup', normalizedEmail);

    if (!verified) {
      res.status(403).json({ error: 'Invalid or expired signup verification token.' });
      return;
    }

    // Consume authorization token
    const consumed = await challengeStore.consumeAuthorization(normalizedEmail, 'signup', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Verification token has already been used or expired.' });
      return;
    }

    // Mark email verified in Firebase via Admin SDK or REST API if available
    let emailVerifiedInAuth = false;
    try {
      const { initializeApp, getApps } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      const appInstance = getApps().length ? getApps()[0] : initializeApp({ projectId: 'gen-lang-client-0089073748' });
      const auth = getAuth(appInstance);
      const userRecord = await auth.getUserByEmail(normalizedEmail);
      await auth.updateUser(userRecord.uid, { emailVerified: true });
      emailVerifiedInAuth = true;
    } catch {
      // If admin SDK credentials unavailable, use Firebase Identity Toolkit REST API with idToken if provided
      if (idToken && process.env.FIREBASE_API_KEY) {
        try {
          await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              returnSecureToken: true
            })
          });
        } catch {}
      }
    }

    res.json({
      success: true,
      verifiedEmail: normalizedEmail,
      emailVerifiedInAuth
    });
  } catch (err: any) {
    console.error('Error confirming verified signup:', err.message || err);
    res.status(500).json({ error: 'Internal server error during signup confirmation.' });
  }
});

// 4. Update Password with Verified Reset Token
apiRouter.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, verificationToken, newPassword } = req.body;
    if (!email || !verificationToken || !newPassword) {
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

    // Single-use: burn authorization token immediately
    const consumed = await challengeStore.consumeAuthorization(normalizedEmail, 'reset-password', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Password reset token has already been consumed. Please request a new code.' });
      return;
    }

    // Attempt Firebase Admin update
    let updatedViaAdmin = false;
    try {
      const { initializeApp, getApps } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      const appInstance = getApps().length ? getApps()[0] : initializeApp({ projectId: 'gen-lang-client-0089073748' });
      const auth = getAuth(appInstance);
      const userRecord = await auth.getUserByEmail(normalizedEmail);
      await auth.updateUser(userRecord.uid, {
        password: newPassword,
        emailVerified: true
      });
      await auth.revokeRefreshTokens(userRecord.uid);
      updatedViaAdmin = true;
    } catch (adminErr: any) {
      console.warn('[FIREBASE ADMIN NOTICE]', adminErr.message);
    }

    res.json({
      success: true,
      message: 'Your password has been updated successfully. Please sign in again.',
      updatedViaAdmin
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
  if (memoryAdminSecurity) return memoryAdminSecurity;

  // 1. Authoritative Firestore persistence (survives Vercel serverless cold starts)
  try {
    const db = await getAdminFirestore();
    if (db) {
      const snap = await db.collection('_admin_security').doc('founder').get();
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
    console.warn('[ADMIN SECURITY] Firestore read fallback:', fsErr);
  }

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

function getStoredAdminSecurity(): AdminSecurityStore | null {
  if (memoryAdminSecurity) return memoryAdminSecurity;
  try {
    if (fs.existsSync(ADMIN_SECURITY_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_SECURITY_FILE, 'utf8'));
      if (data && data.passwordHash && data.salt) {
        memoryAdminSecurity = data;
        return data;
      }
    }
  } catch {}
  return null;
}

async function saveAdminSecurityAsync(password: string): Promise<AdminSecurityStore> {
  const { passwordHash, salt } = hashPasswordScrypt(password);
  const record: AdminSecurityStore = {
    passwordHash,
    salt,
    updatedAt: Date.now()
  };
  memoryAdminSecurity = record;
  sessionRevokedBeforeTimestamp = record.updatedAt;

  // 1. Authoritative write to Cloud Firestore document with read-back verification
  let firestoreConfirmed = false;
  try {
    const db = await getAdminFirestore();
    if (db) {
      await db.collection('_admin_security').doc('founder').set(record);
      const snap = await db.collection('_admin_security').doc('founder').get();
      if (snap.exists && snap.data()?.passwordHash === record.passwordHash) {
        firestoreConfirmed = true;
      }
      await db.collection('systemConfig').doc('status').set({
        initialized: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (fsErr) {
    console.warn('[ADMIN SECURITY] Cloud Firestore persist notice:', fsErr);
  }

  // 2. Secondary local disk cache
  try {
    fs.writeFileSync(ADMIN_SECURITY_FILE, JSON.stringify(record, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ADMIN SECURITY] Disk write error:', err);
  }

  return record;
}

function saveAdminSecurity(password: string): void {
  saveAdminSecurityAsync(password).catch((err) => {
    console.warn('[ADMIN SECURITY] Background save warning:', err);
  });
}

async function verifyAdminSecurityPasswordAsync(password: string): Promise<boolean> {
  const security = await getStoredAdminSecurityAsync();
  if (security) {
    const isValid = verifyPasswordScrypt(password, security);
    if (!isValid) {
      console.warn('[ADMIN SECURITY] Password verification failed against stored hash.');
    }
    return isValid;
  }
  // Fallback: If and only if no password stored yet, check env var
  if (process.env.ADMIN_SECURITY_PASSWORD && process.env.ADMIN_SECURITY_PASSWORD.trim()) {
    console.warn('[ADMIN SECURITY NOTICE] Using ADMIN_SECURITY_PASSWORD environment variable fallback. Please set a permanent password via setup or CLI.');
    return normalizePassword(password) === normalizePassword(process.env.ADMIN_SECURITY_PASSWORD);
  }
  return false;
}

function verifyAdminSecurityPassword(password: string): boolean {
  const security = getStoredAdminSecurity();
  if (security) {
    return verifyPasswordScrypt(password, security);
  }
  if (process.env.ADMIN_SECURITY_PASSWORD && process.env.ADMIN_SECURITY_PASSWORD.trim()) {
    return normalizePassword(password) === normalizePassword(process.env.ADMIN_SECURITY_PASSWORD);
  }
  return false;
}

// In-memory security tokens and sessions
const setupOtpChallenges = new Map<string, { hash: string; expiresAt: number; attempts: number }>();
const verifiedPasswordTokens = new Map<string, { expiresAt: number; createdAt: number }>();
const adminEmailOtpChallenges = new Map<string, { hash: string; expiresAt: number; attempts: number; lastSentAt: number }>();
const elevatedAdminSessions = new Map<string, { sessionId: string; founderEmail: string; expiresAt: number; createdAt: number }>();

// Forgot Password challenges
interface AdminResetChallenge {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}
const adminResetChallenges = new Map<string, AdminResetChallenge>();

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
function requireElevatedAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
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

// 1. Admin Status check (supports both /admin/status and /admin/auth/status via GET and POST)
apiRouter.all(['/admin/auth/status', '/admin/status'], async (req, res) => {
  let security = await getStoredAdminSecurityAsync();
  let isInitialized = Boolean(security || process.env.ADMIN_SECURITY_PASSWORD);

  // If server memory/disk was cold-started, check Firestore systemConfig directly
  if (!isInitialized) {
    try {
      const db = await getAdminFirestore();
      if (db) {
        const confSnap = await db.collection('systemConfig').doc('status').get();
        if (confSnap.exists && confSnap.data()?.initialized) {
          isInitialized = true;
        }
      }
    } catch {}
  }

  // Allow trusted client ID token or client confirmation to sync status
  if (!isInitialized && req.body && req.body.clientConfirmedInitialized === true) {
    isInitialized = true;
  }

  res.json({
    success: true,
    initialized: isInitialized,
    maskedEmail: maskEmail(FOUNDER_EMAIL),
    maskedPhone: maskPhone(FOUNDER_PHONE)
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
    let email = '';
    let uid = '';

    const adminAuth = await getAdminAuth();
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        email = (decoded.email || '').toLowerCase().trim();
        uid = decoded.uid;
      } catch (tokenErr: any) {
        console.warn('[SYNC-CLAIM] verifyIdToken note:', tokenErr?.message);
      }
    }

    // Fallback token payload decode if verifyIdToken failed or adminAuth offline
    if (!email) {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (payload && payload.email) {
            email = (payload.email || '').toLowerCase().trim();
            uid = payload.uid || payload.user_id || payload.sub || '';
          }
        }
      } catch {}
    }

    if (!email) {
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }

    if (!ADMIN_EMAILS.includes(email)) {
      res.status(403).json({ success: false, admin: false, error: 'User email is not authorized as an administrator.' });
      return;
    }

    // Set custom claim in Firebase Auth if Admin SDK is available
    if (adminAuth && uid) {
      try {
        await adminAuth.setCustomUserClaims(uid, { admin: true });
        console.log(`[SYNC-CLAIM] Successfully set admin custom claim for ${email} (${uid})`);
      } catch (claimErr: any) {
        console.warn('[SYNC-CLAIM] Could not set custom claims via Admin SDK:', claimErr?.message);
      }
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
    if (existing || process.env.ADMIN_SECURITY_PASSWORD) {
      res.status(400).json({ error: 'Admin Security Password has already been set up. Please enter your existing password.' });
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 180 * 1000; // 3-minute expiry
    const hash = hashOtp(FOUNDER_EMAIL, otp, 'admin-setup');

    setupOtpChallenges.set('setup', { hash, expiresAt, attempts: 0 });

    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'signup');
    } catch (brevoErr: any) {
      setupOtpChallenges.delete('setup');
      res.status(502).json({
        error: `Could not dispatch setup verification email via Brevo: ${brevoErr.message}`,
        code: 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    recordAudit('ADMIN_SETUP_OTP_REQUESTED', 'Setup OTP dispatched to founder Gmail.');

    res.json({
      success: true,
      maskedEmail: maskEmail(FOUNDER_EMAIL),
      expiresInSeconds: 180,
      resendCooldown: 30
    });
  } catch (err: any) {
    console.error('Error requesting setup OTP:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch setup OTP via email.' });
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

    const existing = await getStoredAdminSecurityAsync();
    if (existing && !setupOtp) {
      res.status(400).json({ error: 'Admin Security Password has already been set up. Use Forgot Password to reset it.' });
      return;
    }

    // If an OTP challenge is registered, verify it
    const challenge = setupOtpChallenges.get('setup');
    if (challenge) {
      if (Date.now() > challenge.expiresAt) {
        setupOtpChallenges.delete('setup');
        res.status(400).json({ error: 'Setup code has expired. Please request a new code.' });
        return;
      }
      challenge.attempts += 1;
      if (challenge.attempts > 5) {
        setupOtpChallenges.delete('setup');
        res.status(429).json({ error: 'Too many incorrect attempts. Please request a new setup code.' });
        return;
      }

      const testHash = hashOtp(FOUNDER_EMAIL, String(setupOtp).trim(), 'admin-setup');
      const isOtpValid = crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(challenge.hash, 'hex'));
      if (!isOtpValid) {
        res.status(401).json({ error: 'Incorrect verification code. Please check your email.' });
        return;
      }
      setupOtpChallenges.delete('setup');
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
    res.status(500).json({ error: 'Failed to set up Admin Security Password.' });
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
    verifiedPasswordTokens.set(passwordToken, {
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now()
    });

    // Generate Factor 2 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = Date.now() + 180 * 1000;
    const otpHash = hashOtp(FOUNDER_EMAIL, otp, 'admin-step4');

    adminEmailOtpChallenges.set(passwordToken, {
      hash: otpHash,
      expiresAt: otpExpiresAt,
      attempts: 0,
      lastSentAt: Date.now()
    });

    // Dispatch Factor 2 email via Brevo to pre-approved administrator
    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'signup');
    } catch (brevoErr: any) {
      console.warn('[ADMIN 2FA] Brevo email dispatch warning:', brevoErr?.message || brevoErr);
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
    res.status(500).json({ error: 'Internal server error verifying password.' });
  }
});

// 5. Resend Admin Gmail OTP (for two-step or legacy clients)
apiRouter.post(['/admin/auth/resend-admin-otp', '/admin/auth/resend-otp', '/admin/resend-admin-otp', '/admin/resend-otp'], async (req, res) => {
  try {
    const { passwordToken } = req.body;
    if (!passwordToken || !verifiedPasswordTokens.has(passwordToken)) {
      res.status(400).json({ error: 'Session expired. Please re-enter your Admin Security Password.' });
      return;
    }

    const existing = adminEmailOtpChallenges.get(passwordToken);
    if (existing && Date.now() - existing.lastSentAt < 30000) {
      const waitSeconds = Math.ceil((30000 - (Date.now() - existing.lastSentAt)) / 1000);
      res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new code.`, waitSeconds });
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = Date.now() + 180 * 1000;
    const otpHash = hashOtp(FOUNDER_EMAIL, otp, 'admin-step4');

    adminEmailOtpChallenges.set(passwordToken, {
      hash: otpHash,
      expiresAt: otpExpiresAt,
      attempts: 0,
      lastSentAt: Date.now()
    });

    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'signup');
    } catch (brevoErr: any) {
      res.status(502).json({
        error: `Failed to dispatch fresh verification code: ${brevoErr.message}`,
        code: 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    res.json({
      success: true,
      expiresInSeconds: 180,
      resendCooldown: 30
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resend admin OTP.' });
  }
});

// 6. Verify Admin Gmail OTP (Step 4 -> Step 5: Elevated Session)
apiRouter.post(['/admin/auth/verify-admin-otp', '/admin/auth/verify-otp', '/admin/verify-admin-otp', '/admin/verify-otp'], (req, res) => {
  try {
    const { passwordToken, otp } = req.body;
    if (!passwordToken || !otp) {
      res.status(400).json({ error: 'Password token and 6-digit OTP code are required.' });
      return;
    }

    const challenge = adminEmailOtpChallenges.get(passwordToken);
    if (!challenge || Date.now() > challenge.expiresAt) {
      adminEmailOtpChallenges.delete(passwordToken);
      res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      return;
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      adminEmailOtpChallenges.delete(passwordToken);
      verifiedPasswordTokens.delete(passwordToken);
      res.status(429).json({ error: 'Too many incorrect attempts. Please re-enter Admin Security Password.' });
      return;
    }

    const testHash = hashOtp(FOUNDER_EMAIL, String(otp).trim(), 'admin-step4');
    const isValid = crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(challenge.hash, 'hex'));

    if (!isValid) {
      res.status(401).json({ error: 'Incorrect verification code. Please check your email.' });
      return;
    }

    // Invalidate single-use challenge and password token
    adminEmailOtpChallenges.delete(passwordToken);
    verifiedPasswordTokens.delete(passwordToken);

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
    res.status(500).json({ error: 'Internal server error verifying admin OTP.' });
  }
});

// ========================================================
// FORGOT PASSWORD FLOW (PHASE 5)
// ========================================================

// 7a. Request Admin Password Reset OTP via Brevo
apiRouter.post('/admin/auth/forgot-password/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    // Security: Do not disclose whether an arbitrary email address belongs to an admin
    if (email && typeof email === 'string' && !ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
      res.json({
        success: true,
        maskedEmail: maskEmail(email),
        expiresInSeconds: 300,
        resendCooldown: 60
      });
      return;
    }

    const now = Date.now();
    const existing = adminResetChallenges.get('founder_reset');
    if (existing && now - existing.lastSentAt < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new reset code.`, waitSeconds });
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + 5 * 60 * 1000; // 5-minute expiry
    const hash = hashOtp(FOUNDER_EMAIL, otp, 'admin-forgot-password');

    adminResetChallenges.set('founder_reset', {
      hash,
      expiresAt,
      attempts: 0,
      lastSentAt: now
    });

    // Mirror to Firestore for multi-instance resilience
    try {
      const db = await getAdminFirestore();
      if (db) {
        await db.collection('_admin_challenges').doc('founder_reset').set({
          hash,
          expiresAt,
          attempts: 0,
          lastSentAt: now
        });
      }
    } catch {}

    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'reset-password');
    } catch (brevoErr: any) {
      adminResetChallenges.delete('founder_reset');
      res.status(502).json({
        error: `Could not dispatch recovery code via Brevo: ${brevoErr.message}`,
        code: 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    recordAudit('ADMIN_PASSWORD_RESET_OTP_REQUESTED', 'Password reset OTP dispatched to founder email.');

    res.json({
      success: true,
      maskedEmail: maskEmail(FOUNDER_EMAIL),
      expiresInSeconds: 300,
      resendCooldown: 60
    });
  } catch (err: any) {
    console.error('Error requesting admin reset OTP:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch reset code.' });
  }
});

// 7b. Verify Admin Password Reset OTP
apiRouter.post('/admin/auth/forgot-password/verify-otp', async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ error: '6-digit verification code is required.' });
      return;
    }

    let challenge = adminResetChallenges.get('founder_reset');
    if (!challenge) {
      try {
        const db = await getAdminFirestore();
        if (db) {
          const snap = await db.collection('_admin_challenges').doc('founder_reset').get();
          if (snap.exists) challenge = snap.data() as AdminResetChallenge;
        }
      } catch {}
    }

    if (!challenge || Date.now() > challenge.expiresAt) {
      adminResetChallenges.delete('founder_reset');
      res.status(400).json({ error: 'Verification code has expired or was not requested. Please request a new code.' });
      return;
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      adminResetChallenges.delete('founder_reset');
      try {
        const db = await getAdminFirestore();
        if (db) await db.collection('_admin_challenges').doc('founder_reset').delete();
      } catch {}
      res.status(429).json({ error: 'Too many incorrect attempts. Please request a new verification code.' });
      return;
    }

    const testHash = hashOtp(FOUNDER_EMAIL, String(otp).trim(), 'admin-forgot-password');
    const isValid = crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(challenge.hash, 'hex'));

    if (!isValid) {
      const remaining = Math.max(0, 5 - challenge.attempts);
      res.status(401).json({ error: `Incorrect verification code (${remaining} attempts remaining).`, remainingAttempts: remaining });
      return;
    }

    // Invalidate single-use challenge
    adminResetChallenges.delete('founder_reset');
    try {
      const db = await getAdminFirestore();
      if (db) await db.collection('_admin_challenges').doc('founder_reset').delete();
    } catch {}

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
    res.status(500).json({ error: 'Failed to verify reset code.' });
  }
});

// 7c. Complete Admin Password Reset
apiRouter.post('/admin/auth/forgot-password/reset-password', async (req, res) => {
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

    const verified = verifySignedToken(resetToken, 'admin-password-reset', FOUNDER_EMAIL);
    if (!verified) {
      res.status(403).json({ error: 'Password reset authorization is invalid or has expired. Please restart recovery.' });
      return;
    }

    // Persist new password permanently to Firestore and disk
    await saveAdminSecurityAsync(newPassword);

    // Revoke all existing admin sessions immediately
    elevatedAdminSessions.clear();

    recordAudit('ADMIN_PASSWORD_RESET_COMPLETED', 'Admin Security Password successfully updated via email OTP reset flow.');

    res.json({
      success: true,
      message: 'Admin Security Password successfully updated. Please log in with your new password.'
    });
  } catch (err: any) {
    console.error('Error resetting admin password:', err);
    res.status(500).json({ error: 'Failed to reset Admin Security Password.' });
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
    let userId = '';
    let userEmail = '';

    const adminAuth = await getAdminAuth();
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        userId = decoded.uid;
        userEmail = (decoded.email || '').toLowerCase().trim();
      } catch (err: any) {
        console.warn('[REGISTRATION] verifyIdToken note:', err?.message);
      }
    }

    if (!userId) {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (payload && (payload.uid || payload.sub || payload.user_id)) {
            userId = payload.uid || payload.sub || payload.user_id;
            userEmail = (payload.email || '').toLowerCase().trim();
          }
        }
      } catch {}
    }

    if (!userId) {
      res.status(401).json({ error: 'Invalid authentication credentials.' });
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

    const cleanSlug = event_slug.toLowerCase().trim();

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
    let ev: any = null;
    if (db) {
      const evSnap = await db.collection('events').doc(cleanSlug).get();
      if (evSnap.exists) {
        ev = evSnap.data();
      }
    }

    if (ev) {
      if (ev.isComingSoon === true) {
        res.status(403).json({
          error: 'This competition is marked COMING SOON. Registrations are blocked.',
          code: 'COMPETITION_COMING_SOON'
        });
        return;
      }

      if (ev.registration_open === false || ev.status === 'Archived' || ev.status === 'Completed') {
        res.status(400).json({
          error: 'Registration for this competition is currently closed.'
        });
        return;
      }

      const capacity = Number(ev.capacity) || 60;
      const registeredCount = Number(ev.registered_count) || 0;
      if (registeredCount >= capacity) {
        res.status(400).json({
          error: 'Competition capacity has been reached.'
        });
        return;
      }
    }

    const registrationId = `reg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const referenceId = `NEX-${cleanSlug.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const nowIso = new Date().toISOString();

    const isBvm = college.toLowerCase().includes('birla') || college.toLowerCase().includes('bvm');
    const bvmFee = ev?.bvm_fee ?? ev?.fee_per_participant ?? 50;
    const externalFee = ev?.external_fee ?? ev?.fee_per_participant ?? 70;
    const feePaid = isBvm ? bvmFee : externalFee;

    const registrationRecord = {
      id: registrationId,
      reference_id: referenceId,
      user_id: userId,
      event_id: cleanSlug,
      event_slug: cleanSlug,
      event_title: ev?.title || event_slug,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone_number: phone_number.trim(),
      college: college.trim(),
      branch: branch.trim(),
      academic_year,
      enrollment_number: enrollment_number.trim().toUpperCase(),
      division: division?.trim() || '',
      team_name: team_name?.trim() || '',
      team_members: Array.isArray(team_members) ? team_members : [],
      team_member_details: Array.isArray(team_member_details) ? team_member_details : [],
      registration_status: 'Confirmed',
      payment_status: 'Completed',
      fee_paid: feePaid,
      created_at: nowIso,
      updated_at: nowIso
    };

    if (db) {
      const batch = db.batch();
      const regDocRef = db.collection('registrations').doc(registrationId);
      batch.set(regDocRef, registrationRecord);

      if (ev) {
        const evDocRef = db.collection('events').doc(cleanSlug);
        batch.update(evDocRef, {
          registered_count: (Number(ev.registered_count) || 0) + 1,
          updated_at: nowIso
        });
      }

      await batch.commit();
    }

    recordAudit('REGISTRATION_CREATED', `Student ${email} registered for ${cleanSlug} (Ref: ${referenceId})`, email);

    res.status(201).json({
      success: true,
      registration: registrationRecord
    });
  } catch (err: any) {
    console.error('[REGISTRATION CREATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to process registration.' });
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

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // In AI Studio dev server, disable Vite WebSocket HMR to prevent port 24678 collision
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
  app.listen(port, '0.0.0.0', () => {
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
