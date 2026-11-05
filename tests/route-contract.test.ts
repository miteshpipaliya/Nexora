import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

describe('API Route Contract Verification', () => {
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
    if (server) await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  });

  it('proves /api/health is live and returns status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('proves /api/contact/submit is a registered route and does NOT return 404', async () => {
    const res = await fetch(`${baseUrl}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    // Should return 400 validation error, not 404 "API route not found"
    expect(res.status).not.toBe(404);
  });

  it('proves /api/admin/presence is a registered route and requires auth (not 404)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/presence`);
    expect(res.status).not.toBe(404);
    expect(res.status).toBe(401);
  });
});
