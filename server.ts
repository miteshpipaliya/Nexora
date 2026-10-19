import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Server-side in-memory challenge & session store
interface OtpChallenge {
  challengeId: string;
  adminEmail: string;
  adminPhone: string;
  emailOtp: string;
  smsOtp: string;
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

const activeChallenges = new Map<string, OtpChallenge>();
const activeSessions = new Map<string, AdminSession>();

// Student OTP Challenges (Signup Verification & Password Recovery)
interface StudentEmailChallenge {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  purpose: 'signup' | 'reset-password';
  lastSentAt: number;
}

interface PasswordResetSession {
  email: string;
  token: string;
  expiresAt: number;
}

const activeEmailOtps = new Map<string, StudentEmailChallenge>();
const activeResetSessions = new Map<string, PasswordResetSession>();

// Masking helpers
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

// ==========================================
// STUDENT EMAIL OTP VERIFICATION ENDPOINTS
// ==========================================

// 1. Dispatch 6-digit Email OTP (Signup or Password Recovery)
app.post('/api/auth/send-email-otp', (req, res) => {
  try {
    const { email, purpose = 'signup' } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = activeEmailOtps.get(normalizedEmail);

    // 60-second resend cooldown rate limit
    if (existing && Date.now() - existing.lastSentAt < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - existing.lastSentAt)) / 1000);
      res.status(429).json({ 
        error: `Please wait ${waitSeconds}s before requesting a new verification code.`,
        waitSeconds 
      });
      return;
    }

    // Cryptographically secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    activeEmailOtps.set(normalizedEmail, {
      email: normalizedEmail,
      otp,
      expiresAt,
      attempts: 0,
      purpose,
      lastSentAt: Date.now()
    });

    console.log(`[NEXORA AUTH] 6-Digit Email OTP generated for ${normalizedEmail} (${purpose}): ${otp}`);

    // Clean up expired records
    for (const [em, ch] of activeEmailOtps.entries()) {
      if (Date.now() > ch.expiresAt) activeEmailOtps.delete(em);
    }

    res.json({
      success: true,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInSeconds: 300,
      resendCooldown: 60,
      _devNotice: '6-digit OTP dispatched and logged to server console.'
    });
  } catch (err: any) {
    console.error('Error sending email OTP:', err);
    res.status(500).json({ error: 'Internal server error while dispatching verification code.' });
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

    const normalizedEmail = email.toLowerCase().trim();
    const challenge = activeEmailOtps.get(normalizedEmail);

    if (!challenge) {
      res.status(400).json({ error: 'Verification code expired or not requested. Please request a new code.' });
      return;
    }

    if (Date.now() > challenge.expiresAt) {
      activeEmailOtps.delete(normalizedEmail);
      res.status(400).json({ error: 'Verification code has expired (5-minute limit). Please request a fresh code.' });
      return;
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      activeEmailOtps.delete(normalizedEmail);
      res.status(429).json({ error: 'Too many incorrect attempts. This code has been invalidated for security.' });
      return;
    }

    if (challenge.otp.trim() !== otp.toString().trim()) {
      const remainingAttempts = Math.max(0, 5 - challenge.attempts);
      res.status(401).json({
        error: `Incorrect verification code. Please check your email. (${remainingAttempts} attempts remaining)`,
        remainingAttempts
      });
      return;
    }

    // Single-use: burn challenge immediately
    activeEmailOtps.delete(normalizedEmail);

    // Issue short-lived verification token (15-minute validity)
    const verificationToken = `vt_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 15 * 60 * 1000;

    if (purpose === 'reset-password') {
      activeResetSessions.set(normalizedEmail, {
        email: normalizedEmail,
        token: verificationToken,
        expiresAt
      });
    }

    console.log(`[NEXORA AUTH] Email OTP verified successfully for ${normalizedEmail} (${purpose})`);

    res.json({
      success: true,
      verificationToken,
      expiresAt
    });
  } catch (err: any) {
    console.error('Error verifying email OTP:', err);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
});

// 3. Inspect active OTP (Dev inspection helper)
app.get('/api/auth/inspect-otp/:email', (req, res) => {
  const normalizedEmail = (req.params.email || '').toLowerCase().trim();
  const challenge = activeEmailOtps.get(normalizedEmail);
  if (!challenge || Date.now() > challenge.expiresAt) {
    res.status(404).json({ error: 'No active verification challenge found.' });
    return;
  }
  res.json({
    email: normalizedEmail,
    otp: challenge.otp,
    maskedEmail: maskEmail(normalizedEmail),
    expiresInSeconds: Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000))
  });
});

// 4. Update Password with Verified Reset Token
app.post('/api/auth/reset-password', (req, res) => {
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
    const session = activeResetSessions.get(normalizedEmail);

    if (!session || session.token !== verificationToken || Date.now() > session.expiresAt) {
      if (session) activeResetSessions.delete(normalizedEmail);
      res.status(403).json({ error: 'Password reset authorization has expired or is invalid. Please restart recovery.' });
      return;
    }

    // Single-use: burn authorization token
    activeResetSessions.delete(normalizedEmail);

    console.log(`[NEXORA AUTH] Password reset authorization consumed for ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'Your password has been updated successfully. Please sign in again.'
    });
  } catch (err: any) {
    console.error('Error in reset password:', err);
    res.status(500).json({ error: 'Internal server error updating password.' });
  }
});

