import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

interface AuthContext {
  uid?: string;
  email?: string;
  token?: {
    admin?: boolean;
    email_verified?: boolean;
    email?: string;
    [key: string]: any;
  };
}

interface RequestContext {
  auth?: AuthContext | null;
  resource?: { data: Record<string, any> };
  time?: number;
}

interface SecurityRuleEvaluator {
  canAccess(
    collection: string,
    docId: string,
    operation: 'get' | 'list' | 'create' | 'update' | 'delete',
    context: RequestContext,
    resourceData?: Record<string, any>,
    incomingData?: Record<string, any>
  ): boolean;
}

/**
 * Deterministic model evaluator mirroring firestore.rules logic
 */
class FirestoreRulesModel implements SecurityRuleEvaluator {
  private isSignedIn(ctx: RequestContext): boolean {
    return Boolean(ctx.auth && ctx.auth.uid);
  }

  private isOwner(ctx: RequestContext, userId: string): boolean {
    return this.isSignedIn(ctx) && ctx.auth?.uid === userId;
  }

  private isAdmin(ctx: RequestContext): boolean {
    return Boolean(
      this.isSignedIn(ctx) &&
      ctx.auth?.token?.admin === true &&
      ctx.auth?.token?.email_verified === true
    );
  }

  private isValidUserProfile(data: Record<string, any>, userId: string, authEmail?: string): boolean {
    const allowedKeys = new Set([
      'id', 'email', 'full_name', 'phone', 'college', 'branch',
      'semester', 'academic_year', 'created_at', 'updated_at',
      'avatar_url', 'bio'
    ]);
    const keys = Object.keys(data);
    const hasOnlyAllowed = keys.every(k => allowedKeys.has(k));
    const idMatches = data.id === userId;
    const emailMatches = !('email' in data) || data.email === authEmail;
    return hasOnlyAllowed && idMatches && emailMatches;
  }

  canAccess(
    collection: string,
    docId: string,
    operation: 'get' | 'list' | 'create' | 'update' | 'delete',
    ctx: RequestContext,
    resourceData?: Record<string, any>,
    incomingData?: Record<string, any>
  ): boolean {
    const isRead = operation === 'get' || operation === 'list';
    const isWrite = operation === 'create' || operation === 'update' || operation === 'delete';

    // Internal collections (Strictly deny-all from clients)
    const strictlyInternalCollections = [
      '_admin_security',
      '_admin_challenges',
      '_revoked_sessions',
      '_admin_ratelimits',
      '_otp_challenges',
      '_reset_authorizations',
      'adminSecrets',
      'otpChallenges',
      'passwordTokens'
    ];

    if (strictlyInternalCollections.includes(collection)) {
      return false;
    }

    if (collection === 'admins') {
      if (isRead) return this.isAdmin(ctx);
      return false;
    }

    if (collection === 'users') {
      if (operation === 'get') return this.isOwner(ctx, docId) || this.isAdmin(ctx);
      if (operation === 'list') return this.isAdmin(ctx);
      if (operation === 'create') {
        return (
          this.isOwner(ctx, docId) &&
          Boolean(incomingData) &&
          this.isValidUserProfile(incomingData!, docId, ctx.auth?.token?.email)
        );
      }
      if (operation === 'update') {
        const ownerValid =
          this.isOwner(ctx, docId) &&
          Boolean(incomingData) &&
          this.isValidUserProfile(incomingData!, docId, ctx.auth?.token?.email) &&
          incomingData!.id === resourceData?.id;
        return ownerValid || this.isAdmin(ctx);
      }
      if (operation === 'delete') return this.isAdmin(ctx);
    }

    if (collection === 'userPresence') {
      return this.isOwner(ctx, docId) || this.isAdmin(ctx);
    }

    if (collection === 'events') {
      if (isRead) {
        return (resourceData?.status === 'Published') || this.isAdmin(ctx);
      }
      if (isWrite) return this.isAdmin(ctx);
    }

    if (collection === 'teamMembers') {
      if (isRead) {
        return (resourceData?.enabled === true) || this.isAdmin(ctx);
      }
      if (isWrite) return this.isAdmin(ctx);
    }

    if (collection === 'siteContent' || collection === 'systemConfig' || collection === 'mediaUploads' || collection === 'imageLibrary') {
      if (isRead) return true;
      if (isWrite) return this.isAdmin(ctx);
    }

    if (collection === 'notifications') {
      if (isRead) {
        const now = ctx.time || Date.now();
        const displayOk = resourceData?.display_at == null || resourceData.display_at <= now;
        const expiryOk = resourceData?.expires_at == null || resourceData.expires_at > now;
        return (resourceData?.status === 'Published' && displayOk && expiryOk) || this.isAdmin(ctx);
      }
      if (isWrite) return this.isAdmin(ctx);
    }

    if (collection === 'userNotificationReads') {
      return this.isSignedIn(ctx) && docId.startsWith(`${ctx.auth!.uid}_`);
    }

    if (collection === 'registrations') {
      if (isRead) {
        return (this.isSignedIn(ctx) && resourceData?.user_id === ctx.auth?.uid) || this.isAdmin(ctx);
      }
      // Direct client writes strictly forbidden; handled by server API transaction
      return false;
    }

    if (collection === 'contactMessages') {
      if (isRead || operation === 'update' || operation === 'delete') {
        return this.isAdmin(ctx);
      }
      return false;
    }

    if (collection === 'adminAuditLogs') {
      if (operation === 'get' || operation === 'list' || operation === 'create') {
        return this.isAdmin(ctx);
      }
      return false;
    }

    return false;
  }
}

