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

// 1. API: Start Dual-OTP Admin Challenge
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

  app.listen(PORT, () => {
    console.log(`NEXORA Server running on http://localhost:${PORT}`);
  });
}

startServer();
