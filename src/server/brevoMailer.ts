/**
 * src/server/brevoMailer.ts
 * Dedicated, resilient Brevo Transactional Email subsystem (Package A / WP7).
 * - Reads BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME at invocation time (trimmed, quotes stripped)
 * - Fails closed on missing credentials or free-mail senders (gmail, yahoo, outlook, hotmail, proton, etc.)
 * - Validates sender domain against Brevo senders/domains cache (5-minute TTL, fails soft on Brevo API lookup)
 * - Uses 10s AbortController timeout
 * - Emits tags: ['otp'] and configured reply-to address
 * - Returns typed BrevoServiceError with safe codes (EMAIL_NOT_CONFIGURED, EMAIL_SENDER_INVALID, EMAIL_PROVIDER_REJECTED, EMAIL_TIMEOUT, EMAIL_RATE_LIMITED)
 */

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  replyToName?: string;
}

export interface BrevoDiagnostics {
  keyAccepted: boolean;
  httpStatus: number;
  configuredSender: string;
  senderVerified: boolean;
  domainAuthenticated: boolean;
  transactionalEnabled: boolean;
  error?: string;
}

export class BrevoServiceError extends Error {
  public code: string;
  public status: number;
  public actionableHint?: string;

  constructor(message: string, code: string, status: number = 502, actionableHint?: string) {
    super(message);
    this.name = 'BrevoServiceError';
    this.code = code;
    this.status = status;
    this.actionableHint = actionableHint;
  }
}

// Banned free-mail domain set
export const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'mail.com',
  'zoho.com'
]);

