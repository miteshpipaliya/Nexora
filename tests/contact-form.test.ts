import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

describe('Contact Form Endpoint (/api/contact/submit)', () => {
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

  it('rejects invalid or missing required contact fields with 400', async () => {
    const res = await fetch(`${baseUrl}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short (< 2)
        email: 'not-an-email',
        message: 'short' // too short (< 10)
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it('silently traps bot spam when honeypot field is filled', async () => {
    const res = await fetch(`${baseUrl}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Spam Bot',
        email: 'bot@example.com',
        message: 'This is a spam message from an automated bot script.',
        honeypot: 'filled_by_bot_crawler'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('received');
  });

  it('enforces 401 unauthorized on admin email retry endpoint without elevated session', async () => {
    const res = await fetch(`${baseUrl}/api/admin/contact-messages/some-id/retry-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.status).toBe(401);
  });
});
