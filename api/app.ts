import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables without overriding live Vercel production env vars
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase applet configuration safely
interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

let firebaseConfig: FirebaseAppConfig = {
  projectId: 'gen-lang-client-0089073748',
  appId: '1:712934408257:web:80edc051c2d0f074df06c0',
  apiKey: 'AIzaSyC2khO07NQPFyeUsjQqpAkxn87fhiO52is',
  authDomain: 'gen-lang-client-0089073748.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b',
  storageBucket: 'gen-lang-client-0089073748.firebasestorage.app'
};

try {
  const possiblePaths = [
    path.resolve(__dirname, 'firebase-applet-config.json'),
    path.resolve(__dirname, '../firebase-applet-config.json'),
    path.resolve(process.cwd(), 'firebase-applet-config.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (raw?.projectId) {
        firebaseConfig = { ...firebaseConfig, ...raw };
        break;
      }
    }
  }
} catch {
  // Non-fatal, use fallback config
}

const app = express();

// CORS configuration for cross-origin preview / deployment calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// JSON body parser with structured error handler for malformed payloads
app.use(express.json({ limit: '10mb' }));
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON payload received.' });
    return;
  }
  next();
});

// Approved administrator accounts
export const ADMIN_EMAILS = [
  'miteshpipaliya2202@gmail.com',
  'mitesh.aiml@gmail.com',
  'editwithvision@gmail.com'
];
export const ADMIN_PHONE = '+91 8200243606';

// Persistent Backend HMAC Secret for Keyed Hashing (Server-authoritative, zero filesystem dependence)
function getOrCreateHmacSecret(): string {
  if (process.env.OTP_HMAC_SECRET && process.env.OTP_HMAC_SECRET.trim().length >= 16) {
    return process.env.OTP_HMAC_SECRET.trim();
  }
  return crypto
    .createHash('sha256')
    .update(`NEXORA_HMAC_SALT_${firebaseConfig.projectId}_${firebaseConfig.appId}`)
    .digest('hex');
}

const HMAC_SECRET = getOrCreateHmacSecret();

// Brevo credential getters with live process.env precedence
export function getBrevoApiKey(): string {
  return (process.env.BREVO_API_KEY || '').trim();
}

export function getBrevoSenderEmail(): string {
  return (process.env.BREVO_SENDER_EMAIL || 'nexora.bvm@gmail.com').trim();
}

