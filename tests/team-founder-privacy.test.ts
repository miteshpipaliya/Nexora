import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { registerCmsEndpoints } from '../src/server/cmsEndpoints';

describe('Founder-only public team privacy', () => {
  let server: Server;
  let baseUrl: string;
  const fakeMembers = [
    { id: 'founder', name: 'Founder Student', is_founder: true, enabled: true, role_name: 'Founder', department_name: 'Computer Engineering', display_order: 10, bio: 'Founder bio' },
    { id: 'faculty-advisor', name: 'Private Mentor', role_key: 'faculty_1', is_founder: false, enabled: true, visibility_approved: true, role_name: 'Faculty Member', enrollment_number: 'PRIVATE123', display_order: 1 },
    { id: 'member', name: 'Private Member', is_founder: false, enabled: true, visibility_approved: true, role_name: 'Lead', enrollment_number: 'PRIVATE987', display_order: 2 }
  ];
  beforeAll(async () => {
    const app = express();
    const router = express.Router();
    registerCmsEndpoints({
      apiRouter: router,
      requireElevatedAdmin: (_req, _res, next) => next(),
      getAdminFirestore: async () => ({
        collection: (name: string) => {
          if (name === 'teamMembers') return {
            get: async () => ({
              empty: false,
              docs: fakeMembers.map(m => ({ id: m.id, data: () => m }))
            })
          };
          if (name === 'teamConfig') return {
            doc: () => ({ get: async () => ({ exists: false }) })
          };
          throw new Error('Unexpected test collection');
        }
      }),
      recordAudit: () => undefined
    });
    app.use('/api', router);
    await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  it('never sends faculty or other existing published profiles to unauthenticated visitors', async () => {
    const response = await fetch(`${baseUrl}/api/team/public`);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.members).toHaveLength(1);
    expect(payload.members[0]).toMatchObject({ id: 'founder', name: 'Founder Student' });
    expect(JSON.stringify(payload)).not.toContain('Private Mentor');
    expect(JSON.stringify(payload)).not.toContain('PRIVATE123');
    expect(JSON.stringify(payload)).not.toContain('Private Member');
  });
});
