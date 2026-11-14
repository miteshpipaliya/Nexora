import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import crypto from 'node:crypto';
import { registerPaymentEndpoints } from '../src/server/paymentEndpoints';

describe('Razorpay server-side payment boundaries (no live gateway)', () => {
  const app = express();
  app.use(express.json());
  const apiRouter = express.Router();
  const uid = 'test-student-uid';
  const slug = 'test-competition';
  const registrationId = 'reg_' + crypto.createHash('sha256').update(uid + ':' + slug).digest('hex').slice(0, 32);
  const records: Record<string, Record<string, any>> = {
    ['events/' + slug]: { status: 'Published', registration_open: true, payment_enabled: false, fee_per_participant: 50 },
    ['registrations/' + registrationId]: { user_id: uid, event_slug: slug, participant_count: 1, payment_status: 'Pending Verification' },
    'payments/order_test123': { user_id: uid, event_slug: slug, registration_id: registrationId, amount_paise: 5000, currency: 'INR' }
  };
  const getRef = (collection: string, id: string) => ({
    id,
    get: async () => ({ exists: Boolean(records[collection + '/' + id]), data: () => records[collection + '/' + id] })
  });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => getRef(name, id) }),
    runTransaction: async (fn: (tx: any) => Promise<any>) => fn({ get: (ref: any) => ref.get() })
  };
  registerPaymentEndpoints({
    apiRouter,
    getAdminFirestore: async () => db,
    getAdminAuth: async () => ({
      verifyIdToken: async (token: string) => {
        if (token !== 'valid-test-token') throw new Error('Invalid token');
        return { uid, email: 'student@example.com' };
      }
    })
  });
  app.use('/api', apiRouter);
  let server: ReturnType<typeof app.listen>;
  let origin: string;
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Unable to run tests');
    origin = 'http://127.0.0.1:' + address.port;
  });
  afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });
  async function post(route: string, body: object, authorization?: string) {
    return fetch(origin + '/api/payments/' + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: 'Bearer ' + authorization } : {}) },
      body: JSON.stringify(body)
    });
  }

  it('requires a Firebase token before creating orders', async () => {
    const res = await post('create-order', { event_slug: slug });
    expect(res.status).toBe(401);
  });
  it('rejects invalid Firebase tokens', async () => {
    const res = await post('create-order', { event_slug: slug }, 'invalid');
    expect(res.status).toBe(401);
  });
  it('rejects invalid competition slugs', async () => {
    const res = await post('create-order', { event_slug: '../unsafe' }, 'valid-test-token');
    expect(res.status).toBe(400);
  });
  it('forbids online payments for competitions whose payment toggle is off', async () => {
    const res = await post('create-order', { event_slug: slug }, 'valid-test-token');
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('PAYMENT_DISABLED');
  });
  it('never accepts a claimed payment without authentication', async () => {
    const res = await post('verify', { razorpay_order_id: 'order_test123', razorpay_payment_id: 'pay_test123', razorpay_signature: 'a'.repeat(64) });
    expect(res.status).toBe(401);
  });
  it('rejects a forged payment signature before contacting the gateway', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = 'fake-test-secret-for-unit-tests-only';
    const res = await post('verify', { razorpay_order_id: 'order_test123', razorpay_payment_id: 'pay_test123', razorpay_signature: 'a'.repeat(64) }, 'valid-test-token');
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('PAYMENT_MISMATCH');
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });
});
