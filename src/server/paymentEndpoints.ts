import crypto from 'node:crypto';
import express, { type Router, type Request, type Response } from 'express';
import { z } from 'zod';

type Deps = { apiRouter: Router; getAdminFirestore: () => Promise<any>; getAdminAuth: () => Promise<any> };
type Authenticated = { uid: string; email?: string };
const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/);
const bodySchema = z.object({ event_slug: slugSchema });
const verifySchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i)
});
const money = (fee: unknown) => {
  const n = Number(fee);
  if (!Number.isFinite(n) || n < 0 || n > 100000 || !Number.isInteger(n * 100)) throw new Error('INVALID_FEE');
  return Math.round(n * 100);
};
function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.startsWith('rzp_test_') || !secret) throw new Error('PAYMENT_NOT_CONFIGURED');
  return { keyId, secret };
}
async function razorpayRequest(method: 'GET' | 'POST', path: string, payload?: object) {
  const { keyId, secret } = credentials();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://api.razorpay.com/v1' + path, {
      method,
      headers: {
        Authorization: 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64'),
        'Content-Type': 'application/json'
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal
    });
    if (!response.ok) throw new Error('PAYMENT_GATEWAY_UNAVAILABLE');
    return await response.json() as Record<string, any>;
  } finally { clearTimeout(timeout); }
}
const constantEqual = (a: string, b: string) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
async function auth(req: Request, deps: Deps): Promise<Authenticated> {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) throw new Error('UNAUTHORIZED');
  const admin = await deps.getAdminAuth();
  if (!admin) throw new Error('SERVICE_UNAVAILABLE');
  try {
    const decoded = await admin.verifyIdToken(token, true);
    if (!decoded?.uid) throw new Error('UNAUTHORIZED');
    return { uid: decoded.uid, email: decoded.email };
  } catch { throw new Error('UNAUTHORIZED'); }
}
function fail(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : 'INTERNAL';
  const map: Record<string, [number, string]> = {
    UNAUTHORIZED: [401, 'Sign in to continue.'],
    SERVICE_UNAVAILABLE: [503, 'Payment service is temporarily unavailable.'],
    PAYMENT_NOT_CONFIGURED: [503, 'Test payments are not configured yet.'],
    PAYMENT_GATEWAY_UNAVAILABLE: [503, 'Payment gateway is unavailable. Please retry later.'],
    INVALID_FEE: [400, 'Competition fee is invalid.'],
    NOT_FOUND: [404, 'Competition or registration was not found.'],
    REGISTRATION_CLOSED: [403, 'Registration is closed.'],
    PAYMENT_DISABLED: [403, 'Online payment is not enabled for this competition.'],
    FREE_REGISTRATION: [400, 'This competition does not require online payment.'],
    ALREADY_PAID: [409, 'This registration has already been paid.'],
    ORDER_PENDING: [409, 'Payment order is already being created. Please retry shortly.'],
    PAYMENT_MISMATCH: [400, 'Payment verification failed.'],
    PAYMENT_NOT_CAPTURED: [409, 'Payment has not been captured yet.'],
  };
  const [status, message] = map[code] || [500, 'Unable to process payment safely.'];
  if (status >= 500) console.error('[PAYMENTS]', code in map ? code : 'INTERNAL');
  res.status(status).json({ success: false, error: message, code: code in map ? code : 'INTERNAL' });
}
const paymentDoc = (db: any, orderId: string) => db.collection('payments').doc(orderId);
const registrationIdFor = (uid: string, slug: string) => 'reg_' + crypto.createHash('sha256').update(uid + ':' + slug).digest('hex').slice(0, 32);

async function settle(db: any, orderId: string, paymentId: string, status: 'captured' | 'failed') {
  const ref = paymentDoc(db, orderId);
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('NOT_FOUND');
    const payment = snap.data();
    const regRef = db.collection('registrations').doc(payment.registration_id);
    const regSnap = await tx.get(regRef);
    if (!regSnap.exists) throw new Error('NOT_FOUND');
    const reg = regSnap.data();
    if (reg.user_id !== payment.user_id || reg.event_slug !== payment.event_slug) throw new Error('PAYMENT_MISMATCH');
    if (payment.status === 'captured') {
      if (payment.razorpay_payment_id !== paymentId) throw new Error('PAYMENT_MISMATCH');
      return { alreadyVerified: true };
    }
    if (status === 'captured') {
      if (reg.payment_status === 'Verified' && reg.razorpay_order_id !== orderId) throw new Error('ALREADY_PAID');
      tx.update(ref, { status: 'captured', razorpay_payment_id: paymentId, updated_at: new Date().toISOString() });
      tx.update(regRef, { registration_status: 'Confirmed', payment_status: 'Verified', razorpay_order_id: orderId, razorpay_payment_id: paymentId, fee_paid: payment.amount_paise / 100, updated_at: new Date().toISOString() });
    } else if (payment.status !== 'failed') {
      tx.update(ref, { status: 'failed', updated_at: new Date().toISOString() });
    }
    return { alreadyVerified: false };
  });
}

