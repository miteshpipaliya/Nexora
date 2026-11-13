import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

describe('administrator security routes', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
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

});
