import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { sendBrevoContactNotification } from './brevoMailer';

interface ContactEndpointDeps {
  apiRouter: express.Router;
  requireElevatedAdmin: express.RequestHandler;
  getAdminFirestore: () => Promise<any>;
  getHmacSecret: () => string;
  recordAudit?: (action: string, details: any, actor?: string) => void;
  founderEmail: string;
}

// Per-IP, per-email, and daily limits are enforced in a Firestore transaction
// below so limits cannot be bypassed by switching serverless instances.
function emailHashKey(email: string): string {
  return email.toLowerCase().trim();
}

function cleanPlainText(input: string): string {
  // Strip control characters while preserving standard whitespace
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

const contactRequestSchema = z.object({
  name: z.string().optional(),
  sender_name: z.string().optional(),
  email: z.string().optional(),
  sender_email: z.string().optional(),
  subject: z.string().max(150).optional(),
  message: z.string(),
  submissionId: z.string().max(128).optional(),
  website: z.string().max(100).optional(), // Honeypot
  hp: z.string().max(100).optional(), // Honeypot alias
  honeypot: z.string().max(100).optional() // Public contact form field
});

export function registerContactEndpoints(deps: ContactEndpointDeps) {
  const {
    apiRouter,
    requireElevatedAdmin,
    getAdminFirestore,
    getHmacSecret,
    recordAudit,
    founderEmail
  } = deps;

  /**
   * POST /api/contact/submit
   * Public rate-limited submission endpoint with idempotency and Brevo email notification
   */
  apiRouter.post(['/contact/submit', '/contact'], async (req, res) => {
    try {
      // 1. Zod schema validation
      const parseResult = contactRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request data. Please check required fields.',
          details: parseResult.error.flatten().fieldErrors
        });
        return;
      }

      const body = parseResult.data;

      // Honeypot detection (silent 200 acceptance without storing or sending email)
      if ((body.website && body.website.trim().length > 0) || (body.hp && body.hp.trim().length > 0) || (body.honeypot && body.honeypot.trim().length > 0)) {
        res.status(200).json({
          success: true,
          id: body.submissionId || `msg_${Date.now()}`,
          message: 'Your message has been received. The NEXORA team will review it.'
        });
        return;
      }

      const rawName = body.name || body.sender_name || '';
      const rawEmail = body.email || body.sender_email || '';
      const rawSubject = body.subject || 'NEXORA General Inquiry';
      const rawMessage = body.message || '';

      const cleanName = cleanPlainText(rawName);
      const cleanEmail = cleanPlainText(rawEmail).toLowerCase();
      const cleanSubject = cleanPlainText(rawSubject);
      const cleanMessage = cleanPlainText(rawMessage);

      if (cleanName.length < 2 || cleanName.length > 80) {
        res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
        res.status(400).json({ error: 'A valid email address is required.' });
        return;
      }
      if (cleanMessage.length < 10 || cleanMessage.length > 2000) {
        res.status(400).json({ error: 'Message must be between 10 and 2000 characters.' });
        return;
      }

      // 2. Salted HMAC IP Hash (raw IP is never stored)
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
        .split(',')[0]
        .trim();
      const ipHash = crypto
        .createHmac('sha256', getHmacSecret())
        .update(`contact_ip:${clientIp}`)
        .digest('hex')
        .slice(0, 32);

      // 3. Persistent Firestore Storage
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Message storage is temporarily unavailable. Please try again later.' });
        return;
      }

      // Idempotency key: use client submissionId or generate deterministic ID
      const submissionId = body.submissionId && /^[a-zA-Z0-9_\-]+$/.test(body.submissionId)
        ? body.submissionId
        : `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const messageRef = db.collection('contactMessages').doc(submissionId);
      const nowIso = new Date().toISOString();
      const messageDoc = {
        id: submissionId,
        sender_name: cleanName,
        sender_email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        status: 'unread',
        created_at: nowIso,
        delivery_status: 'stored',
        email_attempts: 0,
        ip_hash: ipHash
      };

      const limitCollection = db.collection('contactRateLimits');
      const ipCounter = limitCollection.doc(`ip_${ipHash}`);
      const emailCounter = limitCollection.doc(`email_${emailHashKey(cleanEmail)}`);
      const globalCounter = limitCollection.doc('daily_global');
      const now = Date.now();

      const outcome = await db.runTransaction(async (transaction: any) => {
        // Firestore requires all reads before any writes.
        const [existing, ipSnap, emailSnap, globalSnap] = await Promise.all([
          transaction.get(messageRef),
          transaction.get(ipCounter),
          transaction.get(emailCounter),
          transaction.get(globalCounter)
        ]);
        if (existing.exists) return { status: 'duplicate' as const };

        const limits = [
          { ref: ipCounter, snap: ipSnap, max: 3, windowMs: 10 * 60 * 1000 },
          { ref: emailCounter, snap: emailSnap, max: 5, windowMs: 24 * 60 * 60 * 1000 },
          { ref: globalCounter, snap: globalSnap, max: 200, windowMs: 24 * 60 * 60 * 1000 }
        ];
        let retryAfterSeconds = 0;
        const counters = limits.map((limit) => {
          const current = limit.snap.exists ? limit.snap.data() : null;
          const resetAt = current && Number(current.resetAt) > now
            ? Number(current.resetAt) : now + limit.windowMs;
          const count = resetAt === Number(current?.resetAt) ? Number(current?.count || 0) : 0;
          if (count >= limit.max) {
            retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil((resetAt - now) / 1000));
          }
          return { ref: limit.ref, count, resetAt };
        });
        if (retryAfterSeconds) return { status: 'rate_limited' as const, retryAfterSeconds };

        transaction.create(messageRef, messageDoc);
        for (const counter of counters) {
          transaction.set(counter.ref, { count: counter.count + 1, resetAt: counter.resetAt });
        }
        return { status: 'stored' as const };
      });

      if (outcome.status === 'duplicate') {
        res.status(200).json({
          success: true, id: submissionId, duplicate: true,
          message: 'Your message has been received. The NEXORA team will review it.'
        });
        return;
      }
      if (outcome.status === 'rate_limited') {
        res.set('Retry-After', String(outcome.retryAfterSeconds));
        res.status(429).json({
          error: 'Too many messages sent. Please try again later.',
          retryAfterSeconds: outcome.retryAfterSeconds
        });
        return;
      }

      // 4. Dispatch Email Notification via Brevo
      const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL?.trim() || founderEmail;
      let emailSent = false;

      try {
        await sendBrevoContactNotification(notifyEmail, {
          senderName: cleanName,
          senderEmail: cleanEmail,
          subject: cleanSubject,
          message: cleanMessage,
          messageId: submissionId,
          createdAt: nowIso
        });
        emailSent = true;
        await messageRef.update({
          delivery_status: 'email_sent',
          email_attempts: 1,
          delivered_at: new Date().toISOString()
        }).catch(() => {});
      } catch (emailErr: any) {
        console.warn('[CONTACT EMAIL NOTICE] Notification dispatch bypassed:', emailErr?.message || emailErr);
        await messageRef.update({
          delivery_status: 'email_failed',
          email_attempts: 1,
          last_email_error: String(emailErr?.message || 'Email dispatch failed').slice(0, 200)
        }).catch(() => {});
      }

      if (recordAudit) {
        recordAudit('CONTACT_MESSAGE_RECEIVED', {
          id: submissionId,
          sender_name: cleanName,
          sender_email: cleanEmail,
          emailSent
        });
      }

      res.status(201).json({
        success: true,
        id: submissionId,
        message: 'Your message has been received. The NEXORA team will review it.'
      });
    } catch (err: any) {
      console.error('[CONTACT API ERROR]', err);
      res.status(500).json({
        error: 'An unexpected error occurred while processing your message. Please try again.'
      });
    }
  });

  /**
   * POST /api/admin/contact-messages/:id/retry-email
   * Admin endpoint to retry sending notification email for messages where delivery failed
   */
  apiRouter.post('/admin/contact-messages/:id/retry-email', requireElevatedAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service unavailable' });
        return;
      }

      const messageRef = db.collection('contactMessages').doc(id);
      const snap = await messageRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const data = snap.data();
      const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL?.trim() || founderEmail;

      await sendBrevoContactNotification(notifyEmail, {
        senderName: data.sender_name,
        senderEmail: data.sender_email,
        subject: data.subject,
        message: data.message,
        messageId: id,
        createdAt: data.created_at
      });

      await messageRef.update({
        delivery_status: 'email_sent',
        email_attempts: (data.email_attempts || 0) + 1,
        delivered_at: new Date().toISOString()
      });

      res.json({ success: true, message: 'Notification email dispatched successfully.' });
    } catch (err: any) {
      res.status(502).json({ error: err.message || 'Failed to dispatch email' });
    }
  });
}