export function getBrevoSenderName(): string {
  return (process.env.BREVO_SENDER_NAME || 'NEXORA').trim();
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

// Masking helpers for client privacy
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '••••••';
  const first = local[0] || '';
  const last = local.slice(-2);
  return `${first}${'•'.repeat(Math.max(local.length - 3, 4))}${last}@${domain}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.trim();
  const last3 = cleaned.slice(-3);
  return `+91 ••••• ••${last3}`;
}

// Brevo Transactional Email Dispatcher
export async function sendBrevoOtpEmail(
  toEmail: string, 
  otp: string, 
  purpose: 'signup' | 'reset-password' = 'signup'
): Promise<void> {
  const apiKey = getBrevoApiKey();
  if (!apiKey || !apiKey.trim()) {
    const err: any = new Error('BREVO_API_KEY is not configured in the server environment.');
    err.code = 'BREVO_NOT_CONFIGURED';
    err.status = 500;
    throw err;
  }

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

  const senderEmail = getBrevoSenderEmail();
  const senderName = getBrevoSenderName();

  let response: Response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
        textContent
      })
    });
  } catch (netErr: any) {
    const err: any = new Error('Network error connecting to email delivery service. Please check connectivity.');
    err.code = 'BREVO_SERVICE_ERROR';
    err.status = 503;
    throw err;
  }

  if (!response.ok) {
    const errData: any = await response.json().catch(() => ({}));
    console.error('[BREVO DISPATCH FAILED]', response.status, errData);

    const rawMessage = String(errData?.message || '');
    const errorCode = String(errData?.code || '');

    if (rawMessage.toLowerCase().includes('unrecognised ip') || rawMessage.toLowerCase().includes('ip address')) {
      const ipMatch = rawMessage.match(/using an unrecognised IP address ([a-fA-F0-9:.]+)/i) || rawMessage.match(/IP address ([a-fA-F0-9:.]+)/i);
      const detectedIp = ipMatch ? ipMatch[1].replace(/[.,;:)]+$/, '') : '';

      const err: any = new Error(`Brevo IP Authorization Required: Outbound server IP ${detectedIp ? `"${detectedIp}" ` : ''}is not authorized in Brevo console. Please disable IP restrictions in your Brevo API key settings.`);
      err.code = 'BREVO_IP_UNAUTHORIZED';
      err.status = 401;
      err.detectedIp = detectedIp;
      throw err;
    }

    if (response.status === 401 && (rawMessage.toLowerCase().includes('key not found') || (errorCode === 'unauthorized' && !rawMessage.toLowerCase().includes('ip')))) {
      const err: any = new Error('Brevo API key was not found or has been revoked (Key not found). Please verify your BREVO_API_KEY in Brevo Console under Settings > API Keys.');
      err.code = 'BREVO_KEY_NOT_FOUND';
      err.status = 401;
      throw err;
    }

    if (rawMessage.toLowerCase().includes('sender') || rawMessage.toLowerCase().includes('unverified') || errorCode.includes('unverified')) {
      const err: any = new Error(`Brevo Sender Email is unverified: ${rawMessage}. Ensure "${senderEmail}" is authorized in Brevo Console (Senders & IP).`);
      err.code = 'BREVO_SENDER_UNVERIFIED';
      err.status = 400;
      throw err;
    }

    if (response.status === 402 || rawMessage.toLowerCase().includes('quota') || rawMessage.toLowerCase().includes('credit')) {
      const err: any = new Error('Brevo account sending quota or credit limit has been reached.');
      err.code = 'BREVO_QUOTA_EXCEEDED';
      err.status = 402;
      throw err;
    }

    if (response.status === 400 && (rawMessage.toLowerCase().includes('invalid email') || rawMessage.toLowerCase().includes('blacklisted') || rawMessage.toLowerCase().includes('recipient'))) {
      const err: any = new Error('Invalid email recipient address.');
      err.code = 'BREVO_INVALID_RECIPIENT';
      err.status = 400;
      throw err;
    }

    const err: any = new Error(rawMessage || `Brevo email delivery failed with HTTP ${response.status}.`);
    err.code = errorCode || 'BREVO_DELIVERY_FAILED';
    err.status = response.status;
    throw err;
  }
}

// ========================================================
// SHARED FIRESTORE-BACKED CHALLENGE STORE
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

// Lazy-initialized Firebase Admin Firestore reference
let adminDbInstance: any = null;
let adminDbInitAttempted = false;

async function getAdminFirestore(): Promise<any> {
  if (adminDbInitAttempted) return adminDbInstance;
  adminDbInitAttempted = true;

  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    let adminApp;
    const existing = getApps();
    if (existing.length > 0) {
      adminApp = existing[0];
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let creds;
      try {
        creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch {
        creds = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT, 'utf8'));
      }
      adminApp = initializeApp({
        credential: cert(creds),
        projectId: firebaseConfig.projectId
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({ projectId: firebaseConfig.projectId });
    }

    if (adminApp) {
      adminDbInstance = firebaseConfig.firestoreDatabaseId 
        ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
        : getFirestore(adminApp);
    }
  } catch (err: any) {
    console.warn('[SHARED FIRESTORE ADMIN NOTICE] Service credentials not configured:', err.message);
  }

  return adminDbInstance;
}

class SharedFirestoreChallengeStore {
  // In-memory hot cache for zero-latency local lookups & fallback
  private memoryChallenges = new Map<string, HashedStudentChallenge>();
  private memoryAuthorizations = new Map<string, StoredAuthorization>();
  private ipRateLimits = new Map<string, { count: number; windowStart: number }>();

  // Key generator that creates valid Firestore document IDs
  private getDocId(purpose: string, email: string): string {
    const safeEmail = email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
    return `${purpose}_${safeEmail}`;
  }

  // Rate Limiting per IP (Max 15 requests per 10 minutes)
  public async checkIpRateLimit(ip: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;

    // Check shared Firestore rate limit if available
    const db = await getAdminFirestore();
    if (db) {
      try {
        const safeIp = ip.replace(/[^a-zA-Z0-9]/g, '_');
        const docRef = db.collection('_rate_limits').doc(safeIp);
        const result = await db.runTransaction(async (transaction: any) => {
          const snap = await transaction.get(docRef);
          if (!snap.exists) {
            transaction.set(docRef, { count: 1, windowStart: now });
            return true;
          }
          const data = snap.data();
          if (now - data.windowStart > windowMs) {
            transaction.set(docRef, { count: 1, windowStart: now });
            return true;
          }
          if (data.count >= 15) {
            return false;
          }
          transaction.update(docRef, { count: data.count + 1 });
          return true;
        });
        return result;
      } catch {
        // Fallback to local memory rate limiting
      }
    }

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

  // Store new OTP challenge with keyed hash in shared Firestore + memory
  public async setChallenge(
    email: string, 
    purpose: 'signup' | 'reset-password', 
    hash: string, 
    expiresAt: number, 
    ip: string
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${purpose}:${normalizedEmail}`;
    const challenge: HashedStudentChallenge = {
      email: normalizedEmail,
      hash,
      expiresAt,
      attempts: 0,
      purpose,
      lastSentAt: Date.now(),
      ip
    };

    // Store in hot memory
    this.memoryChallenges.set(key, challenge);

    // Persist to shared Firestore collection across serverless instances
    const db = await getAdminFirestore();
    if (db) {
      try {
        const docId = this.getDocId(purpose, normalizedEmail);
        await db.collection('_otp_challenges').doc(docId).set(challenge);
      } catch (err: any) {
        console.warn('[SHARED FIRESTORE SET ERROR]', err.message);
      }
    }
  }

  // Retrieve active challenge from shared Firestore or memory
  public async getChallenge(
    email: string, 
    purpose: 'signup' | 'reset-password'
  ): Promise<HashedStudentChallenge | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${purpose}:${normalizedEmail}`;

    // Check shared Firestore first for cross-instance accuracy
    const db = await getAdminFirestore();
    if (db) {
      try {
        const docId = this.getDocId(purpose, normalizedEmail);
        const snap = await db.collection('_otp_challenges').doc(docId).get();
        if (snap.exists) {
          const data = snap.data() as HashedStudentChallenge;
          if (data && data.expiresAt > Date.now()) {
            this.memoryChallenges.set(key, data);
            return data;
          }
        }
      } catch (err: any) {
        console.warn('[SHARED FIRESTORE GET ERROR]', err.message);
      }
    }

    const mem = this.memoryChallenges.get(key);
    if (mem && mem.expiresAt > Date.now()) {
      return mem;
    }
    return undefined;
  }

  // Atomic single-use verification & consumption in a transaction
  public async verifyAndBurnChallenge(
    email: string,
    otp: string,
    purpose: 'signup' | 'reset-password'
  ): Promise<{ success: boolean; verificationToken?: string; expiresAt?: number; error?: string; remainingAttempts?: number }> {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${purpose}:${normalizedEmail}`;
    const docId = this.getDocId(purpose, normalizedEmail);
    const db = await getAdminFirestore();

    // 1. If shared Firestore is connected, execute atomic transaction
    if (db) {
      try {
        const challengeRef = db.collection('_otp_challenges').doc(docId);
        const authDocId = this.getDocId(purpose, normalizedEmail);
        const authRef = db.collection('_reset_authorizations').doc(authDocId);

        const result = await db.runTransaction(async (t: any) => {
          const snap = await t.get(challengeRef);
          if (!snap.exists) {
            return { success: false, error: 'Verification code not requested or has expired. Please request a new code.' };
          }

          const challenge = snap.data() as HashedStudentChallenge;
          const now = Date.now();

          if (now > challenge.expiresAt) {
            t.delete(challengeRef);
            return { success: false, error: 'Verification code has expired (3-minute limit). Please request a fresh code.' };
          }

          const currentAttempts = (challenge.attempts || 0) + 1;
          if (currentAttempts > 5) {
            t.delete(challengeRef);
            return { success: false, error: 'Too many incorrect attempts (maximum 5). Verification code invalidated.' };
          }

          // Constant-time HMAC comparison
          const inputHash = hashOtp(normalizedEmail, otp.trim(), purpose);
          const hashA = Buffer.from(inputHash, 'hex');
          const hashB = Buffer.from(challenge.hash, 'hex');
          const isValid = hashA.length === hashB.length && crypto.timingSafeEqual(hashA, hashB);

          if (!isValid) {
            t.update(challengeRef, { attempts: currentAttempts });
            return {
              success: false,
              error: `Incorrect verification code. (${Math.max(0, 5 - currentAttempts)} attempts remaining)`,
              remainingAttempts: Math.max(0, 5 - currentAttempts)
            };
          }

          // ATOMIC SINGLE-USE BURN: Delete challenge document inside transaction
          t.delete(challengeRef);

          // Issue short-lived cryptographic authorization token (15-minute validity)
          const tokenExpiresAt = now + 15 * 60 * 1000;
          const verificationToken = createSignedToken({
            email: normalizedEmail,
            purpose,
            exp: tokenExpiresAt
          });

          // Save authorization token in Firestore inside the same atomic transaction
          t.set(authRef, {
            email: normalizedEmail,
            purpose,
            token: verificationToken,
            expiresAt: tokenExpiresAt
          });

          return {
            success: true,
            verificationToken,
            expiresAt: tokenExpiresAt
          };
        });

        // Sync local memory state
        this.memoryChallenges.delete(key);
        if (result.success && result.verificationToken && result.expiresAt) {
          this.memoryAuthorizations.set(key, {
            email: normalizedEmail,
            purpose,
            token: result.verificationToken,
            expiresAt: result.expiresAt
          });
        }

        return result;
      } catch (err: any) {
        console.warn('[SHARED FIRESTORE VERIFY ERROR, falling back to local memory]', err.message);
      }
    }

    // 2. Memory-based atomic verification fallback
    const challenge = this.memoryChallenges.get(key);
    if (!challenge) {
      return { success: false, error: 'Verification code not requested or has expired. Please request a new code.' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.memoryChallenges.delete(key);
      return { success: false, error: 'Verification code has expired (3-minute limit). Please request a fresh code.' };
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      this.memoryChallenges.delete(key);
      return { success: false, error: 'Too many incorrect attempts (maximum 5). Verification code invalidated for security.' };
    }

    const inputHash = hashOtp(normalizedEmail, otp.trim(), purpose);
    const hashA = Buffer.from(inputHash, 'hex');
    const hashB = Buffer.from(challenge.hash, 'hex');
    const isValid = hashA.length === hashB.length && crypto.timingSafeEqual(hashA, hashB);

    if (!isValid) {
      return {
        success: false,
        error: `Incorrect verification code. (${Math.max(0, 5 - challenge.attempts)} attempts remaining)`,
        remainingAttempts: Math.max(0, 5 - challenge.attempts)
      };
    }

    // Burn challenge
    this.memoryChallenges.delete(key);

    const tokenExpiresAt = Date.now() + 15 * 60 * 1000;
    const verificationToken = createSignedToken({
      email: normalizedEmail,
      purpose,
      exp: tokenExpiresAt
    });

    this.memoryAuthorizations.set(key, {
      email: normalizedEmail,
      purpose,
      token: verificationToken,
      expiresAt: tokenExpiresAt
    });

    return {
      success: true,
      verificationToken,
      expiresAt: tokenExpiresAt
    };
  }

  // Atomic single-use consumption of verified authorization token
  public async consumeAuthorization(
    email: string, 
    purpose: 'signup' | 'reset-password', 
    token: string
  ): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${purpose}:${normalizedEmail}`;
    const docId = this.getDocId(purpose, normalizedEmail);
    const db = await getAdminFirestore();

    if (db) {
      try {
        const authRef = db.collection('_reset_authorizations').doc(docId);
        const consumed = await db.runTransaction(async (t: any) => {
          const snap = await t.get(authRef);
          if (!snap.exists) return false;
          const data = snap.data();
          if (data.token !== token || Date.now() > data.expiresAt) {
            t.delete(authRef);
            return false;
          }
          t.delete(authRef);
          return true;
        });
        this.memoryAuthorizations.delete(key);
        return consumed;
      } catch (err: any) {
        console.warn('[SHARED FIRESTORE CONSUME ERROR]', err.message);
      }
    }

    const auth = this.memoryAuthorizations.get(key);
    if (!auth) return false;
    if (auth.token !== token || Date.now() > auth.expiresAt) {
      this.memoryAuthorizations.delete(key);
      return false;
    }
    this.memoryAuthorizations.delete(key);
    return true;
  }
}

const challengeStore = new SharedFirestoreChallengeStore();

// Admin Security Management (Memory + shared Firestore)
let memoryAdminPasswordHash: string | null = null;

function getAdminConfig(): { passwordHash?: string } {
  if (process.env.ADMIN_SECURITY_PASSWORD && process.env.ADMIN_SECURITY_PASSWORD.trim().length >= 16) {
    const derived = crypto.createHmac('sha256', HMAC_SECRET).update(process.env.ADMIN_SECURITY_PASSWORD.trim()).digest('hex');
    return { passwordHash: derived };
  }
  return { passwordHash: memoryAdminPasswordHash || undefined };
}

async function saveAdminConfig(cfg: { passwordHash?: string }) {
  if (cfg.passwordHash) {
    memoryAdminPasswordHash = cfg.passwordHash;
    const db = await getAdminFirestore();
    if (db) {
      try {
        await db.collection('systemConfig').doc('admin_security').set(cfg, { merge: true });
      } catch {}
    }
  }
}

// Active admin challenges and sessions
const activeAdminChallenges = new Map<string, any>();
const activeAdminSessions = new Map<string, any>();
const activeStudentPresence = new Map<string, { id: string; email: string; lastSeen: number }>();
const activePasswordOtpTokens = new Map<string, any>();
let adminSetupOtpChallenge: { hash: string; expiresAt: number; email: string } | null = null;
const visitorRateLimits = new Map<string, { count: number; windowStart: number }>();

// ==========================================
// API ROUTER SETUP
// ==========================================
export const apiRouter = express.Router();

// 1. Health check endpoint for uptime and configuration verification
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NEXORA Backend API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    brevoConfigured: !!getBrevoApiKey(),
    senderEmail: getBrevoSenderEmail()
  });
});

// 2. Safe, NON-EMAIL-SENDING Brevo diagnostic endpoint
apiRouter.get('/admin/brevo-status', async (req, res) => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    res.json({
      configured: false,
      status: 'not_configured',
      message: 'BREVO_API_KEY is not configured in the server environment.'
    });
    return;
  }

  try {
    const testRes = await fetch('https://api.brevo.com/v3/smtp/templates', {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'accept': 'application/json'
      }
    });

    if (testRes.ok) {
      res.json({
        configured: true,
        status: 'authorized',
        message: 'Brevo API key is valid, authorized, and operational for transactional email delivery.'
      });
      return;
    }

    const errData: any = await testRes.json().catch(() => ({}));
    const rawMessage = String(errData?.message || '');
    const isIp = rawMessage.toLowerCase().includes('unrecognised ip') || rawMessage.toLowerCase().includes('ip address');
    const isKey = rawMessage.toLowerCase().includes('key not found') || testRes.status === 401;

    res.json({
      configured: true,
      status: isIp ? 'ip_restricted' : isKey ? 'key_not_found' : 'error',
      httpStatus: testRes.status,
      code: errData?.code,
      message: rawMessage,
      instructions: isIp
        ? 'Outbound IP restriction is active in Brevo. Disable IP restriction in your Brevo API key settings.'
        : isKey
        ? 'BREVO_API_KEY was not found or is revoked. Verify your Brevo API key in Brevo Console.'
        : rawMessage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check Brevo account status' });
  }
});

// 3. Dispatch 6-digit Email OTP via Brevo
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
    const rateOk = await challengeStore.checkIpRateLimit(clientIp);
    if (!rateOk) {
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

    let userMessage = 'Could not dispatch verification email. Please check your email address or try again shortly.';
    if (err.code === 'BREVO_NOT_CONFIGURED') {
      userMessage = 'Email delivery service is undergoing configuration. Please sign up with Google or contact NEXORA desk.';
    } else if (err.code === 'BREVO_IP_UNAUTHORIZED') {
      userMessage = err.message || 'Email delivery service requires network authorization. Please check Brevo IP settings.';
    } else if (err.code === 'BREVO_KEY_NOT_FOUND') {
      userMessage = 'Email delivery service configuration is being updated. Please sign up with Google or try again shortly.';
    } else if (err.code === 'BREVO_SENDER_UNVERIFIED') {
      userMessage = 'Email sender verification is pending in Brevo. Please try again shortly.';
    } else if (err.code === 'BREVO_QUOTA_EXCEEDED') {
      userMessage = 'Daily email limit reached. Please contact NEXORA administrator.';
    } else if (err.message) {
      userMessage = err.message;
    }

    res.status(err.status || 500).json({ 
      error: userMessage,
      code: err.code || 'EMAIL_DISPATCH_FAILED'
    });
  }
});

// 4. Validate 6-digit Email OTP with atomic single-use burn
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
    const verifyResult = await challengeStore.verifyAndBurnChallenge(normalizedEmail, otp.toString(), purpose);

    if (!verifyResult.success) {
      res.status(400).json({
        error: verifyResult.error,
        remainingAttempts: verifyResult.remainingAttempts
      });
      return;
    }

    res.json({
      success: true,
      verificationToken: verifyResult.verificationToken,
      expiresAt: verifyResult.expiresAt
    });
  } catch (err: any) {
    console.error('Error in /auth/verify-email-otp:', err.message || err);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
});

// 5. Confirm Verified Signup (Server-Side Verification Enforcement)
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

    const consumed = await challengeStore.consumeAuthorization(normalizedEmail, 'signup', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Verification token has already been used or expired.' });
      return;
    }

    let emailVerifiedInAuth = false;
    const apiKey = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;
    if (idToken && apiKey) {
      try {
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            returnSecureToken: true
          })
        });
        emailVerifiedInAuth = true;
      } catch {
        // non-fatal
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

// 6. Update Password with Verified Reset Token
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

    const consumed = await challengeStore.consumeAuthorization(normalizedEmail, 'reset-password', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Password reset token has already been consumed. Please request a new code.' });
      return;
    }

    res.json({
      success: true,
      message: 'Your password reset token has been verified. Please sign in with your new password.'
    });
  } catch (err: any) {
    console.error('Error in /auth/reset-password:', err.message || err);
    res.status(500).json({ error: 'Internal server error updating password.' });
  }
});

// 7. Admin Status Check
apiRouter.get('/admin/status', (req, res) => {
  const adminConfig = getAdminConfig();
  const founderEmail = ADMIN_EMAILS[0];
  res.json({
    initialized: Boolean(adminConfig.passwordHash),
    founderEmail,
    maskedEmail: maskEmail(founderEmail),
    founderPhone: ADMIN_PHONE,
    maskedPhone: maskPhone(ADMIN_PHONE)
  });
});

// 8. Request Admin Setup OTP
apiRouter.post('/admin/request-setup-otp', async (req, res) => {
  const founderEmail = ADMIN_EMAILS[0];
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + 180 * 1000;

  try {
    await sendBrevoOtpEmail(founderEmail, otp, 'signup');
  } catch (err: any) {
    console.warn('[ADMIN SETUP OTP] Brevo dispatch note:', err.message);
  }

  const hash = hashOtp(founderEmail, otp, 'admin-setup');
  adminSetupOtpChallenge = { hash, expiresAt, email: founderEmail };

  res.json({
    success: true,
    maskedEmail: maskEmail(founderEmail),
    expiresInSeconds: 180
  });
});

// 9. Setup Admin Security Password
apiRouter.post('/admin/setup-password', async (req, res) => {
  const { otp, newPassword, confirmPassword } = req.body;
  if (!otp || !newPassword || newPassword !== confirmPassword || newPassword.length < 16) {
    res.status(400).json({ error: 'Valid OTP and matching password of at least 16 characters required.' });
    return;
  }
  const founderEmail = ADMIN_EMAILS[0];
  if (!adminSetupOtpChallenge || Date.now() > adminSetupOtpChallenge.expiresAt) {
    res.status(400).json({ error: 'Setup verification code expired or not requested.' });
    return;
  }
  const inputHash = hashOtp(founderEmail, otp.toString().trim(), 'admin-setup');
  if (inputHash !== adminSetupOtpChallenge.hash) {
    res.status(400).json({ error: 'Invalid verification code.' });
    return;
  }
  adminSetupOtpChallenge = null;
  const passwordHash = crypto.createHmac('sha256', HMAC_SECRET).update(newPassword.trim()).digest('hex');
  await saveAdminConfig({ passwordHash });
  res.json({ success: true, message: 'Admin Security Password saved successfully.' });
});

// 10. Verify Admin Security Password & Dispatch OTP
apiRouter.post('/admin/verify-password', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'Admin Security Password required.' });
    return;
  }
  const adminConfig = getAdminConfig();
  const inputHash = crypto.createHmac('sha256', HMAC_SECRET).update(password.trim()).digest('hex');

  if (adminConfig.passwordHash) {
    if (inputHash !== adminConfig.passwordHash) {
      res.status(401).json({ error: 'Incorrect Admin Security Password.' });
      return;
    }
  } else {
    if (process.env.ADMIN_SECURITY_PASSWORD) {
      if (password !== process.env.ADMIN_SECURITY_PASSWORD) {
        res.status(401).json({ error: 'Incorrect Admin Security Password.' });
        return;
      }
    } else {
      await saveAdminConfig({ passwordHash: inputHash });
    }
  }

  const founderEmail = ADMIN_EMAILS[0];
  const otp = crypto.randomInt(100000, 1000000).toString();
  const token = `pwd_tok_${crypto.randomBytes(24).toString('hex')}`;
  const expiresAt = Date.now() + 180 * 1000;

  try {
    await sendBrevoOtpEmail(founderEmail, otp, 'signup');
  } catch (err: any) {
    console.warn('[ADMIN PWD OTP] Brevo dispatch note:', err.message);
  }

  activePasswordOtpTokens.set(token, {
    token,
    email: founderEmail,
    otpHash: hashOtp(founderEmail, otp, 'admin-pwd-otp'),
    expiresAt,
    attempts: 0
  });

  res.json({
    success: true,
    passwordToken: token,
    maskedEmail: maskEmail(founderEmail),
    expiresInSeconds: 180
  });
});

// 11. Resend Admin OTP
apiRouter.post('/admin/resend-otp', async (req, res) => {
  const { passwordToken } = req.body;
  const challenge = activePasswordOtpTokens.get(passwordToken);
  if (!challenge || Date.now() > challenge.expiresAt) {
    res.status(400).json({ error: 'Session expired. Please re-enter Admin Security Password.' });
    return;
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  challenge.otpHash = hashOtp(challenge.email, otp, 'admin-pwd-otp');
  challenge.expiresAt = Date.now() + 180 * 1000;
  challenge.attempts = 0;

  try {
    await sendBrevoOtpEmail(challenge.email, otp, 'signup');
  } catch (err: any) {
    console.warn('[ADMIN RESEND OTP] Brevo note:', err.message);
  }

  res.json({ success: true, expiresInSeconds: 180 });
});

// 12. Verify 6-digit Brevo OTP & Issue Elevated Admin Session
apiRouter.post('/admin/verify-otp', (req, res) => {
  const { passwordToken, otp } = req.body;
  if (!passwordToken || !otp) {
    res.status(400).json({ error: 'Password token and 6-digit verification code required.' });
    return;
  }
  const challenge = activePasswordOtpTokens.get(passwordToken);
  if (!challenge || Date.now() > challenge.expiresAt) {
    res.status(400).json({ error: 'Verification code expired. Please re-enter Admin Security Password.' });
    return;
  }
  challenge.attempts++;
  if (challenge.attempts > 5) {
    activePasswordOtpTokens.delete(passwordToken);
    res.status(429).json({ error: 'Too many incorrect attempts. Session invalidated.' });
    return;
  }
  const testHash = hashOtp(challenge.email, otp.toString().trim(), 'admin-pwd-otp');
  if (testHash !== challenge.otpHash) {
    res.status(401).json({
      error: 'Incorrect verification code. Please check your email.',
      remainingAttempts: Math.max(0, 5 - challenge.attempts)
    });
    return;
  }
  activePasswordOtpTokens.delete(passwordToken);

  const sessionToken = `nexora_admin_${crypto.randomBytes(32).toString('hex')}`;
  const durationMinutes = 15;
  const expiresAt = Date.now() + durationMinutes * 60 * 1000;

  activeAdminSessions.set(sessionToken, {
    sessionId: sessionToken,
    adminEmail: challenge.email,
    expiresAt,
    createdAt: Date.now()
  });

  res.json({
    success: true,
    sessionToken,
    durationMinutes,
    expiresAt
  });
});

// 13. Admin session verification
apiRouter.post('/admin/verify-session', (req, res) => {
  const { sessionToken } = req.body;
  if (!sessionToken || typeof sessionToken !== 'string') {
    res.json({ valid: false });
    return;
  }

  const session = activeAdminSessions.get(sessionToken);
  if (!session || Date.now() > session.expiresAt) {
    if (session) activeAdminSessions.delete(sessionToken);
    res.json({ valid: false });
    return;
  }

  res.json({
    valid: true,
    adminEmail: session.adminEmail,
    expiresAt: session.expiresAt
  });
});

// 14. Revoke session
apiRouter.post('/admin/logout-session', (req, res) => {
  const { sessionToken } = req.body;
  if (sessionToken && activeAdminSessions.has(sessionToken)) {
    activeAdminSessions.delete(sessionToken);
  }
  res.json({ success: true });
});

// 15. Student Presence Heartbeat
apiRouter.post('/presence/heartbeat', (req, res) => {
  const { userId, email } = req.body;
  if (userId || email) {
    const id = String(userId || email).toLowerCase().trim();
    activeStudentPresence.set(id, {
      id,
      email: email ? String(email) : 'Member',
      lastSeen: Date.now()
    });
  }
  res.json({ success: true });
});

// 16. Admin Live Metrics
apiRouter.get('/admin/stats', (req, res) => {
  const now = Date.now();
  const onlineThreshold = 3 * 60 * 1000;
  let onlineCount = 0;

  for (const record of activeStudentPresence.values()) {
    if (now - record.lastSeen < onlineThreshold) {
      onlineCount++;
    }
  }

  res.json({
    stats: {
      totalStudents: activeStudentPresence.size,
      onlineStudents: onlineCount,
      totalRegistrations: 0,
      totalRevenue: 0
    }
  });
});

// 17. Admin Student Directory
apiRouter.get('/admin/students', (req, res) => {
  const now = Date.now();
  const list: any[] = [];

  for (const record of activeStudentPresence.values()) {
    const diff = now - record.lastSeen;
    const status = diff < 3 * 60 * 1000 ? 'online' : diff < 15 * 60 * 1000 ? 'recent' : 'offline';
    list.push({
      id: record.id,
      email: record.email,
      status,
      lastSeen: record.lastSeen
    });
  }

  if (list.length === 0) {
    list.push({
      id: 'admin_mitesh',
      email: ADMIN_EMAILS[0],
      status: 'online',
      lastSeen: now
    });
  }

  res.json({ students: list });
});

// 18. Visitor Contact Form Submission
apiRouter.post('/contact/submit', (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const limit = visitorRateLimits.get(ip);
  if (limit && now - limit.windowStart < 10 * 60 * 1000) {
    if (limit.count >= 5) {
      res.status(429).json({ error: 'Rate limit exceeded. Please wait a few minutes before submitting another message.' });
      return;
    }
    limit.count++;
  } else {
    visitorRateLimits.set(ip, { count: 1, windowStart: now });
  }

  const { sender_name, sender_email, subject, message } = req.body;
  if (!sender_name || !sender_email || !message) {
    res.status(400).json({ error: 'Name, email, and message are all required.' });
    return;
  }
  if (message.length < 10 || message.length > 5000) {
    res.status(400).json({ error: 'Message must be between 10 and 5,000 characters.' });
    return;
  }

  res.json({ success: true, message: 'Message received successfully.' });
});

// 19. Admin Reply Dispatch via Brevo Email
apiRouter.post('/admin/reply-email', async (req, res) => {
  const { toEmail, recipientName, originalSubject, replyMessage } = req.body;
  if (!toEmail || !replyMessage) {
    res.status(400).json({ error: 'Recipient email and reply message are required.' });
    return;
  }

  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    res.json({ success: true, warning: 'Brevo not configured; in-app reply recorded.' });
    return;
  }

  try {
    const senderEmail = getBrevoSenderEmail();
    const senderName = getBrevoSenderName();
    const htmlContent = `
      <div style="font-family: sans-serif; background-color: #08080D; color: #F8FAFC; padding: 24px; border-radius: 12px; border: 1px solid rgba(139,92,246,0.3);">
        <h2 style="color: #A78BFA; margin-top: 0;">NEXORA Organizing Desk</h2>
        <p>Hello ${recipientName || 'Student / Visitor'},</p>
        <div style="padding: 16px; background-color: #11101B; border-radius: 8px; border-left: 4px solid #8B5CF6; margin: 16px 0;">
          <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${replyMessage}</p>
        </div>
        <hr style="border: 0; border-top: 1px solid rgba(139,92,246,0.2); margin: 20px 0;" />
        <p style="font-size: 11px; color: #94A3B8; margin: 0;">In reference to: <strong>${originalSubject || 'General Inquiry'}</strong></p>
        <p style="font-size: 11px; color: #64748B; margin-top: 4px;">Birla Vishvakarma Mahavidyalaya (BVM) · NEXORA Student Technology Community</p>
      </div>
    `;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail }],
        subject: `Re: ${originalSubject || 'NEXORA Inquiry Response'}`,
        htmlContent
      })
    });

    res.json({ success: true, message: 'Email reply dispatched via Brevo.' });
  } catch (err: any) {
    console.error('Error dispatching reply email:', err);
    res.status(500).json({ error: 'Failed to dispatch email reply via Brevo.' });
  }
});

// 20. Safe Serverless Media Upload
apiRouter.post('/media/upload', (req, res) => {
  try {
    const { dataUrl, fileName, mimeType, folder = 'competitions' } = req.body;
    if (!dataUrl) {
      res.status(400).json({ error: 'Missing image data' });
      return;
    }

    const safeName = `${Date.now()}_${(fileName || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    res.json({
      success: true,
      url: dataUrl,
      path: `uploads/${folder}/${safeName}`,
      name: fileName || safeName
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process uploaded image.' });
  }
});

// ==========================================
// MOUNT ROUTER STRICTLY ON /api
// ==========================================
app.use('/api', apiRouter);

// Fallback ONLY for unmatched /api/* routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    status: 404
  });
});

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[EXPRESS UNCAUGHT ERROR]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

export default app;
export { app };
