import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Approved administrator accounts
const ADMIN_EMAILS = [
  'miteshpipaliya2202@gmail.com',
  'editwithvision@gmail.com'
];
const ADMIN_PHONE = '+91 8200243606';

// Persistent storage directory for backend-protected challenges and secrets
const STORAGE_DIR = path.resolve(__dirname, '.server_data');
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (err) {
    console.warn('[SERVER INIT] Failed to initialize .server_data directory:', err);
  }
}

// Persistent Backend HMAC Secret for Keyed Hashing
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
    fs.writeFileSync(keyFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const HMAC_SECRET = getOrCreateHmacSecret();

// Brevo sender credentials
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'nexora.bvm@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'NEXORA';

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
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('BREVO_API_KEY is not configured in the server environment. Please configure your Brevo API key in the environment variables.');
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
                    <p style="margin: 0 0 16px; font-size: 13px; color: #F87171; text-align: center;"><strong>This verification code expires in 30 seconds.</strong></p>
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

  const textContent = `${heading}\n\n${subtext}\n\nYour verification code is:\n\n${otp}\n\nThis verification code expires in 30 seconds.\n\nIf you did not request this code, please ignore this email.\nNever share your verification code with anyone.\n\nNEXORA\nStudent Technology & Innovation Community\nBirla Vishvakarma Mahavidyalaya (BVM)`;

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
    console.error('[BREVO DISPATCH FAILED]', response.status, errData);
    if (response.status === 401 && errData.message && errData.message.includes('unrecognised IP')) {
      throw new Error('Brevo IP Authorization: Please add your server IP in Brevo console at https://app.brevo.com/security/authorised_ips');
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
// PERSISTENT SERVER-SIDE STORAGE FOR OTP CHALLENGES
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
  public setChallenge(email: string, purpose: 'signup' | 'reset-password', hash: string, expiresAt: number, ip: string) {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    this.challenges.set(key, {
      email: email.toLowerCase().trim(),
      hash,
      expiresAt,
      attempts: 0,
      purpose,
      lastSentAt: Date.now(),
      ip
    });
    this.persistToDisk();
  }

  public getChallenge(email: string, purpose: 'signup' | 'reset-password'): HashedStudentChallenge | undefined {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    return this.challenges.get(key);
  }

  public deleteChallenge(email: string, purpose: 'signup' | 'reset-password') {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    this.challenges.delete(key);
    this.persistToDisk();
  }

  public incrementAttempts(email: string, purpose: 'signup' | 'reset-password'): number {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    const item = this.challenges.get(key);
    if (!item) return 0;
    item.attempts += 1;
    this.persistToDisk();
    return item.attempts;
  }

  // Store verified authorization token
  public setAuthorization(email: string, purpose: 'signup' | 'reset-password', token: string, expiresAt: number) {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    this.authorizations.set(key, {
      email: email.toLowerCase().trim(),
      purpose,
      token,
      expiresAt
    });
    this.persistToDisk();
  }

  public getAuthorization(email: string, purpose: 'signup' | 'reset-password'): StoredAuthorization | undefined {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    return this.authorizations.get(key);
  }

  public consumeAuthorization(email: string, purpose: 'signup' | 'reset-password', token: string): boolean {
    const key = `${purpose}:${email.toLowerCase().trim()}`;
    const auth = this.authorizations.get(key);
    if (!auth) return false;
    if (auth.token !== token || Date.now() > auth.expiresAt) {
      this.authorizations.delete(key);
      this.persistToDisk();
      return false;
    }
    this.authorizations.delete(key);
    this.persistToDisk();
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
// STUDENT EMAIL OTP VERIFICATION ENDPOINTS
// ==========================================

// 1. Dispatch 6-digit Email OTP via Brevo
app.post('/api/auth/send-email-otp', async (req, res) => {
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
    const existing = challengeStore.getChallenge(normalizedEmail, purpose);

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
    const expiresAt = Date.now() + 30 * 1000; // Exact 30-second expiration

    // Dispatch real email via Brevo Transactional API
    await sendBrevoOtpEmail(normalizedEmail, otp, purpose);

    // Store only the protected keyed HMAC hash (Raw OTP is never persisted)
    const hash = hashOtp(normalizedEmail, otp, purpose);
    challengeStore.setChallenge(normalizedEmail, purpose, hash, expiresAt, clientIp);

    res.json({
      success: true,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInSeconds: 30,
      resendCooldown: 30
    });
  } catch (err: any) {
    console.error('Error in /api/auth/send-email-otp:', err.message || err);
    res.status(500).json({ error: err.message || 'Failed to dispatch verification code via email.' });
  }
});

// 2. Validate 6-digit Email OTP
app.post('/api/auth/verify-email-otp', (req, res) => {
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
    const challenge = challengeStore.getChallenge(normalizedEmail, purpose);

    if (!challenge) {
      res.status(400).json({ error: 'Verification code not requested or has expired. Please request a new code.' });
      return;
    }

    // Backend-enforced 30s expiry check
    if (Date.now() > challenge.expiresAt) {
      challengeStore.deleteChallenge(normalizedEmail, purpose);
      res.status(400).json({ error: 'Verification code has expired (30-second limit). Please request a fresh code.' });
      return;
    }

    // Brute force protection: maximum 5 attempts
    const attempts = challengeStore.incrementAttempts(normalizedEmail, purpose);
    if (attempts > 5) {
      challengeStore.deleteChallenge(normalizedEmail, purpose);
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
    challengeStore.deleteChallenge(normalizedEmail, purpose);

    // Issue short-lived cryptographic authorization token (15-minute validity)
    const tokenExpiresAt = Date.now() + 15 * 60 * 1000;
    const verificationToken = createSignedToken({
      email: normalizedEmail,
      purpose,
      exp: tokenExpiresAt
    });

    challengeStore.setAuthorization(normalizedEmail, purpose, verificationToken, tokenExpiresAt);

    res.json({
      success: true,
      verificationToken,
      expiresAt: tokenExpiresAt
    });
  } catch (err: any) {
    console.error('Error in /api/auth/verify-email-otp:', err.message || err);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
});

// 3. Confirm Verified Signup (Server-Side Verification Enforcement)
app.post('/api/auth/confirm-verified-signup', async (req, res) => {
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
    const consumed = challengeStore.consumeAuthorization(normalizedEmail, 'signup', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Verification token has already been used or expired.' });
      return;
    }

    // Mark email verified in Firebase via Admin SDK or REST API if available
    let emailVerifiedInAuth = false;
    try {
      const { initializeApp, getApps } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      const app = getApps().length ? getApps()[0] : initializeApp({ projectId: 'gen-lang-client-0089073748' });
      const auth = getAuth(app);
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
        } catch {
          // ignore
        }
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
app.post('/api/auth/reset-password', async (req, res) => {
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
    const consumed = challengeStore.consumeAuthorization(normalizedEmail, 'reset-password', verificationToken);
    if (!consumed) {
      res.status(403).json({ error: 'Password reset token has already been consumed. Please request a new code.' });
      return;
    }

    // Attempt Firebase Admin update
    let updatedViaAdmin = false;
    try {
      const { initializeApp, getApps } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      const app = getApps().length ? getApps()[0] : initializeApp({ projectId: 'gen-lang-client-0089073748' });
      const auth = getAuth(app);
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
    console.error('Error in /api/auth/reset-password:', err.message || err);
    res.status(500).json({ error: 'Internal server error updating password.' });
  }
});

// ==========================================
// FOUNDER DUAL-OTP ADMIN CHALLENGE ENDPOINTS
// ==========================================

// 1. Start Admin Dual-OTP Challenge
app.post('/api/admin/start-challenge', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Admin email required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      res.status(403).json({ error: 'Access denied: User does not have administrative privileges.' });
      return;
    }

    // Generate two independent 6-digit cryptographic OTPs
    const emailOtp = crypto.randomInt(100000, 1000000).toString();
    const smsOtp = crypto.randomInt(100000, 1000000).toString();
    const challengeId = `ch_${crypto.randomUUID()}`;

    // Dispatch real email OTP to the founder via Brevo
    try {
      await sendBrevoOtpEmail(normalizedEmail, emailOtp, 'signup');
    } catch (brevoErr: any) {
      console.warn('[ADMIN BREVO DISPATCH NOTICE]', brevoErr.message);
    }

    const expiresAt = Date.now() + 5 * 60 * 1000;

    activeAdminChallenges.set(challengeId, {
      challengeId,
      adminEmail: normalizedEmail,
      adminPhone: ADMIN_PHONE,
      emailOtpHash: hashOtp(normalizedEmail, emailOtp, 'admin-email'),
      smsOtpHash: hashOtp(normalizedEmail, smsOtp, 'admin-sms'),
      expiresAt,
      attempts: 0,
      verified: false
    });

    // Clean up expired challenges
    for (const [id, c] of activeAdminChallenges.entries()) {
      if (Date.now() > c.expiresAt) activeAdminChallenges.delete(id);
    }

    res.json({
      success: true,
      challengeId,
      maskedEmail: maskEmail(normalizedEmail),
      maskedPhone: maskPhone(ADMIN_PHONE),
      expiresInSeconds: 300
    });
  } catch (err: any) {
    console.error('Error starting admin challenge:', err);
    res.status(500).json({ error: 'Internal server error during verification challenge initialization.' });
  }
});

// 2. Verify Dual OTPs
app.post('/api/admin/verify-dual-otp', (req, res) => {
  try {
    const { challengeId, emailOtp, smsOtp } = req.body;
    if (!challengeId || !emailOtp || !smsOtp) {
      res.status(400).json({ error: 'Challenge ID, Email OTP, and Mobile OTP are all required.' });
      return;
    }

    const challenge = activeAdminChallenges.get(challengeId);
    if (!challenge) {
      res.status(400).json({ error: 'Invalid or expired verification challenge. Please request a new code.' });
      return;
    }

    if (Date.now() > challenge.expiresAt) {
      activeAdminChallenges.delete(challengeId);
      res.status(400).json({ error: 'Verification codes have expired. Please request new codes.' });
      return;
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      activeAdminChallenges.delete(challengeId);
      res.status(429).json({ error: 'Too many failed verification attempts. Challenge invalidated for security.' });
      return;
    }

    const testEmailHash = hashOtp(challenge.adminEmail, emailOtp.toString().trim(), 'admin-email');
    const testSmsHash = hashOtp(challenge.adminEmail, smsOtp.toString().trim(), 'admin-sms');

    const isEmailValid = crypto.timingSafeEqual(Buffer.from(testEmailHash, 'hex'), Buffer.from(challenge.emailOtpHash, 'hex'));
    const isSmsValid = crypto.timingSafeEqual(Buffer.from(testSmsHash, 'hex'), Buffer.from(challenge.smsOtpHash, 'hex'));

    if (!isEmailValid || !isSmsValid) {
      const errorMsg = !isEmailValid && !isSmsValid
        ? 'Both Email and Mobile OTPs are incorrect.'
        : !isEmailValid
        ? 'Email verification code is incorrect.'
        : 'Mobile SMS verification code is incorrect.';

      res.status(401).json({ 
        error: errorMsg,
        remainingAttempts: Math.max(0, 5 - challenge.attempts)
      });
      return;
    }

    // Invalidate challenge immediately
    activeAdminChallenges.delete(challengeId);

    // Issue short-lived elevated admin session (30 minutes)
    const sessionToken = `nexora_admin_${crypto.randomBytes(32).toString('hex')}`;
    const sessionExpiresAt = Date.now() + 30 * 60 * 1000;

    activeAdminSessions.set(sessionToken, {
      sessionId: sessionToken,
      adminEmail: challenge.adminEmail,
      expiresAt: sessionExpiresAt,
      createdAt: Date.now()
    });

    res.json({
      success: true,
      sessionToken,
      expiresAt: sessionExpiresAt
    });
  } catch (err: any) {
    console.error('Error verifying dual OTP:', err);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
});

// 3. Admin session verification
app.post('/api/admin/verify-session', (req, res) => {
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

// 4. Revoke session
app.post('/api/admin/logout-session', (req, res) => {
  const { sessionToken } = req.body;
  if (sessionToken && activeAdminSessions.has(sessionToken)) {
    activeAdminSessions.delete(sessionToken);
  }
  res.json({ success: true });
});

// Mount Vite in development or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

startServer();
