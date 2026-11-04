import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBrevoConfig, BrevoServiceError } from '../src/server/brevoMailer';

describe('Brevo Transactional Email Subsystem (WP7)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

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

  it('rejects @gmail.com sender as unverified with EMAIL_NOT_CONFIGURED', () => {
    process.env.BREVO_API_KEY = 'test_key_1234567890';
    process.env.BREVO_SENDER_EMAIL = 'nexora.bvm@gmail.com';

    try {
      getBrevoConfig();
      expect.fail('Should have thrown on gmail sender');
    } catch (err: any) {
      expect(err.code).toBe('EMAIL_NOT_CONFIGURED');
      expect(err.status).toBe(503);
      expect(err.message).toContain('gmail.com');
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
});