export function registerPaymentEndpoints(deps: Deps) {
  const { apiRouter, getAdminFirestore } = deps;

  // Mounted before global JSON parser; Razorpay signs the exact raw bytes.
  apiRouter.post('/payments/webhook', express.raw({ type: 'application/json', limit: '100kb' }), async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret || !Buffer.isBuffer(req.body)) { res.status(503).json({ error: 'Webhook unavailable.' }); return; }
      const signature = req.header('x-razorpay-signature') || '';
      const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
      if (!constantEqual(signature, expected)) { res.status(401).json({ error: 'Invalid signature.' }); return; }
      const event = JSON.parse(req.body.toString('utf8'));
      const eventId = String(req.header('x-razorpay-event-id') || '');
      if (!eventId || eventId.length > 128) { res.status(400).json({ error: 'Invalid event ID.' }); return; }
      const db = await getAdminFirestore();
      if (!db) throw new Error('SERVICE_UNAVAILABLE');
      const eventRef = db.collection('payment_webhook_events').doc(crypto.createHash('sha256').update(eventId).digest('hex'));
      const exists = await eventRef.get();
      if (exists.exists) { res.json({ success: true, duplicate: true }); return; }
      const kind = String(event.event || '');
      const pay = event.payload?.payment?.entity || {};
      const order = event.payload?.order?.entity || {};
      const orderId = String(pay.order_id || order.id || '');
      if (['payment.captured', 'order.paid'].includes(kind) && /^order_[A-Za-z0-9]+$/.test(orderId)) {
        const stored = await paymentDoc(db, orderId).get();
        if (!stored.exists) { res.status(503).json({ error: 'Payment is not available for reconciliation.' }); return; }
        const paymentId = String(pay.id || stored.data()?.razorpay_payment_id || '');
        let trusted: Record<string, any> | undefined;
        if (/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
          trusted = await razorpayRequest('GET', '/payments/' + paymentId);
        } else {
          // order.paid events may omit a payment entity: consult the gateway's captured payments.
          const gatewayPayments = await razorpayRequest('GET', '/orders/' + orderId + '/payments');
          trusted = Array.isArray(gatewayPayments.items) ? gatewayPayments.items.find((item: any) =>
            item.status === 'captured' && item.order_id === orderId &&
            item.amount === stored.data()?.amount_paise && item.currency === 'INR'
          ) : undefined;
        }
        if (!trusted || trusted.order_id !== orderId || trusted.status !== 'captured' || trusted.amount !== stored.data()?.amount_paise || trusted.currency !== 'INR' || !/^pay_[A-Za-z0-9]+$/.test(String(trusted.id || ''))) throw new Error('PAYMENT_MISMATCH');
        await settle(db, orderId, trusted.id, 'captured');
      }
      if (kind === 'payment.failed' && /^order_[A-Za-z0-9]+$/.test(orderId) && /^pay_[A-Za-z0-9]+$/.test(pay.id || '')) {
        const stored = await paymentDoc(db, orderId).get();
        if (stored.exists) await settle(db, orderId, pay.id, 'failed');
      }
      await eventRef.create({ event_type: kind, processed_at: new Date().toISOString() }).catch((e: any) => { if (e?.code !== 6) throw e; });
      res.json({ success: true });
    } catch (err) { fail(res, err); }
  });

  apiRouter.post('/payments/create-order', async (req, res) => {
    try {
      const identity = await auth(req, deps);
      const { event_slug: slug } = bodySchema.parse(req.body);
      const db = await getAdminFirestore();
      if (!db) throw new Error('SERVICE_UNAVAILABLE');
      const eventRef = db.collection('events').doc(slug);
      const regRef = db.collection('registrations').doc(registrationIdFor(identity.uid, slug));
      const intentRef = db.collection('payment_order_intents').doc(regRef.id);
      const leaseId = crypto.randomUUID();
      const preparation = await db.runTransaction(async (tx: any) => {
        const [eventSnap, regSnap, intentSnap] = await Promise.all([tx.get(eventRef), tx.get(regRef), tx.get(intentRef)]);
        if (!eventSnap.exists || !regSnap.exists) throw new Error('NOT_FOUND');
        const event = eventSnap.data(), reg = regSnap.data();
        if (reg.user_id !== identity.uid || reg.event_slug !== slug || reg.registration_status === 'Cancelled') throw new Error('UNAUTHORIZED');
        if (event.isComingSoon || event.status !== 'Published' || event.registration_open === false) throw new Error('REGISTRATION_CLOSED');
        if (event.payment_enabled !== true) throw new Error('PAYMENT_DISABLED');
        if (reg.payment_status === 'Verified') throw new Error('ALREADY_PAID');
        // A previously opened order always uses its immutable fee snapshot.
        if (intentSnap.exists) {
          const old = intentSnap.data();
          if (old.state === 'ready' && old.order_id) return { existingOrder: old.order_id, amount: old.amount_paise };
          if (old.state === 'creating' && Date.now() - old.started_at < 120000) throw new Error('ORDER_PENDING');
        }
        const count = Math.max(1, Math.floor(Number(reg.participant_count) || 1));
        const amount = money(event.fee_per_participant) * count;
        if (!amount) throw new Error('FREE_REGISTRATION');
        tx.set(intentRef, { state: 'creating', lease_id: leaseId, started_at: Date.now(), user_id: identity.uid, event_slug: slug, amount_paise: amount });
        return { amount };
      });
      if ('existingOrder' in preparation) {
        res.json({ success: true, order_id: preparation.existingOrder, amount: preparation.amount, currency: 'INR', key_id: credentials().keyId }); return;
      }
      let order: Record<string, any>;
      try {
        order = await razorpayRequest('POST', '/orders', { amount: preparation.amount, currency: 'INR', receipt: regRef.id.slice(0, 40), notes: { competition: slug } });
      } catch (e) {
        await intentRef.update({ state: 'failed', updated_at: Date.now() }).catch(() => {});
        throw e;
      }
      await db.runTransaction(async (tx: any) => {
        const intent = await tx.get(intentRef);
        if (!intent.exists || intent.data().lease_id !== leaseId) throw new Error('ORDER_PENDING');
        tx.set(paymentDoc(db, order.id), { order_id: order.id, user_id: identity.uid, registration_id: regRef.id, event_slug: slug, amount_paise: preparation.amount, currency: 'INR', status: 'created', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        tx.update(intentRef, { state: 'ready', order_id: order.id, updated_at: Date.now() });
      });
      res.json({ success: true, order_id: order.id, amount: preparation.amount, currency: 'INR', key_id: credentials().keyId });
    } catch (e) { if (e instanceof z.ZodError) { res.status(400).json({ error: 'Invalid competition ID.' }); return; } fail(res, e); }
  });

  apiRouter.post('/payments/verify', async (req, res) => {
    try {
      const identity = await auth(req, deps);
      const body = verifySchema.parse(req.body);
      const db = await getAdminFirestore();
      if (!db) throw new Error('SERVICE_UNAVAILABLE');
      const ref = paymentDoc(db, body.razorpay_order_id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error('NOT_FOUND');
      const payment = snap.data();
      if (payment.user_id !== identity.uid) throw new Error('UNAUTHORIZED');
      const signature = crypto.createHmac('sha256', credentials().secret).update(body.razorpay_order_id + '|' + body.razorpay_payment_id).digest('hex');
      if (!constantEqual(signature, body.razorpay_signature)) throw new Error('PAYMENT_MISMATCH');
      const trusted = await razorpayRequest('GET', '/payments/' + body.razorpay_payment_id);
      if (trusted.order_id !== body.razorpay_order_id || trusted.status !== 'captured' || trusted.amount !== payment.amount_paise || trusted.currency !== 'INR') throw new Error('PAYMENT_NOT_CAPTURED');
      const result = await settle(db, body.razorpay_order_id, body.razorpay_payment_id, 'captured');
      res.json({ success: true, verified: true, ...result });
    } catch (e) { if (e instanceof z.ZodError) { res.status(400).json({ error: 'Invalid payment information.' }); return; } fail(res, e); }
  });
}
