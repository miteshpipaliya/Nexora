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
});
