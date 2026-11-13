import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

describe('administrator security routes', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.OTP_HMAC_SECRET = 'this-is-a-local-only-test-secret-at-least-32-characters';
    const { app } = await import('../server.ts');
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it('rejects first-time password setup when no one-time code is supplied', async () => {
    const response = await fetch(`${baseUrl}/api/admin/auth/setup-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        newPassword: 'Nexora!SecureAdminPass2026',
        confirmPassword: 'Nexora!SecureAdminPass2026'
      })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'A valid setup code must be requested before setting the password.'
    });
  });

  it('does not expose a public administrator credential wipe route', async () => {
    const response = await fetch(`${baseUrl}/api/admin/auth/reset-credentials`, { method: 'POST' });

    expect(response.status).toBe(404);
  });
  it('clears the administrator cookie when locking an already unauthenticated session', async () => {
    const response = await fetch(`${baseUrl}/api/admin/auth/lock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, revoked: false });
    expect(response.headers.get('set-cookie')).toContain('nexora_admin_session=');
  });

  it('does not acknowledge revocation for a forged administrator cookie', async () => {
    const response = await fetch(`${baseUrl}/api/admin/auth/lock`, {
      method: 'POST',
      headers: { cookie: 'nexora_admin_session=forged.session.signature' }
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it('does not grant credentialed CORS to untrusted origins', async () => {
    const response = await fetch(`${baseUrl}/api/admin/auth/session`, {
      headers: { origin: 'https://evil.example.test' }
    });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('does not reveal Express parsing error internals to API clients', async () => {
    const response = await fetch(`${baseUrl}/api/auth/send-email-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ malformed'
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('An unexpected server error occurred. Please try again.');
    expect(JSON.stringify(data)).not.toContain('SyntaxError');
  });

  it('requires a persisted elevated session for email diagnostics and test sends', async () => {
    const diagnostics = await fetch(`${baseUrl}/api/admin/email-diagnostics`);
    expect(diagnostics.status).toBe(401);
    const testSend = await fetch(`${baseUrl}/api/admin/send-test-email`, { method: 'POST' });
    expect(testSend.status).toBe(401);
  });

  it('authorizes admin image uploads before parsing their bodies', async () => {
    const response = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not valid JSON'
    });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(JSON.stringify(data)).not.toContain('SyntaxError');
  });

  it('rejects a validly signed but unissued/stolen administrator session without a Firestore session record', async () => {
    const payload = {
      email: 'unknown@example.test',
      purpose: 'admin-session',
      exp: Date.now() + 10 * 60_000,
      jti: crypto.randomBytes(16).toString('hex'),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.OTP_HMAC_SECRET!)
      .update(encoded).digest('base64url');
    const unissuedToken = `${encoded}.${signature}`;

    const sessionResponse = await fetch(`${baseUrl}/api/admin/auth/session`, {
      headers: { 'x-admin-session': unissuedToken },
    });
    expect(sessionResponse.status).toBe(200);
    await expect(sessionResponse.json()).resolves.toMatchObject({ authenticated: false });

    const privilegedResponse = await fetch(`${baseUrl}/api/admin/images`, {
      headers: { 'x-admin-session': unissuedToken },
    });
    expect(privilegedResponse.status).toBe(401);
  });

  it('rejects tampered session tokens and a forged founder account claim', async () => {
    const payload = {
      email: 'founder@example.test',
      purpose: 'admin-session',
      exp: Date.now() + 600_000,
      jti: crypto.randomBytes(16).toString('hex'),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const forged = `${encoded}.invalid-signature`;
    const response = await fetch(`${baseUrl}/api/admin/auth/session`, {
      headers: { 'x-admin-session': forged },
    });
    await expect(response.json()).resolves.toMatchObject({ authenticated: false });
  });

  it('rejects an untrusted Origin even with a trusted Referer on admin POST requests', async () => {
    const response = await fetch(`${baseUrl}/api/admin/auth/lock`, {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.test',
        referer: 'https://www.nexora-bvm.online/admin',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: 'CSRF token validation failed.' });
  });

});
