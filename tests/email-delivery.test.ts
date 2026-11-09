import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBrevoConfig, sendBrevoOtpEmail, getBrevoDiagnostics, BrevoServiceError } from '../src/server/brevoMailer';

describe('Brevo Transactional Email Subsystem (Package A)', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Configuration Validation', () => {
    it('rejects unconfigured BREVO_API_KEY with EMAIL_NOT_CONFIGURED status 503', () => {
      delete process.env.BREVO_API_KEY;
      process.env.BREVO_SENDER_EMAIL = 'no-reply@nexora-bvm.online';

      try {
        getBrevoConfig();
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('EMAIL_NOT_CONFIGURED');
        expect(err.status).toBe(503);
      }
    });

    it('rejects missing BREVO_SENDER_EMAIL with EMAIL_NOT_CONFIGURED status 503', () => {
      process.env.BREVO_API_KEY = 'test_key_1234567890';
      delete process.env.BREVO_SENDER_EMAIL;

      try {
        getBrevoConfig();
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('EMAIL_NOT_CONFIGURED');
        expect(err.status).toBe(503);
      }
    });

    it('rejects free-mail senders (@gmail.com, @yahoo.com) with EMAIL_SENDER_INVALID and status 503', () => {
      process.env.BREVO_API_KEY = 'test_key_1234567890';
      process.env.BREVO_SENDER_EMAIL = 'nexora.bvm@gmail.com';

      try {
        getBrevoConfig();
        expect.fail('Should have thrown on gmail sender');
      } catch (err: any) {
        expect(err.code).toBe('EMAIL_SENDER_INVALID');
        expect(err.status).toBe(503);
        expect(err.actionableHint).toContain('authenticated domain');
      }

      process.env.BREVO_SENDER_EMAIL = 'nexora@yahoo.com';
      try {
        getBrevoConfig();
        expect.fail('Should have thrown on yahoo sender');
      } catch (err: any) {
        expect(err.code).toBe('EMAIL_SENDER_INVALID');
        expect(err.status).toBe(503);
      }
    });

    it('accepts custom domain sender and trims quotes and whitespace', () => {
      process.env.BREVO_API_KEY = '  "xkeysib-test-123456789"  ';
      process.env.BREVO_SENDER_EMAIL = ' "no-reply@nexora-bvm.online" ';
      process.env.BREVO_SENDER_NAME = ' "NEXORA BVM" ';

      const config = getBrevoConfig();
      expect(config.apiKey).toBe('xkeysib-test-123456789');
      expect(config.senderEmail).toBe('no-reply@nexora-bvm.online');
      expect(config.senderName).toBe('NEXORA BVM');
    });

    it('uses BREVO_REPLY_TO and does not fall back to an unrelated personal address', () => {
      process.env.BREVO_API_KEY = 'test_key_1234567890';
      process.env.BREVO_SENDER_EMAIL = 'no-reply@nexora-bvm.online';
      process.env.BREVO_REPLY_TO = 'nexora.bvm@gmail.com';
      delete process.env.BREVO_REPLY_TO_EMAIL;

      expect(getBrevoConfig().replyToEmail).toBe('nexora.bvm@gmail.com');

      delete process.env.BREVO_REPLY_TO;
      delete process.env.BREVO_REPLY_TO_EMAIL;
      expect(getBrevoConfig().replyToEmail).toBeUndefined();
    });
  });

  describe('Mocked Dispatch Responses', () => {
    beforeEach(() => {
      process.env.BREVO_API_KEY = 'xkeysib-valid-key';
      process.env.BREVO_SENDER_EMAIL = 'no-reply@nexora-bvm.online';
    });

    it('succeeds on Brevo 200/201 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<test-message-id>' })
      });

      await expect(sendBrevoOtpEmail('student@bvm.edu', '123456', 'signup')).resolves.toBeUndefined();
    });

    it('sends administrator-specific branded copy with the configured reply-to and three-minute expiry', async () => {
      process.env.BREVO_REPLY_TO = 'nexora.bvm@gmail.com';
      const calls: Array<{ url: string; init?: RequestInit }> = [];
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        return {
          ok: true,
          status: url.endsWith('/smtp/email') ? 201 : 200,
          json: async () => ({ senders: [], domains: [] })
        } as Response;
      });

      await sendBrevoOtpEmail('founder@example.com', '123456', 'admin-setup');
      const send = calls.find((call) => call.url.endsWith('/smtp/email'));
      const body = JSON.parse(String(send?.init?.body));
      expect(body.replyTo.email).toBe('nexora.bvm@gmail.com');
      expect(body.subject).toContain('Administrator Setup');
      expect(body.htmlContent).toContain('expires in 3 minutes');
      expect(body.textContent).toContain('expires in 3 minutes');
      expect(body.htmlContent).toContain('123456');
      expect(body.textContent).toContain('123456');
    });

    it('rejects malformed recipients and non-six-digit codes before provider calls', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      await expect(sendBrevoOtpEmail('not-an-email', '123456', 'signup'))
        .rejects.toMatchObject({ code: 'EMAIL_INVALID_RECIPIENT', status: 400 });
      await expect(sendBrevoOtpEmail('student@bvm.edu', '<script', 'signup'))
        .rejects.toMatchObject({ code: 'OTP_INVALID', status: 400 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('maps 401/403 to EMAIL_PROVIDER_REJECTED with status 502', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ code: 'unauthorized', message: 'Key not valid' })
      });

      await expect(sendBrevoOtpEmail('student@bvm.edu', '123456', 'signup'))
        .rejects.toMatchObject({ code: 'EMAIL_PROVIDER_REJECTED', status: 502 });
    });

    it('maps 400 sender unverified to EMAIL_SENDER_INVALID with status 503', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 'bad_request', message: 'Sender domain not verified' })
      });

      await expect(sendBrevoOtpEmail('student@bvm.edu', '123456', 'reset-password'))
        .rejects.toMatchObject({ code: 'EMAIL_SENDER_INVALID', status: 503 });
    });

    it('maps 429 to EMAIL_RATE_LIMITED with status 429', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ code: 'reseller_limit_exceeded', message: 'Daily limit reached' })
      });

      await expect(sendBrevoOtpEmail('student@bvm.edu', '123456', 'signup'))
        .rejects.toMatchObject({ code: 'EMAIL_RATE_LIMITED', status: 429 });
    });

    it('maps timeout to EMAIL_TIMEOUT with status 504', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The user aborted a request.');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(sendBrevoOtpEmail('student@bvm.edu', '123456', 'signup'))
        .rejects.toMatchObject({ code: 'EMAIL_TIMEOUT', status: 504 });
    });

    it('maps network fetch rejection gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('DNS lookup failed'));

      await expect(sendBrevoOtpEmail('student@bvm.edu', '123456', 'signup'))
        .rejects.toMatchObject({ code: 'EMAIL_PROVIDER_UNAVAILABLE', status: 502 });
    });
  });

  describe('Diagnostics Reporting (Never Returns Secrets)', () => {
    it('returns diagnostics structure without leaking API key', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-secret-key-12345';
      process.env.BREVO_SENDER_EMAIL = 'no-reply@nexora-bvm.online';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ email: 'founder@nexora.org', plan: [] })
      });

      const diag = await getBrevoDiagnostics();
      expect(diag.keyAccepted).toBe(true);
      expect(diag.httpStatus).toBe(200);
      expect(diag.configuredSender).toBe('no-reply@nexora-bvm.online');
      expect((diag as any).apiKey).toBeUndefined();
    });
  });
});