// 5-minute cache for Brevo domain/sender status
interface BrevoCacheEntry {
  timestamp: number;
  domains: Set<string>;
  senders: Set<string>;
}
let brevoAccountCache: BrevoCacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function stripQuotes(str: string): string {
  return (str || '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Accesses and strictly validates Brevo configuration at call time.
 */
export function getBrevoConfig(): BrevoConfig {
  const apiKey = stripQuotes(process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || '');
  if (!apiKey) {
    console.error('[EMAIL DISPATCH FAILURE] Missing required variable: BREVO_API_KEY');
    throw new BrevoServiceError(
      'Email service is not configured on the server (BREVO_API_KEY missing).',
      'EMAIL_NOT_CONFIGURED',
      503
    );
  }

  const senderEmail = stripQuotes(process.env.BREVO_SENDER_EMAIL || '');
  if (!senderEmail) {
    console.error('[EMAIL DISPATCH FAILURE] Missing required variable: BREVO_SENDER_EMAIL');
    throw new BrevoServiceError(
      'Email sender address is not configured on the server.',
      'EMAIL_NOT_CONFIGURED',
      503
    );
  }

  const domain = (senderEmail.split('@')[1] || '').toLowerCase().trim();
  if (!domain || FREE_MAIL_DOMAINS.has(domain)) {
    console.error(
      `[EMAIL DISPATCH FAILURE] Invalid BREVO_SENDER_EMAIL domain: ${domain || 'none'}. Free-mail senders are rejected by Brevo.`
    );
    throw new BrevoServiceError(
      `Email sender domain invalid. Unverified ${domain || 'free-mail'} sender is not supported by Brevo.`,
      'EMAIL_SENDER_INVALID',
      503,
      'Set BREVO_SENDER_EMAIL to an address on your authenticated domain (e.g., no-reply@nexora-bvm.online).'
    );
  }

  const senderName = stripQuotes(process.env.BREVO_SENDER_NAME || 'NEXORA');
  const replyToEmail = stripQuotes(process.env.BREVO_REPLY_TO_EMAIL || 'miteshpipaliya2202@gmail.com');
  const replyToName = stripQuotes(process.env.BREVO_REPLY_TO_NAME || 'NEXORA Support');

  return { apiKey, senderEmail, senderName, replyToEmail, replyToName };
}

/**
 * Verifies domain and sender status with Brevo API, caching for 5 minutes.
 * Non-blocking: warning logged on error, does not abort sending.
 */
export async function checkBrevoSenderAuth(apiKey: string, senderEmail: string): Promise<{ senderVerified: boolean; domainAuthenticated: boolean }> {
  const now = Date.now();
  const domain = (senderEmail.split('@')[1] || '').toLowerCase().trim();

  if (brevoAccountCache && (now - brevoAccountCache.timestamp < CACHE_TTL_MS)) {
    return {
      senderVerified: brevoAccountCache.senders.has(senderEmail.toLowerCase().trim()),
      domainAuthenticated: brevoAccountCache.domains.has(domain)
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const [sendersRes, domainsRes] = await Promise.allSettled([
      fetch('https://api.brevo.com/v3/senders', {
        headers: { 'api-key': apiKey, 'accept': 'application/json' },
        signal: controller.signal
      }),
      fetch('https://api.brevo.com/v3/senders/domains', {
        headers: { 'api-key': apiKey, 'accept': 'application/json' },
        signal: controller.signal
      })
    ]);

    clearTimeout(timeout);

    const verifiedSenders = new Set<string>();
    const authenticatedDomains = new Set<string>();

    if (sendersRes.status === 'fulfilled' && sendersRes.value.ok) {
      const data: any = await sendersRes.value.json().catch(() => ({}));
      if (Array.isArray(data.senders)) {
        for (const s of data.senders) {
          if (s.email && (s.active !== false)) {
            verifiedSenders.add(String(s.email).toLowerCase().trim());
          }
        }
      }
    }

    if (domainsRes.status === 'fulfilled' && domainsRes.value.ok) {
      const data: any = await domainsRes.value.json().catch(() => ({}));
      if (Array.isArray(data.domains)) {
        for (const d of data.domains) {
          if (d.domain_name && (d.authenticated === true || d.verified === true)) {
            authenticatedDomains.add(String(d.domain_name).toLowerCase().trim());
          }
        }
      }
    }

    brevoAccountCache = {
      timestamp: now,
      senders: verifiedSenders,
      domains: authenticatedDomains
    };

    return {
      senderVerified: verifiedSenders.has(senderEmail.toLowerCase().trim()),
      domainAuthenticated: authenticatedDomains.has(domain)
    };
  } catch (err: any) {
    console.warn('[BREVO DOMAIN CHECK WARNING] Could not verify sender against Brevo API:', err?.message || err);
    return { senderVerified: true, domainAuthenticated: true }; // Treat as warning, let send attempt proceed
  }
}

/**
 * Diagnostics endpoint reporting configuration and authentication state without returning secrets.
 */
export async function getBrevoDiagnostics(): Promise<BrevoDiagnostics> {
  const apiKey = stripQuotes(process.env.BREVO_API_KEY || '');
  const senderEmail = stripQuotes(process.env.BREVO_SENDER_EMAIL || '');

  if (!apiKey || !senderEmail) {
    return {
      keyAccepted: false,
      httpStatus: 503,
      configuredSender: senderEmail || 'NOT_CONFIGURED',
      senderVerified: false,
      domainAuthenticated: false,
      transactionalEnabled: false,
      error: !apiKey ? 'BREVO_API_KEY missing' : 'BREVO_SENDER_EMAIL missing'
    };
  }

  const domain = (senderEmail.split('@')[1] || '').toLowerCase().trim();
  if (FREE_MAIL_DOMAINS.has(domain)) {
    return {
      keyAccepted: true,
      httpStatus: 503,
      configuredSender: senderEmail,
      senderVerified: false,
      domainAuthenticated: false,
      transactionalEnabled: false,
      error: `Sender address uses prohibited free-mail domain: ${domain}`
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey, 'accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        keyAccepted: false,
        httpStatus: res.status,
        configuredSender: senderEmail,
        senderVerified: false,
        domainAuthenticated: false,
        transactionalEnabled: false,
        error: `Brevo API rejected key with HTTP status ${res.status}`
      };
    }

    const authCheck = await checkBrevoSenderAuth(apiKey, senderEmail);

    return {
      keyAccepted: true,
      httpStatus: 200,
      configuredSender: senderEmail,
      senderVerified: authCheck.senderVerified,
      domainAuthenticated: authCheck.domainAuthenticated,
      transactionalEnabled: true
    };
  } catch (err: any) {
    return {
      keyAccepted: false,
      httpStatus: 500,
      configuredSender: senderEmail,
      senderVerified: false,
      domainAuthenticated: false,
      transactionalEnabled: false,
      error: `Connection error during diagnostics: ${err?.message || 'Network failure'}`
    };
  }
}

/**
 * Dispatches an OTP verification email via Brevo with 10-second timeout, tags: ['otp'],
 * and HTML + plain text fallback.
 */
export async function sendBrevoOtpEmail(
  toEmail: string,
  otp: string,
  purpose: 'signup' | 'reset-password' = 'signup'
): Promise<void> {
  const config = getBrevoConfig();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Optional domain authentication sanity check
  checkBrevoSenderAuth(config.apiKey, config.senderEmail).then(({ senderVerified, domainAuthenticated }) => {
    if (!senderVerified || !domainAuthenticated) {
      console.warn(`[BREVO DOMAIN WARNING] ${requestId}: Sender ${config.senderEmail} may not be fully authenticated in Brevo DNS.`);
    }
  }).catch(() => {});

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
                    <p style="margin: 0 0 16px; font-size: 13px; color: #F87171; text-align: center;"><strong>This verification code expires in 5 minutes.</strong></p>
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

  const textContent = `${heading}\n\n${subtext}\n\nYour verification code is:\n\n${otp}\n\nThis verification code expires in 5 minutes.\n\nIf you did not request this code, please ignore this email.\nNever share your verification code with anyone.\n\nNEXORA\nStudent Technology & Innovation Community\nBirla Vishvakarma Mahavidyalaya (BVM)`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: config.senderName, email: config.senderEmail },
        to: [{ email: toEmail }],
        replyTo: config.replyToEmail ? { email: config.replyToEmail, name: config.replyToName || config.senderName } : undefined,
        tags: ['otp'],
        subject,
        htmlContent,
        textContent
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error(`[BREVO DISPATCH FAILED] ${requestId} Status: ${response.status} Message: ${errData.message || 'unknown'}`);
      if (response.status === 401 || response.status === 403) {
        throw new BrevoServiceError('Email service provider rejected authentication. Please notify administrator.', 'EMAIL_PROVIDER_REJECTED', 502);
      }
      if (response.status === 400) {
        const msg = String(errData.message || '').toLowerCase();
        if (msg.includes('sender') || msg.includes('domain') || msg.includes('unverified')) {
          throw new BrevoServiceError('Email sender domain invalid or unverified in Brevo.', 'EMAIL_SENDER_INVALID', 503, 'Set BREVO_SENDER_EMAIL to an address on your authenticated domain.');
        }
        throw new BrevoServiceError('Email service provider rejected payload.', 'EMAIL_PROVIDER_REJECTED', 502);
      }
      if (response.status === 402 || response.status === 429) {
        throw new BrevoServiceError('Email dispatch rate limit reached. Please try again later.', 'EMAIL_RATE_LIMITED', 429);
      }
      throw new BrevoServiceError('Email verification code could not be sent. Please contact support.', 'EMAIL_PROVIDER_REJECTED', 502);
    }
  } catch (fetchErr: any) {
    if (fetchErr.name === 'AbortError' || fetchErr.code === 'ABORT_ERR') {
      console.error(`[BREVO DISPATCH TIMEOUT] ${requestId}: Brevo API took longer than 10s to respond`);
      throw new BrevoServiceError('Email service timed out while dispatching verification code.', 'EMAIL_TIMEOUT', 504);
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}