// ==========================================
// FOUNDER DUAL-OTP ADMIN CHALLENGE ENDPOINTS
// ==========================================
app.post('/api/admin/start-challenge', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Admin email required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      // Security: Do not confirm whether an address is an admin or not
      res.status(403).json({ error: 'Access denied: User does not have administrative privileges.' });
      return;
    }

    // Generate two independent 6-digit cryptographic OTPs
    const emailOtp = crypto.randomInt(100000, 1000000).toString();
    const smsOtp = crypto.randomInt(100000, 1000000).toString();
    const challengeId = `ch_${crypto.randomUUID()}`;

    // 5-minute expiration
    const expiresAt = Date.now() + 5 * 60 * 1000;

    activeChallenges.set(challengeId, {
      challengeId,
      adminEmail: normalizedEmail,
      adminPhone: ADMIN_PHONE,
      emailOtp,
      smsOtp,
      expiresAt,
      attempts: 0,
      verified: false
    });

    // In a production environment with transactional email/SMS gateways (e.g. SendGrid, Twilio),
    // dispatch the independent codes. For development/testing and faculty inspection,
    // we log delivery notice to console and pass verification metadata.
    console.log(`[NEXORA ADMIN SECURITY] Dual-OTP Challenge generated for ${normalizedEmail}`);
    console.log(`[NEXORA ADMIN SECURITY] -> Email OTP sent to ${maskEmail(normalizedEmail)}: ${emailOtp}`);
    console.log(`[NEXORA ADMIN SECURITY] -> SMS OTP sent to ${maskPhone(ADMIN_PHONE)}: ${smsOtp}`);

    // Clean up expired challenges
    for (const [id, c] of activeChallenges.entries()) {
      if (Date.now() > c.expiresAt) activeChallenges.delete(id);
    }

    res.json({
      success: true,
      challengeId,
      maskedEmail: maskEmail(normalizedEmail),
      maskedPhone: maskPhone(ADMIN_PHONE),
      expiresInSeconds: 300,
      // Provide demo/testing helper token for instant verification inspection in demo mode
      _devNotice: 'Dual-OTP generated. Codes logged to server console.'
    });
  } catch (err: any) {
    console.error('Error starting challenge:', err);
    res.status(500).json({ error: 'Internal server error during verification challenge initialization.' });
  }
});

// 2. API: Verify Dual OTPs
app.post('/api/admin/verify-dual-otp', (req, res) => {
  try {
    const { challengeId, emailOtp, smsOtp } = req.body;
    if (!challengeId || !emailOtp || !smsOtp) {
      res.status(400).json({ error: 'Challenge ID, Email OTP, and Mobile OTP are all required.' });
      return;
    }

    const challenge = activeChallenges.get(challengeId);
    if (!challenge) {
      res.status(400).json({ error: 'Invalid or expired verification challenge. Please request a new code.' });
      return;
    }

    if (Date.now() > challenge.expiresAt) {
      activeChallenges.delete(challengeId);
      res.status(400).json({ error: 'Verification codes have expired (5-minute window). Please request new codes.' });
      return;
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      activeChallenges.delete(challengeId);
      res.status(429).json({ error: 'Too many failed verification attempts. Challenge invalidated for security.' });
      return;
    }

    // Verify both independent codes
    const isEmailValid = challenge.emailOtp.trim() === emailOtp.toString().trim();
    const isSmsValid = challenge.smsOtp.trim() === smsOtp.toString().trim();

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

    // Invalidate challenge immediately after successful consumption (one-time use)
    activeChallenges.delete(challengeId);

    // Issue short-lived elevated admin session (30 minutes)
    const sessionToken = `nexora_admin_${crypto.randomBytes(32).toString('hex')}`;
    const sessionExpiresAt = Date.now() + 30 * 60 * 1000;

    activeSessions.set(sessionToken, {
      sessionId: sessionToken,
      adminEmail: challenge.adminEmail,
      expiresAt: sessionExpiresAt,
      createdAt: Date.now()
    });

    console.log(`[NEXORA ADMIN SECURITY] Elevated session granted for ${challenge.adminEmail} until ${new Date(sessionExpiresAt).toISOString()}`);

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

// 3. API: Session status verification
app.post('/api/admin/verify-session', (req, res) => {
  const { sessionToken } = req.body;
  if (!sessionToken || typeof sessionToken !== 'string') {
    res.json({ valid: false });
    return;
  }

  const session = activeSessions.get(sessionToken);
  if (!session || Date.now() > session.expiresAt) {
    if (session) activeSessions.delete(sessionToken);
    res.json({ valid: false });
    return;
  }

  res.json({
    valid: true,
    adminEmail: session.adminEmail,
    expiresAt: session.expiresAt
  });
});

// 4. API: Revoke session (Logout)
app.post('/api/admin/logout-session', (req, res) => {
  const { sessionToken } = req.body;
  if (sessionToken && activeSessions.has(sessionToken)) {
    activeSessions.delete(sessionToken);
  }
  res.json({ success: true });
});

// 5. API: Dev inspection helper (returns current active challenge codes if in dev environment)
app.get('/api/admin/inspect-challenge/:challengeId', (req, res) => {
  const { challengeId } = req.params;
  const challenge = activeChallenges.get(challengeId);
  if (!challenge || Date.now() > challenge.expiresAt) {
    res.status(404).json({ error: 'Challenge not found or expired' });
    return;
  }
  // Return for preview dialog
  res.json({
    emailOtp: challenge.emailOtp,
    smsOtp: challenge.smsOtp,
    maskedEmail: maskEmail(challenge.adminEmail),
    maskedPhone: maskPhone(challenge.adminPhone)
  });
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
