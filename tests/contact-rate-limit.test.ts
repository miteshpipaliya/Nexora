import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { registerContactEndpoints } from '../src/server/contactEndpoint';

vi.mock('../src/server/brevoMailer', () => ({
  sendBrevoContactNotification: vi.fn(async () => undefined)
}));

describe('Persistent contact form throttling', () => {
  let server: Server;
  let baseUrl: string;
  const records = new Map<string, Record<string, any>>();

  const database = {
    collection: (collectionName: string) => ({
      doc: (id: string) => {
        const key = `${collectionName}/${id}`;
        return {
          key,
          get: async () => ({
            exists: records.has(key),
            data: () => records.get(key)
          }),
          update: async (patch: Record<string, unknown>) => {
            records.set(key, { ...records.get(key), ...patch });
          }
        };
      }
    }),
    runTransaction: async (callback: (tx: any) => Promise<any>) => {
      const writes: Array<() => void> = [];
      const transaction = {
        get: async (ref: { key: string }) => ({
          exists: records.has(ref.key),
          data: () => records.get(ref.key)
        }),
        create: (ref: { key: string }, value: Record<string, any>) => {
          writes.push(() => {
            if (records.has(ref.key)) throw new Error('Duplicate document');
            records.set(ref.key, value);
          });
        },
        set: (ref: { key: string }, value: Record<string, any>) => {
          writes.push(() => records.set(ref.key, value));
        }
      };
      const outcome = await callback(transaction);
      writes.forEach((write) => write());
      return outcome;
    }
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const apiRouter = express.Router();
    registerContactEndpoints({
      apiRouter,
      requireElevatedAdmin: (_req, _res, next) => next(),
      getAdminFirestore: async () => database,
      getHmacSecret: () => 'this-is-only-a-nonproduction-test-key-12345678',
      founderEmail: 'founder@example.test'
    });
    app.use('/api', apiRouter);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const send = async (index: number, id = `rate-test-${index}`) => fetch(`${baseUrl}/api/contact/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${index + 1}` },
    body: JSON.stringify({
      name: 'Student Tester',
      email: 'same.student@example.test',
      message: 'A legitimate inquiry with sufficient content for validation.',
      submissionId: id
    })
  });

  it('enforces same-email daily limits across changing IPs, and redacts email from counter paths', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await send(i);
      expect(response.status).toBe(201);
    }
    const limited = await send(5);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect([...records.keys()].filter((key) => key.startsWith('contactRateLimits/'))).not.toContain('contactRateLimits/email_same.student@example.test');
    expect([...records.keys()].some((key) => key.includes('same.student@example.test'))).toBe(false);
  });

  it('returns idempotent success for a prior submission without consuming another quota', async () => {
    const response = await send(20, 'rate-test-0');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true });
  });

  it('silently accepts populated real frontend honeypot without sending or storing', async () => {
    const before = records.size;
    const response = await fetch(`${baseUrl}/api/contact/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ honeypot: 'bot-added', name: 'Bot', email: 'bot@example.test', message: 'A bot message' })
    });
    expect(response.status).toBe(200);
    expect(records.size).toBe(before);
  });
});
