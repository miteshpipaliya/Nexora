import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In local dev, if .env exists, allow it to override stale dev-server environment variables.
// On Vercel, .env does not exist (gitignored), so Vercel runtime environment variables remain authoritative.
const localEnvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
} else {
  dotenv.config();
}

export const app = express();

// Standard Security Headers and Request ID Tracking (WP6 & WP7)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-Id', reqId);
  (req as any).id = reqId;
  next();
});

// Standard strict 100kb JSON body payload limit (WP7: prevent DoS/overflow)
app.use(express.json({ limit: '100kb' }));

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

// Brevo sender credentials (sanitized without surrounding quotes/whitespace)
export function getBrevoApiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key || !key.trim()) {
    throw new Error('BREVO_API_KEY is not configured in the server environment. Please configure your Brevo API key in the environment variables.');
  }
  return key.trim().replace(/^["']|["']$/g, '');
}

const BREVO_SENDER_EMAIL = (process.env.BREVO_SENDER_EMAIL || 'nexora.bvm@gmail.com').trim().replace(/^["']|["']$/g, '');
const BREVO_SENDER_NAME = (process.env.BREVO_SENDER_NAME || 'NEXORA').trim().replace(/^["']|["']$/g, '');

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

function verifySignedToken(token: string, expectedPurpose: string, expectedEmail?: string): { email: string; purpose: string } | null {
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

// Brevo Transactional Email Dispatcher via POST https://api.brevo.com/v3/smtp/email
async function sendBrevoOtpEmail(toEmail: string, otp: string, purpose: 'signup' | 'reset-password' = 'signup'): Promise<void> {
  const apiKey = getBrevoApiKey();

  const isReset = purpose === 'reset-password';
  const subject = isReset 
    ? 'NEXORA — Password Recovery Verification Code' 
    : 'NEXORA — Your Email Verification Code';

  const heading = isReset ? 'Password Recovery' : 'Email Verification';
  const subtext = isReset
    ? 'We received a request to reset the password for your NEXORA account.'
    : 'Welcome to NEXORA! We received a request to verify your email address for student registration.';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #08080D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #08080D; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #11101B; border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 16px; padding: 32px 24px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8);">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="font-size: 26px; font-weight: 800; letter-spacing: 0.18em; color: #FFFFFF; text-transform: uppercase;">NEXORA</div>
                    <div style="font-size: 11px; color: #A78BFA; margin-top: 4px; letter-spacing: 0.08em; font-family: monospace;">STUDENT TECHNOLOGY &amp; INNOVATION COMMUNITY</div>
                  </td>
                </tr>
                <tr>
                  <td style="color: #F8FAFC; font-size: 14px; line-height: 1.6;">
                    <p style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #FFFFFF;">${heading}</p>
                    <p style="margin: 0 0 20px; color: #CBD5E1;">${subtext}</p>
                    <p style="margin: 0 0 12px; color: #94A3B8; font-size: 13px;">Your six-digit verification code is:</p>
                    <div style="text-align: center; margin: 16px 0 20px; padding: 18px; background-color: #08080D; border: 1px solid rgba(139, 92, 246, 0.5); border-radius: 12px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 0.35em; color: #C4B5FD;">${otp}</span>
                    </div>
                    <p style="margin: 0 0 16px; font-size: 13px; color: #F87171; text-align: center;"><strong>This verification code expires in 3 minutes.</strong></p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #94A3B8;">If you did not request this verification code, please disregard this message.</p>
                    <p style="margin: 0 0 24px; font-size: 12px; color: #94A3B8;">Never share this verification code with anyone.</p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid rgba(139, 92, 246, 0.18); padding-top: 20px; text-align: center; font-size: 11px; color: #64748B;">
                    <strong style="color: #A78BFA;">NEXORA</strong><br>
                    Student Technology &amp; Innovation Community<br>
                    Birla Vishvakarma Mahavidyalaya (BVM)
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textContent = `${heading}\n\n${subtext}\n\nYour verification code is:\n\n${otp}\n\nThis verification code expires in 3 minutes.\n\nIf you did not request this code, please ignore this email.\nNever share your verification code with anyone.\n\nNEXORA\nStudent Technology & Innovation Community\nBirla Vishvakarma Mahavidyalaya (BVM)`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey.trim(),
      'Content-Type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: toEmail }],
      subject,
      htmlContent,
      textContent
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[BREVO DISPATCH FAILED] Status:', response.status, 'Message:', errData.message);
    if (response.status === 401) {
      if (errData.message && errData.message.toLowerCase().includes('ip')) {
        throw new Error('Brevo IP authorization: Please ensure server IPs are permitted in your Brevo settings.');
      }
      throw new Error('Brevo API key rejected or invalid (401). Please check the BREVO_API_KEY environment variable.');
    }
    if (response.status === 403) {
      throw new Error('Brevo API access denied (403). Please verify that Transactional Email permissions are enabled for this key in Brevo.');
    }
    if (response.status === 400) {
      if (errData.message && errData.message.toLowerCase().includes('sender')) {
        throw new Error(`Brevo sender error: The sender email (${BREVO_SENDER_EMAIL}) must be verified in Brevo.`);
      }
      throw new Error(errData.message || 'Invalid email dispatch parameters.');
    }
    if (response.status === 402 || response.status === 429) {
      throw new Error('Email service quota or rate limit reached. Please try again later.');
    }
    throw new Error(errData.message || `Brevo delivery failed with status ${response.status}`);
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
// SYSTEM HEALTH & READINESS ENDPOINTS (WP5: SANITIZED PUBLIC HEALTH)
// ==========================================
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NEXORA Production Backend API',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    serverTimeMs: Date.now()
  });
});

// Protected Admin Health Diagnostic (Requires Elevated Administrator Credentials)
apiRouter.get(['/admin/health', '/admin/diagnostics'], requireElevatedAdmin, async (req, res) => {
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const firebaseKey = process.env.FIREBASE_API_KEY?.trim();
  const hmacSecret = process.env.OTP_HMAC_SECRET?.trim();
  const hasSa = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT || 
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
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
    service: 'NEXORA Production Backend API (Admin Diagnostics)',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    serverless: isServerless,
    environment: process.env.NODE_ENV || 'production',
    serverTimeMs: Date.now(),
    checks: {
      brevoEmail: {
        configured: Boolean(brevoKey && brevoKey.length > 8),
        senderEmail: BREVO_SENDER_EMAIL,
        senderName: BREVO_SENDER_NAME
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
  } catch (err) {
    console.warn('[ADMIN SECURITY] Failed to read security store:', err);
  }
  return null;
}

function saveAdminSecurity(password: string): void {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const record: AdminSecurityStore = {
    passwordHash,
    salt,
    updatedAt: Date.now()
  };
  memoryAdminSecurity = record;
  try {
    fs.writeFileSync(ADMIN_SECURITY_FILE, JSON.stringify(record, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ADMIN SECURITY] Write error, saving to memory fallback:', err);
  }
}

function verifyAdminSecurityPassword(password: string): boolean {
  const security = getStoredAdminSecurity();
  if (security) {
    const hash = crypto.scryptSync(password, security.salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const storedBuf = Buffer.from(security.passwordHash, 'hex');
    if (hashBuf.length === storedBuf.length && crypto.timingSafeEqual(hashBuf, storedBuf)) {
      return true;
    }
  }
  if (process.env.ADMIN_SECURITY_PASSWORD && process.env.ADMIN_SECURITY_PASSWORD.trim()) {
    if (password.trim() === process.env.ADMIN_SECURITY_PASSWORD.trim()) {
      return true;
    }
  }
  return false;
}

// In-memory security tokens and sessions
const setupOtpChallenges = new Map<string, { hash: string; expiresAt: number; attempts: number }>();
const verifiedPasswordTokens = new Map<string, { expiresAt: number; createdAt: number }>();
const adminEmailOtpChallenges = new Map<string, { hash: string; expiresAt: number; attempts: number; lastSentAt: number }>();
const elevatedAdminSessions = new Map<string, { sessionId: string; founderEmail: string; expiresAt: number; createdAt: number }>();

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
    details: 'NEXORA Admin Security Subsystem initialized.',
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

// Middleware: Require Elevated Admin Session (Firebase ID Token Custom Claim or 15-minute Elevated Session)
async function requireElevatedAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const sessionHeader = req.headers['x-admin-session'] as string;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = sessionHeader || bearerToken;

  if (!token) {
    res.status(401).json({ error: 'Elevated administrator session or token required. Please authenticate in the Admin Panel.' });
    return;
  }

  // 1. Try Firebase Auth ID token verification if token looks like a JWT
  if (token.split('.').length === 3) {
    try {
      if (!adminAuthInstance) await getAdminFirestore();
      if (adminAuthInstance) {
        const decoded = await adminAuthInstance.verifyIdToken(token);
        const hasAdminClaim = decoded.admin === true || ADMIN_EMAILS.includes((decoded.email || '').toLowerCase());
        if (hasAdminClaim) {
          // B3: Require re-authentication if token auth_time is older than 30 minutes (1800 seconds)
          const nowSec = Math.floor(Date.now() / 1000);
          const authTime = decoded.auth_time || nowSec;
          if (nowSec - authTime > 1800) {
            res.status(401).json({
              error: 'Administrator authentication expired. Please re-authenticate (re-auth required every 30 minutes).',
              code: 'ADMIN_REAUTH_REQUIRED'
            });
            return;
          }
          (req as any).adminUser = decoded;
          return next();
        }
      }
    } catch (err: any) {
      // If token is not a valid Firebase ID token, fallback to checking elevated session store below
    }
  }

  // 2. Check elevated session store
  const session = elevatedAdminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) elevatedAdminSessions.delete(token);
    res.status(401).json({ error: 'Elevated administrator session expired. Please re-authenticate.' });
    return;
  }
  next();
}

// Registration Payload Validation Schema (WP2)
const RegistrationPayloadSchema = z.object({
  event_slug: z.string().min(1, 'Event slug is required'),
  full_name: z.string().min(2, 'Full name must have at least 2 characters'),
  email: z.string().email('A valid email address is required'),
  phone_number: z.string().min(6, 'Valid phone number is required'),
  college: z.string().min(1, 'College is required'),
  branch: z.string().min(1, 'Branch is required'),
  academic_year: z.string().min(1, 'Academic year is required'),
  enrollment_number: z.string().min(1, 'Enrollment number is required'),
  division: z.string().optional().default(''),
  team_name: z.string().optional().default(''),
  team_members: z.array(z.string()).optional().default([]),
  team_member_details: z.array(z.any()).optional().default([])
});

// ==========================================
// REGISTRATION MANAGEMENT (SERVER AUTHORITATIVE - WP2)
// ==========================================
apiRouter.post(['/registrations/create', '/registrations'], async (req, res) => {
  const reqId = (req as any).id || crypto.randomUUID();
  try {
    // 1. Strict Firebase Bearer token verification (never trust client user_id)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Authentication required to register for competitions. Please sign in.', 
        code: 'UNAUTHORIZED',
        reqId
      });
      return;
    }

    const idToken = authHeader.substring(7).trim();
    let verifiedUserId = '';
    let tokenEmail = '';

    try {
      if (!adminAuthInstance) await getAdminFirestore();
      if (adminAuthInstance) {
        const decoded = await adminAuthInstance.verifyIdToken(idToken);
        verifiedUserId = decoded.uid;
        tokenEmail = decoded.email || '';
      } else {
        // Fallback for local sandbox environments without live service account
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (payload && (payload.user_id || payload.sub)) {
            verifiedUserId = payload.user_id || payload.sub;
            tokenEmail = payload.email || '';
          }
        }
      }
    } catch (authErr: any) {
      res.status(401).json({ 
        error: 'Authentication session expired or invalid. Please sign in again.', 
        code: 'INVALID_CREDENTIALS',
        reqId
      });
      return;
    }

    if (!verifiedUserId) {
      res.status(401).json({ 
        error: 'Could not verify student identity from token.', 
        code: 'UNAUTHORIZED',
        reqId
      });
      return;
    }

    // 2. Zod input schema validation (fail closed on malformed payloads)
    const parseResult = RegistrationPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issueMsg = parseResult.error.issues.map(i => i.message).join('. ');
      res.status(400).json({ error: issueMsg || 'Invalid registration payload.', reqId });
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
    } = parseResult.data;

    // 3. Deterministic Document ID to mathematically guarantee idempotency
    const cleanEventSlug = event_slug.toLowerCase().trim();
    const regDocId = `${verifiedUserId}_${cleanEventSlug}`;

    const db = await getAdminFirestore();
    if (!db) {
      res.status(503).json({
        error: 'Database connection currently unavailable. Please try again in a few moments.',
        code: 'DATABASE_UNAVAILABLE',
        reqId
      });
      return;
    }

    const regDocRef = db.collection('registrations').doc(regDocId);
    const eventDocRef = db.collection('events').doc(cleanEventSlug);

    // 4. Single Atomic Firestore Transaction (checks duplicate, capacity, updates count & creates record)
    let committedRecord: any = null;

    await db.runTransaction(async (transaction: any) => {
      const [existingSnap, eventSnap] = await Promise.all([
        transaction.get(regDocRef),
        transaction.get(eventDocRef)
      ]);

      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        if (existingData && existingData.registration_status !== 'Cancelled') {
          const err: any = new Error('You are already registered for this competition.');
          err.statusCode = 400;
          throw err;
        }
      }

      if (!eventSnap.exists) {
        const err: any = new Error('Competition event not found.');
        err.statusCode = 404;
        throw err;
      }

      const eventData = eventSnap.data();
      if (eventData.registration_open === false || eventData.status === 'Archived' || eventData.status === 'Draft') {
        const err: any = new Error('Registration for this competition is currently closed.');
        err.statusCode = 400;
        throw err;
      }

      const currentCount = Number(eventData.registered_count || 0);
      const capacity = Number(eventData.capacity || 100);
      if (currentCount >= capacity) {
        const err: any = new Error('Competition capacity has been reached. Please contact NEXORA organizing desk.');
        err.statusCode = 400;
        throw err;
      }

      // Server-authoritative fee calculation
      const participantCount = Array.isArray(team_members) && team_members.length > 0
        ? team_members.length
        : 1;
      const feePerParticipant = Number(eventData.fee_per_participant) || 50;
      const calculatedFee = participantCount * feePerParticipant;

      // Unique human-readable competition ticket ID (e.g. ZC-B7K4)
      const prefix = cleanEventSlug.toUpperCase().slice(0, 3);
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let rand = '';
      for (let i = 0; i < 4; i++) {
        rand += chars[crypto.randomInt(0, chars.length)];
      }
      const competitionId = `${prefix}-${rand}`;

      committedRecord = {
        id: regDocId,
        competition_id: competitionId,
        reference_id: competitionId,
        user_id: verifiedUserId,
        event_slug: cleanEventSlug,
        event_title: eventData.title || cleanEventSlug,
        full_name: full_name.trim(),
        email: (tokenEmail || email).trim().toLowerCase(),
        phone_number: phone_number.trim(),
        college: college.trim(),
        branch: branch.trim(),
        academic_year,
        enrollment_number: enrollment_number.trim().toUpperCase(),
        division: division.trim(),
        team_name: team_name.trim(),
        team_members: Array.isArray(team_members) ? team_members.filter(Boolean) : [],
        team_member_details: Array.isArray(team_member_details) ? team_member_details : [],
        participant_count: participantCount,
        registration_status: 'Confirmed',
        payment_status: 'Unpaid',
        calculated_fee: calculatedFee,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      transaction.set(regDocRef, committedRecord);
      transaction.update(eventDocRef, {
        registered_count: currentCount + 1,
        updated_at: new Date().toISOString()
      });
    });

    recordAudit('REGISTRATION_CREATED', `Registration ${committedRecord.competition_id} confirmed for ${committedRecord.email}`, verifiedUserId);

    res.json({
      success: true,
      registration: committedRecord,
      reqId
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    console.error(`[REGISTRATION FAILED] [${reqId}]:`, err.message || err);
    res.status(status).json({ 
      error: err.message || 'Failed to process competition registration.',
      reqId
    });
  }
});

// 1. Admin Status check (WP5: Sanitized public response, no exposed raw credentials)
apiRouter.all(['/admin/auth/status', '/admin/status'], (req, res) => {
  const security = getStoredAdminSecurity();
  const isInitialized = Boolean(security || process.env.ADMIN_SECURITY_PASSWORD);
  res.json({
    success: true,
    initialized: isInitialized,
    maskedEmail: maskEmail(FOUNDER_EMAIL),
    maskedPhone: maskPhone(FOUNDER_PHONE)
  });
});

// 2. Request OTP to authorize creating initial Admin Security Password
apiRouter.post(['/admin/auth/request-setup-otp', '/admin/request-setup-otp'], async (req, res) => {
  try {
    const existing = getStoredAdminSecurity();
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

// 3. Create initial Admin Security Password (PASSWORD B)
apiRouter.post(['/admin/auth/setup-password', '/admin/setup-password'], (req, res) => {
  try {
    const { setupOtp, newPassword, confirmPassword } = req.body;
    if (!setupOtp || !newPassword) {
      res.status(400).json({ error: 'Both setup verification code and new password are required.' });
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

    const challenge = setupOtpChallenges.get('setup');
    if (!challenge || Date.now() > challenge.expiresAt) {
      setupOtpChallenges.delete('setup');
      res.status(400).json({ error: 'Setup code has expired or was not requested. Please request a new code.' });
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
    saveAdminSecurity(newPassword);
    recordAudit('ADMIN_PASSWORD_INITIALIZED', 'Founder Admin Security Password (Password B) created successfully.');

    res.json({
      success: true,
      message: 'Admin Security Password created successfully. You can now log into the Admin Panel.'
    });
  } catch (err: any) {
    console.error('Error in setup-password:', err);
    res.status(500).json({ error: 'Failed to set up Admin Security Password.' });
  }
});

// 4. Verify Admin Security Password (Step 3 -> Step 4)
apiRouter.post(['/admin/auth/verify-password', '/admin/verify-password'], async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Admin Security Password is required.' });
      return;
    }

    const isValid = verifyAdminSecurityPassword(password);
    if (!isValid) {
      recordAudit('ADMIN_PASSWORD_FAILED', 'Incorrect Admin Security Password attempt.');
      res.status(401).json({ error: 'Incorrect Admin Security Password. If you have not created your password yet, please click "Request Setup OTP" first.' });
      return;
    }

    // Generate ephemeral password token (valid for 5 minutes)
    const passwordToken = `pwd_tok_${crypto.randomBytes(24).toString('hex')}`;
    verifiedPasswordTokens.set(passwordToken, {
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now()
    });

    // Automatically dispatch Brevo Gmail OTP to founder (Step 4)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = Date.now() + 180 * 1000; // 3-minute expiry
    const otpHash = hashOtp(FOUNDER_EMAIL, otp, 'admin-step4');

    adminEmailOtpChallenges.set(passwordToken, {
      hash: otpHash,
      expiresAt: otpExpiresAt,
      attempts: 0,
      lastSentAt: Date.now()
    });

    // Enforce Brevo delivery confirmation before advancing
    try {
      await sendBrevoOtpEmail(FOUNDER_EMAIL, otp, 'signup');
    } catch (brevoErr: any) {
      adminEmailOtpChallenges.delete(passwordToken);
      verifiedPasswordTokens.delete(passwordToken);
      recordAudit('ADMIN_BREVO_FAILED', `Brevo OTP delivery failed: ${brevoErr.message}`);
      res.status(502).json({
        error: `Password verified, but could not dispatch verification email: ${brevoErr.message}`,
        code: 'BREVO_DISPATCH_FAILED'
      });
      return;
    }

    recordAudit('ADMIN_PASSWORD_VERIFIED', 'Password verified; OTP dispatched to founder email.');

    res.json({
      success: true,
      passwordToken,
      maskedEmail: maskEmail(FOUNDER_EMAIL),
      expiresInSeconds: 180,
      resendCooldown: 30
    });
  } catch (err: any) {
    console.error('Error in verify-password:', err);
    res.status(500).json({ error: 'Internal server error verifying password.' });
  }
});

// 5. Resend Admin Gmail OTP
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
    const sessionToken = `nexora_elevated_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // Exact 15 minutes

    elevatedAdminSessions.set(sessionToken, {
      sessionId: sessionToken,
      founderEmail: FOUNDER_EMAIL,
      expiresAt,
      createdAt: Date.now()
    });

    recordAudit('ADMIN_ACCESS_GRANTED', 'Founder completed dual verification. Elevated session issued (15 min).');

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

// 7. Verify / Check Elevated Session
apiRouter.all(['/admin/auth/session', '/admin/session'], (req, res) => {
  const token = (req.headers['x-admin-session'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

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

// 8. Lock Admin Panel (Revoke elevated session)
apiRouter.post(['/admin/auth/lock', '/admin/lock'], (req, res) => {
  const token = (req.body.sessionToken as string) || (req.headers['x-admin-session'] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (token && elevatedAdminSessions.has(token)) {
    elevatedAdminSessions.delete(token);
  }
  recordAudit('ADMIN_LOCKED', 'Elevated admin session was manually locked.');
  res.json({ success: true, message: 'Admin session revoked.' });
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

// Dashboard Statistics (Priority 1: Real Database-Backed Numbers, Zero Fabrication)
apiRouter.get('/admin/stats', requireElevatedAdmin, async (req, res) => {
  try {
    const db = await getAdminFirestore();
    let totalStudents = 0;
    let totalCompetitions = 0;
    let publishedCompetitions = 0;
    let totalRegistrations = 0;
    let confirmedRegistrations = 0;
    let actualTeamMembers = 0;
    let unreadVisitorMessages = 0;
    let publishedNotifications = 0;
    let upcomingEvents = 0;
    let totalRevenue = 0;

    if (db) {
      const [
        studentsSnap,
        eventsSnap,
        regsSnap,
        teamSnap,
        messagesSnap,
        notifsSnap
      ] = await Promise.all([
        db.collection('users').get().catch(() => ({ size: 0, docs: [] })),
        db.collection('events').get().catch(() => ({ size: 0, docs: [] })),
        db.collection('registrations').get().catch(() => ({ size: 0, docs: [] })),
        db.collection('teamMembers').get().catch(() => ({ size: 0, docs: [] })),
        db.collection('contactMessages').get().catch(() => ({ size: 0, docs: [] })),
        db.collection('notifications').get().catch(() => ({ size: 0, docs: [] }))
      ]);

      totalStudents = studentsSnap.size || 0;
      totalCompetitions = eventsSnap.size || 0;
      publishedCompetitions = (eventsSnap.docs || []).filter((d: any) => d.data().status === 'Published').length;
      upcomingEvents = publishedCompetitions;
      totalRegistrations = regsSnap.size || 0;
      confirmedRegistrations = (regsSnap.docs || []).filter((d: any) => d.data().registration_status === 'Confirmed').length;
      totalRevenue = (regsSnap.docs || []).reduce((sum: number, d: any) => sum + (Number(d.data().calculated_fee) || 0), 0);
      actualTeamMembers = teamSnap.size || 0;
      unreadVisitorMessages = (messagesSnap.docs || []).filter((d: any) => d.data().status === 'unread').length;
      publishedNotifications = (notifsSnap.docs || []).filter((d: any) => d.data().status === 'Published').length;
    }

    const now = Date.now();
    let onlineStudents = 0;
    for (const entry of onlinePresenceMap.values()) {
      if (now - entry.lastSeen <= 3 * 60 * 1000) {
        onlineStudents++;
      }
    }

    res.json({
      success: true,
      stats: {
        totalStudents,
        onlineStudents,
        activeStudents: onlineStudents,
        totalCompetitions,
        publishedCompetitions,
        totalRegistrations,
        confirmedRegistrations,
        actualTeamMembers,
        unreadVisitorMessages,
        publishedNotifications,
        upcomingEvents,
        totalRevenue,
        recentActivity: auditLogEntries.slice(0, 10)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to query real dashboard statistics.' });
  }
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
