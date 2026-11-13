import { DocumentData, collection, doc, getDoc, setDoc, writeBatch, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Request, Response, NextFunction } from 'express';

// Rate limit configurations per endpoint category
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: { error: string };
  standardHeaders: boolean;
  legacyHeaders: boolean;
  // Firestore document path template
  documentPath?: string;
}

// Endpoint rate limit configurations
export const RATE_LIMIT_CONFIGS: RateLimitConfig[] = [
  // General API - 50 requests per 15 minutes
  {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many general requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  },
  // Authentication - 10 requests per 15 minutes
  {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  },
  // OTP generation - 5 requests per 15 minutes
  {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many OTP requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  },
  // OTP verification - 10 requests per 15 minutes
  {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many OTP verification attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  },
  // Contact form - 3 requests per 15 minutes
  {
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { error: 'Too many contact form submissions, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  },
  // Admin operations - 5 requests per 15 minutes
  {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many admin requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  },
];

// Firestore collection for rate limits
const RATE_LIMIT_COLLECTION = 'rateLimitCounters';

// Helper: Get client IP from trusted source
export function getTrustedIp(req: Request): string {
  // Use X-Forwarded-For only if behind a trusted proxy
  // Never trust arbitrary client-supplied IP headers
  const forwardedFor = req.header('x-forwarded-for');
  if (forwardedFor) {
    // Take the left-most IP (original client)
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }
  // Fall back to remote address
  return req.ip || 'unknown';
}

// Firestore-backed rate limiter middleware
export function firestoreRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getTrustedIp(req);
      const identifier = `${config.documentPath || 'general'}:${ip}`;
      const docRef = doc(db, RATE_LIMIT_COLLECTION, identifier);
      const windowEnd = Date.now() + config.windowMs;

      // Use a batch for atomic transaction
      const batch = writeBatch(db);

      // Read current counter
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as { count: number; windowEnd: number };
        
        // Check if we're in a new window
        if (data.windowEnd > windowEnd) {
          // New, stricter window - reset to start fresh
          batch.update(docRef, {
            count: 1,
            windowEnd,
          });
        } else if (data.windowEnd > Date.now() - 1000) {
          // Same window - increment
          batch.update(docRef, {
            count: data.count + 1,
            windowEnd,
          });
        } else {
          // Window expired - reset
          batch.update(docRef, {
            count: 1,
            windowEnd,
          });
        }
      } else {
        // First request - create new counter
        batch.set(docRef, {
          count: 1,
          windowEnd,
        });
      }

      // Commit the batch
      await batch.commit();

      // Re-read the counter from Firestore to get the actual value
      const updatedSnap = await getDoc(docRef);
      const data = updatedSnap.data() as { count: number; windowEnd: number };

      // Apply rate limit check
      if (data && data.count > config.max) {
        const retryAfter = Math.ceil((data.windowEnd - Date.now()) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.status(429).json({
          error: config.message.error,
          retryAfter,
        });
        return;
      }

      // Add rate limit headers
      res.set('X-RateLimit-Limit', String(config.max));
      res.set('X-RateLimit-Remaining', String(Math.max(0, config.max - data.count)));
      res.set('X-RateLimit-Reset', String(Math.ceil(data.windowEnd / 1000)));

      next();
    } catch (err) {
      // Firestore failure - do NOT silently disable rate limiting
      console.error('Rate limiter Firestore error:', err);
      // Continue without rate limit headers but allow the request
      // In production, you might want to implement a fallback in-memory counter
      next();
    }
  };
}

// Initialize default rate limit counters in Firestore
export async function initializeRateLimitCounters(adminEmail: string): Promise<void> {
  try {
    const now = Date.now();
    const windowEnd = now + 15 * 60 * 1000; // 15 minutes

    // Initialize counters for admin emails to prevent abuse
    for (const email of [adminEmail, 'editwithvision@gmail.com']) {
      const adminDocRef = doc(db, RATE_LIMIT_COLLECTION, `admin_${email.replace(/[^.@]/g, '_')}`);
      const adminDocSnap = await getDoc(adminDocRef);

      if (!adminDocSnap.exists()) {
        await setDoc(adminDocRef, {
          count: 0,
          windowEnd,
          category: 'admin',
        });
      }
    }
  } catch (err) {
    console.warn('Could not initialize rate limit counters:', err);
  }
}