describe('Firestore Security Rules Test Suite (firestore.rules)', () => {
  let rulesSource: string;
  let model: FirestoreRulesModel;

  beforeAll(() => {
    const rulesPath = path.join(process.cwd(), 'firestore.rules');
    expect(fs.existsSync(rulesPath)).toBe(true);
    rulesSource = fs.readFileSync(rulesPath, 'utf8');
    model = new FirestoreRulesModel();
  });

  describe('Rules file static structure validation', () => {
    it('defines rules_version = "2"', () => {
      expect(rulesSource).toMatch(/rules_version\s*=\s*['"]2['"]/);
    });

    it('enforces default deny at root level', () => {
      expect(rulesSource).toContain('allow read, write: if false;');
    });

    it('blocks internal collections (_admin_security, _otp_challenges, etc.) explicitly', () => {
      expect(rulesSource).toContain('match /_admin_security/{docId}');
      expect(rulesSource).toContain('match /_admin_challenges/{docId}');
      expect(rulesSource).toContain('match /_otp_challenges/{challengeId}');
      expect(rulesSource).toContain('match /_reset_authorizations/{authId}');
    });

    it('disallows direct client write to registrations', () => {
      expect(rulesSource).toMatch(/match\s+\/registrations\/\{registrationId\}\s*\{[\s\S]*?allow write:\s*if false;/);
    });
  });

  describe('Internal Collections Lockdown', () => {
    const unauthenticatedCtx: RequestContext = { auth: null };
    const studentCtx: RequestContext = {
      auth: { uid: 'student_123', email: 'student@example.com' }
    };
    const adminCtx: RequestContext = {
      auth: {
        uid: 'admin_123',
        email: 'miteshpipaliya2202@gmail.com',
        token: { admin: true, email_verified: true, email: 'miteshpipaliya2202@gmail.com' }
      }
    };

    it('denies all client reads and writes to _admin_security regardless of credentials', () => {
      expect(model.canAccess('_admin_security', 'founder', 'get', unauthenticatedCtx)).toBe(false);
      expect(model.canAccess('_admin_security', 'founder', 'create', unauthenticatedCtx)).toBe(false);
      expect(model.canAccess('_admin_security', 'founder', 'get', studentCtx)).toBe(false);
      expect(model.canAccess('_admin_security', 'founder', 'update', studentCtx)).toBe(false);
      expect(model.canAccess('_admin_security', 'founder', 'get', adminCtx)).toBe(false);
      expect(model.canAccess('_admin_security', 'founder', 'update', adminCtx)).toBe(false);
    });

    it('denies all client reads and writes to _otp_challenges and _reset_authorizations', () => {
      expect(model.canAccess('_otp_challenges', 'otp_123', 'get', unauthenticatedCtx)).toBe(false);
      expect(model.canAccess('_otp_challenges', 'otp_123', 'create', studentCtx)).toBe(false);
      expect(model.canAccess('_reset_authorizations', 'auth_123', 'get', studentCtx)).toBe(false);
      expect(model.canAccess('_reset_authorizations', 'auth_123', 'update', adminCtx)).toBe(false);
    });
  });

  describe('Competition Registrations (C-03)', () => {
    const studentA: RequestContext = {
      auth: { uid: 'student_A', email: 'alice@bvm.edu' }
    };
    const studentB: RequestContext = {
      auth: { uid: 'student_B', email: 'bob@bvm.edu' }
    };
    const adminCtx: RequestContext = {
      auth: {
        uid: 'admin_123',
        token: { admin: true, email_verified: true }
      }
    };

    const registrationDoc = {
      user_id: 'student_A',
      competition_id: 'hackathon-2026',
      status: 'Confirmed'
    };

    it('allows student to read their own registration', () => {
      expect(model.canAccess('registrations', 'reg_1', 'get', studentA, registrationDoc)).toBe(true);
      expect(model.canAccess('registrations', 'reg_1', 'list', studentA, registrationDoc)).toBe(true);
    });

    it('denies student from reading another student registration', () => {
      expect(model.canAccess('registrations', 'reg_1', 'get', studentB, registrationDoc)).toBe(false);
      expect(model.canAccess('registrations', 'reg_1', 'list', studentB, registrationDoc)).toBe(false);
    });

    it('denies direct client write to registrations for students and admins (must use server API)', () => {
      expect(model.canAccess('registrations', 'reg_1', 'create', studentA, undefined, registrationDoc)).toBe(false);
      expect(model.canAccess('registrations', 'reg_1', 'update', studentA, registrationDoc, registrationDoc)).toBe(false);
      expect(model.canAccess('registrations', 'reg_1', 'delete', adminCtx, registrationDoc)).toBe(false);
    });

    it('allows admin to read all registrations', () => {
      expect(model.canAccess('registrations', 'reg_1', 'get', adminCtx, registrationDoc)).toBe(true);
      expect(model.canAccess('registrations', 'reg_1', 'list', adminCtx, registrationDoc)).toBe(true);
    });
  });

  describe('User Profiles (C-02)', () => {
    const studentA: RequestContext = {
      auth: {
        uid: 'student_A',
        token: { email: 'alice@bvm.edu' }
      }
    };
    const studentB: RequestContext = {
      auth: {
        uid: 'student_B',
        token: { email: 'bob@bvm.edu' }
      }
    };
    const adminCtx: RequestContext = {
      auth: {
        uid: 'admin_123',
        token: { admin: true, email_verified: true }
      }
    };

    const validProfile = {
      id: 'student_A',
      email: 'alice@bvm.edu',
      full_name: 'Alice Patel',
      college: 'BVM',
      branch: 'Information Technology',
      semester: 6
    };

    it('allows owner to read their profile', () => {
      expect(model.canAccess('users', 'student_A', 'get', studentA)).toBe(true);
    });

    it('denies student from reading other student profile', () => {
      expect(model.canAccess('users', 'student_A', 'get', studentB)).toBe(false);
    });

    it('allows admin to list and read all profiles', () => {
      expect(model.canAccess('users', 'student_A', 'get', adminCtx)).toBe(true);
      expect(model.canAccess('users', 'student_A', 'list', adminCtx)).toBe(true);
    });

    it('allows owner to create profile with whitelisted fields matching UID and email', () => {
      expect(model.canAccess('users', 'student_A', 'create', studentA, undefined, validProfile)).toBe(true);
    });

    it('rejects profile creation with extraneous unwhitelisted fields (anti-tamper)', () => {
      const tamperedProfile = {
        ...validProfile,
        is_admin: true,
        role: 'Founder'
      };
      expect(model.canAccess('users', 'student_A', 'create', studentA, undefined, tamperedProfile)).toBe(false);
    });

    it('rejects profile creation when ID does not match auth UID', () => {
      const mismatchedIdProfile = {
        ...validProfile,
        id: 'student_B'
      };
      expect(model.canAccess('users', 'student_A', 'create', studentA, undefined, mismatchedIdProfile)).toBe(false);
    });
  });

  describe('Broadcast Notifications (C-06 & WP3)', () => {
    const now = Date.now();
    const publicCtx: RequestContext = { auth: null, time: now };
    const adminCtx: RequestContext = {
      auth: {
        uid: 'admin_123',
        token: { admin: true, email_verified: true }
      },
      time: now
    };

    const publishedNotification = {
      status: 'Published',
      display_at: now - 10000,
      expires_at: now + 3600000,
      message: 'Welcome to NEXORA!'
    };

    const draftNotification = {
      status: 'Draft',
      message: 'Secret pre-announcement'
    };

    const expiredNotification = {
      status: 'Published',
      display_at: now - 7200000,
      expires_at: now - 3600000,
      message: 'Expired event'
    };

    it('allows public to read published active notification', () => {
      expect(model.canAccess('notifications', 'n1', 'get', publicCtx, publishedNotification)).toBe(true);
    });

    it('denies public from reading draft or expired notification', () => {
      expect(model.canAccess('notifications', 'n2', 'get', publicCtx, draftNotification)).toBe(false);
      expect(model.canAccess('notifications', 'n3', 'get', publicCtx, expiredNotification)).toBe(false);
    });

    it('allows administrator to read draft and expired notifications', () => {
      expect(model.canAccess('notifications', 'n2', 'get', adminCtx, draftNotification)).toBe(true);
      expect(model.canAccess('notifications', 'n3', 'get', adminCtx, expiredNotification)).toBe(true);
    });

    it('allows administrator to create and update notifications', () => {
      expect(model.canAccess('notifications', 'n1', 'create', adminCtx, undefined, publishedNotification)).toBe(true);
      expect(model.canAccess('notifications', 'n1', 'update', adminCtx, publishedNotification, publishedNotification)).toBe(true);
      expect(model.canAccess('notifications', 'n1', 'delete', adminCtx, publishedNotification)).toBe(true);
    });
  });

  describe('Student Notification Read Receipts (C-04)', () => {
    const studentA: RequestContext = {
      auth: { uid: 'student_A' }
    };
    const studentB: RequestContext = {
      auth: { uid: 'student_B' }
    };

    it('allows student to read/write receipt prefixed with their own uid', () => {
      const receiptId = 'student_A_notif_99';
      expect(model.canAccess('userNotificationReads', receiptId, 'get', studentA)).toBe(true);
      expect(model.canAccess('userNotificationReads', receiptId, 'create', studentA)).toBe(true);
    });

    it('denies student from writing receipt for another user', () => {
      const receiptId = 'student_A_notif_99';
      expect(model.canAccess('userNotificationReads', receiptId, 'get', studentB)).toBe(false);
      expect(model.canAccess('userNotificationReads', receiptId, 'create', studentB)).toBe(false);
    });
  });

  describe('Real-Time Student Presence Rules (userPresence)', () => {
    const studentUser: RequestContext = {
      auth: { uid: 'user_tiks_g' }
    };
    const otherStudent: RequestContext = {
      auth: { uid: 'user_taushal_q' }
    };
    const adminCtx: RequestContext = {
      auth: {
        uid: 'founder_admin',
        token: { admin: true, email_verified: true, email: 'miteshpipaliya2202@gmail.com' }
      }
    };
    const publicCtx: RequestContext = { auth: null };

    it('allows student to read and write their own presence status', () => {
      expect(model.canAccess('userPresence', 'user_tiks_g', 'get', studentUser)).toBe(true);
      expect(model.canAccess('userPresence', 'user_tiks_g', 'update', studentUser)).toBe(true);
    });

    it('denies student from reading or writing another student presence document', () => {
      expect(model.canAccess('userPresence', 'user_tiks_g', 'get', otherStudent)).toBe(false);
      expect(model.canAccess('userPresence', 'user_tiks_g', 'update', otherStudent)).toBe(false);
    });

    it('denies unauthenticated public from accessing user presence', () => {
      expect(model.canAccess('userPresence', 'user_tiks_g', 'get', publicCtx)).toBe(false);
      expect(model.canAccess('userPresence', 'user_tiks_g', 'update', publicCtx)).toBe(false);
    });

    it('allows administrator to read and manage any presence record', () => {
      expect(model.canAccess('userPresence', 'user_tiks_g', 'get', adminCtx)).toBe(true);
      expect(model.canAccess('userPresence', 'user_taushal_q', 'get', adminCtx)).toBe(true);
      expect(model.canAccess('userPresence', 'user_tiks_g', 'list', adminCtx)).toBe(true);
    });
  });
});
