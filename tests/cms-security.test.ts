import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { registerCmsEndpoints } from '../src/server/cmsEndpoints';

describe('CMS security responses', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const router = express.Router();
    registerCmsEndpoints({
      apiRouter: router,
      requireElevatedAdmin: (_request, _response, next) => next(),
      getAdminFirestore: async () => {
        throw new Error('private database connection string: sensitive-provider-host.internal');
      },
      recordAudit: () => undefined,
    });
    app.use('/api', router);
    await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve()));
  });

  it('does not leak internal database errors on competition creation', async () => {
    const response = await fetch(`${baseUrl}/api/admin/competitions`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Security Test Competition' })
    });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to save competition to database.');
    expect(JSON.stringify(body)).not.toContain('sensitive-provider-host.internal');
  });

  it('rejects unsafe library URL schemes before contacting the database', async () => {
    const response = await fetch(`${baseUrl}/api/admin/images`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'javascript:alert(document.cookie)' })
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('valid HTTPS image URL');
  });
});
