import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csurf from 'csurf';
import bodyParser from 'body-parser';
import z from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Approved administrator accounts - Founder only
const ADMIN_EMAILS = [
  'miteshpipaliya2202@gmail.com'
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

interface StudentEmailChallenge {
  challengeId: string;
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  type: 'signup' | 'reset';
}

const activeChallenges = new Map<string, OtpChallenge>();
const activeSessions = new Map<string, AdminSession>();
const activeStudentOtps = new Map<string, StudentEmailChallenge>();
const verifiedTokens = new Set<string>();
const passwordResetTokens = new Map<string, { email: string; expiresAt: number; used: boolean }>();

// Masking helpers
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '••••••';
  const first = local[0] || '';
  const last = local.slice(-1);
  return `${first}${'*'.repeat(Math.max(local.length - 2, 3))}${last}@${domain}`;
}

function maskPhone(phone: string): string {
  const cleaned = phone.trim();
  const last3 = cleaned.slice(-3);
  return `+91 ••••• ••${last3}`;
}

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet for security headers
app.use(helmet());

// CSRF protection for state-changing routes
const csrf = require('csurf')({ cookie: true });
app.use(csrf());

// Rate limiter configuration
const rateLimit = require('express-rate-limit');

// General rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for auth routes - 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Even stricter rate limiter for admin routes - 10 requests per 15 minutes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many admin requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Admin authorization middleware
function adminOnly(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.body.sessionToken || (req.headers['x-session-token'] as string | undefined);
    if (!sessionToken) {
      res.status(401).json({ error: 'Session token required' });
      return;
    }

    const session = activeSessions.get(sessionToken);
    if (!session || Date.now() > session.expiresAt) {
      if (session) activeSessions.delete(sessionToken);
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const isAdmin = ADMIN_EMAILS.includes(session.adminEmail);
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ==========================================
// STUDENT EMAIL VERIFICATION (OTP) ENDPOINTS
// ==========================================

// 1. Send 6-Digit Email OTP for New Signup
app.post('/api/auth/send-signup-otp', authLimiter, (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const challengeId = `otp_signup_${crypto.randomUUID()}`;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    activeStudentOtps.set(challengeId, {
      challengeId,
      email: normalizedEmail,
      otp,
      expiresAt,
      attempts: 0,
      verified: false,
      type: 'signup'
    });

    console.log(`[NEXORA AUTH] Signup Email OTP generated for ${normalizedEmail}: ${otp}`);

    res.json({
      success: true,
      challengeId,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInSeconds: 300,
      devNotice: 'Email OTP generated.'
    });
  } catch (err: any) {
    console.error('Error sending signup OTP:', err);
    res.status(500).json({ error: 'Failed to dispatch email verification code.' });
  }
});

// 2. Verify 6-Digit Signup Email OTP
app.post('/api/auth/verify-signup-otp', authLimiter, (req, res) => {
  try {
    const { challengeId, otp } = req.body;
    if (!challengeId || !otp) {
      res.status(400).json({ error: 'Challenge ID and 6-digit OTP are required.' });
      return;
    }

    const challenge = activeStudentOtps.get(challengeId);
    if (!challenge || challenge.type !== 'signup') {
      res.status(400).json({ error: 'Verification challenge expired or invalid. Please request a new code.' });
      return;
    }

    if (Date.now() > challenge.expiresAt) {
      activeStudentOtps.delete(challengeId);
      res.status(400).json({ error: 'Verification code has expired (5-minute limit). Please request a fresh code.' });
      return;
    }

    if (challenge.attempts >= 5) {
      activeStudentOtps.delete(challengeId);
      res.status(429).json({ error: 'Maximum verification attempts exceeded. Please request a new code.' });
      return;
    }

    challenge.attempts++;

    if (challenge.otp !== otp.toString().trim()) {
      const remaining = 5 - challenge.attempts;
      res.status(400).json({ error: `Incorrect verification code. ${remaining} attempt(s) remaining.` });
      return;
    }

    challenge.verified = true;
    const verifiedToken = `vtok_${crypto.randomUUID()}`;
    verifiedTokens.add(verifiedToken);
    activeStudentOtps.delete(challengeId);

    console.log(`[NEXORA AUTH] Email verified successfully for ${challenge.email}`);

    res.json({
      success: true,
      verifiedToken,
      email: challenge.email
    });
  } catch (err: any) {
    console.error('Error verifying signup OTP:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// 3. Send Password Reset OTP
app.post('/api/auth/send-reset-otp', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const challengeId = `otp_reset_${crypto.randomUUID()}`;
    const expiresAt = Date.now() + 5 * 60 * 1000;

    activeStudentOtps.set(challengeId, {
      challengeId,
      email: normalizedEmail,
      otp,
      expiresAt,
      attempts: 0,
      verified: false,
      type: 'reset'
    });

    console.log(`[NEXORA AUTH] Password Reset OTP generated for ${normalizedEmail}: ${otp}`);

    // Return neutral response to prevent account enumeration
    res.json({
      success: true,
      challengeId,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInSeconds: 300,
      message: 'If an eligible account exists for this email, a verification code has been sent.'
    });
  } catch (err: any) {
    console.error('Error sending reset OTP:', err);
    res.status(500).json({ error: 'Failed to process password recovery request.' });
  }
});

// 4. Verify Password Reset OTP
app.post('/api/auth/verify-reset-otp', (req, res) => {
  try {
    const { challengeId, otp } = req.body;
    if (!challengeId || !otp) {
      res.status(400).json({ error: 'Challenge ID and 6-digit OTP are required.' });
      return;
    }

    const challenge = activeStudentOtps.get(challengeId);
    if (!challenge || challenge.type !== 'reset') {
      res.status(400).json({ error: 'Verification challenge expired or invalid. Please request a new code.' });
      return;
    }

    if (Date.now() > challenge.expiresAt) {
      activeStudentOtps.delete(challengeId);
      res.status(400).json({ error: 'Verification code has expired. Please request a fresh code.' });
      return;
    }

    if (challenge.attempts >= 5) {
      activeStudentOtps.delete(challengeId);
      res.status(429).json({ error: 'Maximum attempts exceeded. Please request a new reset code.' });
      return;
    }

    challenge.attempts++;

    if (challenge.otp !== otp.toString().trim()) {
      const remaining = 5 - challenge.attempts;
      res.status(400).json({ error: `Incorrect verification code. ${remaining} attempt(s) remaining.` });
      return;
    }

    challenge.verified = true;
    const resetAuthToken = `rtok_${crypto.randomUUID()}`;
    passwordResetTokens.set(resetAuthToken, {
      email: challenge.email,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes to reset password
      used: false
    });
    activeStudentOtps.delete(challengeId);

    res.json({
      success: true,
      resetAuthToken,
      email: challenge.email
    });
  } catch (err: any) {
    console.error('Error verifying reset OTP:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Inspect student OTP (for development / testing)
app.get('/api/auth/inspect-otp/:challengeId', (req, res) => {
  const { challengeId } = req.params;
  const challenge = activeStudentOtps.get(challengeId);
  if (!challenge || Date.now() > challenge.expiresAt) {
    res.status(404).json({ error: 'Challenge not found or expired' });
    return;
  }
  res.json({
    otp: challenge.otp,
    maskedEmail: maskEmail(challenge.email)
  });
});

// ==========================================
// ADMIN DUAL-OTP SECURITY ENDPOINTS
// ==========================================

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
      res.status(403).json({ error: 'Access denied: User does not have administrative privileges.' });
      return;
    }

    // Generate two independent 6-digit cryptographic OTPs
    const emailOtp = crypto.randomInt(100000, 1000000).toString();
    const smsOtp = crypto.randomInt(100000, 1000000).toString();
    const challengeId = `ch_${crypto.randomUUID()}`;
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
      _devNotice: 'Dual-OTP generated. Codes logged to server console.'
    });
  } catch (err: any) {
    console.error('Error starting challenge:', err);
    res.status(500).json({ error: 'Internal server error during verification challenge initialization.' });
  }
});

// 2. API: Verify Dual OTPs (admin)
app.post('/api/admin/verify-dual-otp', authLimiter, (req, res) => {
  try {
    const { challengeId, emailOtp, smsOtp } = req.body;

    if (!challengeId || !emailOtp || !smsOtp) {
      res.status(400).json({ error: 'Missing challenge ID, email OTP, or SMS OTP' });
      return;
    }

    const challenge = activeChallenges.get(challengeId);

    if (!challenge) {
      res.status(400).json({ error: 'Verification challenge expired or not found. Please request fresh codes.' });
      return;
    }

    if (Date.now() > challenge.expiresAt) {
      activeChallenges.delete(challengeId);
      res.status(400).json({ error: 'Verification challenge has expired (5-minute limit). Please request fresh codes.' });
      return;
    }

    if (challenge.attempts >= 5) {
      activeChallenges.delete(challengeId);
      res.status(429).json({ error: 'Maximum verification attempts exceeded (5 attempt limit). Challenge invalidated.' });
      return;
    }

    challenge.attempts++;

    const cleanEmailOtp = emailOtp.toString().trim();
    const cleanSmsOtp = smsOtp.toString().trim();

    const isEmailValid = challenge.emailOtp === cleanEmailOtp;
    const isSmsValid = challenge.smsOtp === cleanSmsOtp;

    if (!isEmailValid || !isSmsValid) {
      const remaining = 5 - challenge.attempts;
      let reason = 'Invalid verification codes.';
      if (!isEmailValid && isSmsValid) reason = 'Invalid Email OTP.';
      else if (isEmailValid && !isSmsValid) reason = 'Invalid SMS OTP.';
      res.status(400).json({ error: `${reason} (${remaining} attempts remaining)` });
      return;
    }

    // Dual-OTP verified
    challenge.verified = true;
    activeChallenges.delete(challengeId);

    // Issue 30-minute elevated administrator session token
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

// 3. API: Session status verification (admin only)
app.post('/api/admin/verify-session', authLimiter, adminOnly, (req, res) => {
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

// 4. API: Revoke session (Logout - admin only)
app.post('/api/admin/logout-session', authLimiter, adminOnly, (req, res) => {
  const { sessionToken } = req.body;
  if (sessionToken && activeSessions.has(sessionToken)) {
    activeSessions.delete(sessionToken);
  }
  res.json({ success: true });
});

// 5. API: Dev inspection helper for admin codes (admin only)
app.get('/api/admin/inspect-challenge/:challengeId', authLimiter, adminOnly, (req, res) => {
  const { challengeId } = req.params;
  const challenge = activeChallenges.get(challengeId);
  if (!challenge || Date.now() > challenge.expiresAt) {
    res.status(404).json({ error: 'Challenge not found or expired' });
    return;
  }
  res.json({
    emailOtp: challenge.emailOtp,
    smsOtp: challenge.smsOtp,
    maskedEmail: maskEmail(challenge.adminEmail),
    maskedPhone: maskPhone(challenge.adminPhone)
  });
});

// GET CSRF token for frontend forms
app.get('/api/csrf-token', (req, res) => {
  // csurf will set the csrf cookie automatically on GET if we just call csurf()
  // We need to middleware the request to trigger the cookie setting
  csurf(req as any, {} as any, (err: any) => {
    if (err) {
      res.status(500).json({ error: 'CSRF token generation failed' });
    } else {
      res.json({ csrfToken: req.csrfToken });
    }
  });
});

// Contact form protection endpoint
const contactSchema = z.object({
  sender_name: z.string().trim(). min(1, 'Name is required'). max(100, 'Name too long'),
  sender_email: z.string().trim(). email('Valid email required'). max(120, 'Email too long'),
  subject: z.string(). trim(). max(200, 'Subject too long'). optional(),
  message: z.string(). trim(). min(1, 'Message is required'). max(2000, 'Message too long'),
  honeypot: z.string(). trim(). length(0, 'Spam detected'). optional()
});

app.post('/api/contact', authLimiter, (req, res) => {
  try {
    // Validate against schema
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid contact form data' });
      return;
    }

    const { sender_name, sender_email, subject, message, honeypot } = result.data;

    // Honeypot check - if honeypot field is filled, it's a bot
    if (honeypot && honeypot.trim() !== '') {
      // Return generic success to confirm submission without processing
      res.json({ success: true });
      return;
    }

    // Bot detection: check for suspicious patterns
    const suspiciousPatterns = [
      /(viagra|cialis|pharmacy|pills)/i,
      /(bitcoin|crypto|bitcash)/i,
      /(free.*money|make.*money.*quick)/i,
      /(http|https):\/\//i
    ];

    const combinedText = `${sender_name} ${sender_email} ${subject || ''} ${message}`;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(combinedText)) {
        // Return generic success without processing suspected bot submissions
        res.json({ success: true });
        return;
      }
    }

    // Prevent excessively large payloads (already enforced by Zod max lengths)
    // Additional check for message length in characters
    if (message.length > 2000) {
      res.status(400).json({ error: 'Message too long' });
      return;
    }

    // Sanitize user-provided content - escape HTML special characters
    const sanitizedMessage = message
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, ''');

    // Store contact message in database (only for legitimate submissions)
    // ... (would integrate with Firestore or email service)

    // Return success response
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error processing contact form:', err);
    res.status(500).json({ error: 'Failed to process contact form' });
  }
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
