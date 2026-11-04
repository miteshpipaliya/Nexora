/**
 * src/server/brevoMailer.ts
 * Dedicated Brevo Transactional Email module (WP7).
 * Strictly validates credentials at call time, enforces custom domain sender (no gmail.com fallback),
 * applies 10s AbortController timeout, and maps error outcomes to safe client codes.
 */

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

export class BrevoServiceError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string, status: number = 502) {
    super(message);
    this.name = 'BrevoServiceError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Accesses and strictly validates Brevo credentials at call time.
 */
export function getBrevoConfig(): BrevoConfig {
  const apiKey = (process.env.BREVO_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    console.error('[EMAIL DISPATCH FAILURE] Missing required variable: BREVO_API_KEY');
    throw new BrevoServiceError('Email service is not configured on the server (BREVO_API_KEY missing).', 'EMAIL_NOT_CONFIGURED', 503);
  }

  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim().replace(/^["']|["']$/g, '');
  if (!senderEmail) {
    console.error('[EMAIL DISPATCH FAILURE] Missing required variable: BREVO_SENDER_EMAIL');
    throw new BrevoServiceError('Email sender address is not configured on the server.', 'EMAIL_NOT_CONFIGURED', 503);
  }

  if (senderEmail.toLowerCase().endsWith('@gmail.com') || senderEmail.toLowerCase().includes('gmail.com')) {
    console.error('[EMAIL DISPATCH FAILURE] Invalid BREVO_SENDER_EMAIL: Brevo transactional email prohibits unverified @gmail.com addresses. Must use a custom domain like no-reply@nexora-bvm.online.');
    throw new BrevoServiceError('Email sender domain invalid. Unverified gmail.com sender is not supported by Brevo.', 'EMAIL_NOT_CONFIGURED', 503);
  }

  const senderName = (process.env.BREVO_SENDER_NAME || 'NEXORA').trim().replace(/^["']|["']$/g, '');
  return { apiKey, senderEmail, senderName };
}

/**
 * Dispatches an OTP transactional email via Brevo with 10-second timeout.
 */
export async function sendBrevoOtpEmail(
  toEmail: string,
  otp: string,
  purpose: 'signup' | 'reset-password' = 'signup'
): Promise<void> {
  const config = getBrevoConfig();

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
        subject,
        htmlContent,
        textContent
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[BREVO DISPATCH FAILED] Status:', response.status, 'Message:', errData.message);
      if (response.status === 401 || response.status === 403) {
        throw new BrevoServiceError('Email service provider rejected authentication. Please notify administrator.', 'EMAIL_PROVIDER_REJECTED', 502);
      }
      if (response.status === 402 || response.status === 429) {
        throw new BrevoServiceError('Email dispatch rate limit reached. Please try again later.', 'EMAIL_RATE_LIMITED', 429);
      }
      throw new BrevoServiceError('Email verification code could not be sent. Please contact support.', 'EMAIL_PROVIDER_REJECTED', 502);
    }
  } catch (fetchErr: any) {
    if (fetchErr.name === 'AbortError' || fetchErr.code === 'ABORT_ERR') {
      console.error('[BREVO DISPATCH TIMEOUT] Brevo API took longer than 10s to respond');
      throw new BrevoServiceError('Email service timed out while dispatching verification code.', 'EMAIL_TIMEOUT', 504);
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}
