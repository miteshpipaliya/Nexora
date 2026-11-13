import { 
  UserProfile, 
  CompetitionEvent, 
  RegistrationRecord, 
  ContactMessage, 
  RegistrationStatus, 
  PaymentStatus,
  EventStatus,
  TeamMemberDetail,
  AcademicYear,
  InAppNotification,
  SiteContent,
  RealDashboardStats,
  ImageLibraryItem,
  TeamRole,
  AcademicBranch,
  TeamDivision,
  TeamDepartment,
  TeamMember
} from '../types';
import { UserPresenceRecord, startPresenceHeartbeat, stopPresenceHeartbeat } from './presenceService';
import { 
  auth, 
  db, 
  storage,
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  deleteUser,
  sendEmailVerification, 
  sendPasswordResetEmail, 
  signOut,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection
} from './firebase';
export { db, auth, storage } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { 
  INITIAL_EVENTS, 
  INITIAL_DEMO_USER, 
  INITIAL_REGISTRATIONS 
} from './mockData';
import { safeApiFetch } from './apiClient';
import { toFiniteNumber } from '../shared/lib/numberUtils';

/**
 * Safely strips any undefined properties from Firestore payloads.
 * Firestore strictly rejects undefined field values.
 */
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanFirestoreData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// Administrator authorization is determined exclusively via Firebase Custom Claims (admin == true) per C-01.

// Cryptographically secure competition ID generator (Format: ZC-XXXX, CTF-XXXX, HN-XXXX, CR-XXXX, or custom)
export function generateCompetitionId(eventSlug: string): string {
  const prefixMap: Record<string, string> = {
    zerocode: 'ZC-',
    ctf: 'CTF-',
    hackathon: 'HN-',
    coderush: 'CR-'
  };
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const cleanSlug = (eventSlug || '').toLowerCase().trim();
  const defaultPrefix = cleanSlug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();
  const prefix = prefixMap[cleanSlug] || (defaultPrefix ? `${defaultPrefix}-` : 'NXR-');

  const randomValues = new Uint32Array(4);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < 4; i++) {
      randomValues[i] = Math.floor(Math.random() * chars.length);
    }
  }

  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return `${prefix}${code}`;
}

// Masking helpers
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '••••••';
  const first = local[0] || '';
  const last = local.slice(-2);
  return `${first}${'•'.repeat(Math.max(local.length - 3, 4))}${last}@${domain}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.trim();
  const last3 = cleaned.slice(-3);
  return `+91 ••••• ••${last3}`;
}

interface LocalChallenge {
  challengeId: string;
  adminEmail: string;
  adminPhone: string;
  emailOtp: string;
  smsOtp: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

const localAdminChallenges = new Map<string, LocalChallenge>();

export async function sendPresenceHeartbeat(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    startPresenceHeartbeat(uid);
  }
}

class NexoraDataService {
  private listeners: Set<() => void> = new Set();
  private authInitialized: boolean = false;
  private currentUserCache: UserProfile | null = null;

  constructor() {
    testFirestoreConnection();
    // Listen to Firebase auth state changes
    auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        startPresenceHeartbeat(fbUser.uid);
        try {
          this.currentUserCache = await this.fetchUserProfile(fbUser.uid, fbUser);
        } catch {
          this.currentUserCache = this.buildFallbackProfile(fbUser);
        }
      } else {
        stopPresenceHeartbeat();
        this.currentUserCache = null;
      }
      this.authInitialized = true;
      this.notify();
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public async checkAdminClaim(fbUser: any): Promise<boolean> {
    if (!fbUser) return false;
    try {
      const tokenResult = await fbUser.getIdTokenResult(false);
      return Boolean(tokenResult?.claims?.admin === true && tokenResult?.claims?.email_verified === true);
    } catch {
      return false;
    }
  }

  public isUserAdmin(emailOrUser?: string | UserProfile | null): boolean {
    if (!emailOrUser) {
      return Boolean(this.currentUserCache?.is_admin);
    }
    if (typeof emailOrUser === 'string') {
      if (this.currentUserCache && this.currentUserCache.email.toLowerCase().trim() === emailOrUser.toLowerCase().trim()) {
        return Boolean(this.currentUserCache.is_admin);
      }
      return false;
    }
    return Boolean(emailOrUser.is_admin);
  }

  // --- AUTHENTICATION METHODS ---
  public async getCurrentUser(): Promise<UserProfile | null> {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;

    if (this.currentUserCache && this.currentUserCache.id === fbUser.uid) {
      return this.currentUserCache;
    }

    try {
      this.currentUserCache = await this.fetchUserProfile(fbUser.uid, fbUser);
      return this.currentUserCache;
    } catch {
      return this.buildFallbackProfile(fbUser);
    }
  }

  private async fetchUserProfile(uid: string, fbUser: any): Promise<UserProfile> {
    const userDocRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        const isAdmin = await this.checkAdminClaim(fbUser);
        return {
          id: uid,
          full_name: data.full_name || fbUser.displayName || 'NEXORA Member',
          email: fbUser.email || data.email || '',
          college: data.college || 'Birla Vishvakarma Mahavidyalaya (BVM)',
          branch: data.branch || '',
          academic_year: (data.academic_year as AcademicYear) || '1st Year',
          enrollment_number: data.enrollment_number || '',
          division: data.division || '',
          phone_number: data.phone_number || '',
          avatar_url: fbUser.photoURL || data.avatar_url || '',
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          is_admin: isAdmin,
          email_verified: fbUser.emailVerified,
          is_profile_complete: Boolean(data.enrollment_number && data.branch)
        };
      }
    } catch (err) {
      console.warn('Could not read user profile from Firestore:', err);
    }
    return this.buildFallbackProfile(fbUser);
  }

  private buildFallbackProfile(fbUser: any): UserProfile {
    return {
      id: fbUser.uid,
      full_name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'NEXORA Member'),
      email: fbUser.email || '',
      college: 'Birla Vishvakarma Mahavidyalaya (BVM)',
      branch: '',
      academic_year: '1st Year',
      enrollment_number: '',
      division: '',
      phone_number: fbUser.phoneNumber || '',
      avatar_url: fbUser.photoURL || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_admin: false,
      email_verified: fbUser.emailVerified,
      is_profile_complete: false
    };
  }

  // 1. Google Account Sign-In
  public async loginWithGoogle(): Promise<UserProfile> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check or create profile in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);

      const isAdmin = await this.checkAdminClaim(user);

      let profile: UserProfile;

      if (!snap.exists()) {
        profile = {
          id: user.uid,
          full_name: user.displayName || 'NEXORA Member',
          email: user.email || '',
          college: 'Birla Vishvakarma Mahavidyalaya (BVM)',
          branch: '',
          academic_year: '1st Year',
          enrollment_number: '',
          division: '',
          phone_number: user.phoneNumber || '',
          avatar_url: user.photoURL || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_admin: isAdmin,
          email_verified: user.emailVerified,
          is_profile_complete: false
        };

        try {
          await setDoc(userDocRef, {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            college: profile.college,
            branch: profile.branch,
            academic_year: profile.academic_year,
            enrollment_number: profile.enrollment_number,
            division: profile.division,
            phone_number: profile.phone_number,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          });
        } catch (fErr) {
          console.warn('Initial Firestore profile creation notice:', fErr);
        }
      } else {
        const data = snap.data();
        profile = {
          id: user.uid,
          full_name: data.full_name || user.displayName || '',
          email: user.email || data.email || '',
          college: data.college || 'Birla Vishvakarma Mahavidyalaya (BVM)',
          branch: data.branch || '',
          academic_year: (data.academic_year as AcademicYear) || '1st Year',
          enrollment_number: data.enrollment_number || '',
          division: data.division || '',
          phone_number: data.phone_number || user.phoneNumber || '',
          avatar_url: user.photoURL || data.avatar_url || '',
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          is_admin: isAdmin,
          email_verified: user.emailVerified,
          is_profile_complete: Boolean(data.enrollment_number && data.branch)
        };
      }

      this.currentUserCache = profile;
      this.notify();
      return profile;
    } catch (error: any) {
      console.error('[NEXORA AUTH DIAGNOSTIC]', {
        code: error?.code,
        message: error?.message,
        hostname: typeof window !== 'undefined' ? window.location.hostname : '',
        origin: typeof window !== 'undefined' ? window.location.origin : ''
      });

      const errObj: any = new Error();
      errObj.code = error?.code || 'auth/unknown';
      errObj.originalMessage = error?.message;
      errObj.hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      errObj.origin = typeof window !== 'undefined' ? window.location.origin : '';
      errObj.projectId = 'gen-lang-client-0089073748';

      if (error?.code === 'auth/unauthorized-domain') {
        errObj.message = "Google Sign-In is temporarily unavailable because this website's authentication domain has not been authorized. Please contact the administrator.";
        errObj.isDomainError = true;
      } else if (error?.code === 'auth/popup-blocked') {
        errObj.message = 'Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errObj.message = 'Google Sign-In window was closed before completing authentication.';
      } else if (error?.code === 'auth/network-request-failed') {
        errObj.message = 'A network error occurred while connecting to Google Authentication. Please check your internet connection.';
      } else if (error?.code === 'auth/operation-not-allowed') {
        errObj.message = 'Google Sign-In is not enabled in Firebase Console. Please enable the Google provider under Authentication > Sign-in method.';
      } else if (error?.code === 'auth/invalid-api-key') {
        errObj.message = 'Invalid Firebase API key configuration. Please verify your project credentials.';
      } else {
        errObj.message = error?.message || 'Google Sign-In failed.';
      }

      throw errObj;
    }
  }

  // 2. Email & Password Sign-In
  public async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      const profile = await this.fetchUserProfile(result.user.uid, result.user);
      this.currentUserCache = profile;
      this.notify();
      return profile;
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }
      if (error?.code === 'auth/too-many-requests') {
        throw new Error('Access to this account has been temporarily disabled due to many failed login attempts. Reset your password or try again later.');
      }
      throw new Error(error.message || 'Failed to sign in.');
    }
  }

  // 3. Email & Password Account Creation
  public async signupWithEmail(data: {
    email: string;
    password: string;
    full_name: string;
    college: string;
    branch: string;
    academic_year: AcademicYear;
    enrollment_number: string;
    division?: string;
    phone_number?: string;
    verificationToken?: string;
  }): Promise<UserProfile> {
    try {
      if (!data.verificationToken) {
        throw new Error('Email verification is mandatory. Please verify your email before creating the account.');
      }
      const result = await createUserWithEmailAndPassword(auth, data.email.trim().toLowerCase(), data.password);
      const user = result.user;

      let emailVerified = false;
      try {
        const idToken = await user.getIdToken();
        const confirmRes = await fetch('/api/auth/confirm-verified-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email.trim().toLowerCase(),
            verificationToken: data.verificationToken,
            idToken
          })
        });
        const confirmation = await confirmRes.json().catch(() => ({}));
        if (!confirmRes.ok || confirmation.emailVerifiedInAuth !== true) {
          await deleteUser(user).catch(() => {});
          throw new Error(confirmation.error || 'Email verification could not be confirmed. Please request a new code and try again.');
        }
        emailVerified = true;
      } catch (error) {
        await deleteUser(user).catch(() => {});
        throw error;
      }

      const isAdmin = false;

      const profilePayload: UserProfile = {
        id: user.uid,
        full_name: data.full_name.trim(),
        email: data.email.trim().toLowerCase(),
        college: data.college.trim(),
        branch: data.branch.trim(),
        academic_year: data.academic_year,
        enrollment_number: data.enrollment_number.trim().toUpperCase(),
        division: data.division?.trim() || '',
        phone_number: data.phone_number?.trim() || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_admin: isAdmin,
        email_verified: emailVerified,
        is_profile_complete: true
      };

      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          id: profilePayload.id,
          full_name: profilePayload.full_name,
          email: profilePayload.email,
          college: profilePayload.college,
          branch: profilePayload.branch,
          academic_year: profilePayload.academic_year,
          enrollment_number: profilePayload.enrollment_number,
          division: profilePayload.division,
          phone_number: profilePayload.phone_number,
          email_verified: profilePayload.email_verified,
          created_at: profilePayload.created_at,
          updated_at: profilePayload.updated_at
        });
      } catch (fErr) {
        console.warn('Firestore setDoc profile notice:', fErr);
      }

      this.currentUserCache = profilePayload;
      this.notify();
      return profilePayload;
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email address already exists. Please log in instead.');
      }
      if (error?.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      }
      throw new Error(error.message || 'Failed to create account.');
    }
  }

  // 4. Send Email Verification
  public async sendVerificationEmail(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No signed-in user found.');
    await sendEmailVerification(user);
  }

  // 5. Password Reset Email (Standard Firebase link)
  public async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        // Return gracefully so emails aren't leaked
        return;
      }
      throw new Error(error.message || 'Failed to send password reset email.');
    }
  }

  // 5a. Send 6-digit Email OTP via Brevo backend
  public async sendEmailOtp(email: string, purpose: 'signup' | 'reset-password' = 'signup'): Promise<{
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldown: number;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const data = await safeApiFetch<{
      success: boolean;
      maskedEmail?: string;
      expiresInSeconds?: number;
      resendCooldown?: number;
      error?: string;
    }>('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, purpose })
    });

    return {
      maskedEmail: data.maskedEmail || maskEmail(cleanEmail),
      expiresInSeconds: data.expiresInSeconds || 180,
      resendCooldown: data.resendCooldown || 30
    };
  }

  // 5b. Verify 6-digit Email OTP
  public async verifyEmailOtp(email: string, otp: string, purpose: 'signup' | 'reset-password' = 'signup'): Promise<{
    verificationToken: string;
    expiresAt: number;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const data = await safeApiFetch<{
      success: boolean;
      verificationToken: string;
      expiresAt: number;
      error?: string;
    }>('/api/auth/verify-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, purpose })
    });

    return {
      verificationToken: data.verificationToken,
      expiresAt: data.expiresAt
    };
  }

  // 5c. Complete Password Reset using Verified OTP Token
  public async resetPasswordWithOtp(email: string, verificationToken: string, newPassword: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();

    await safeApiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, verificationToken, newPassword })
    });

  }


  // 6. Sign Out
  public async logout(): Promise<void> {
    stopPresenceHeartbeat();
    await signOut(auth);
    this.currentUserCache = null;
    this.notify();
  }

  // 7. Update Student Profile
  public async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required.');

    const userDocRef = doc(db, 'users', user.uid);
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc(userDocRef, updatedData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }

    this.currentUserCache = {
      ...(this.currentUserCache || this.buildFallbackProfile(user)),
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.notify();
    return this.currentUserCache;
  }

  // --- EVENTS & COMPETITIONS ---
  public async getEvents(): Promise<CompetitionEvent[]> {
    try {
      const snap = await getDocs(collection(db, 'events'));
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as CompetitionEvent);
      }
    } catch (err) {
      console.warn('Firestore events collection read error or empty:', err);
    }

    // Auto-seed initial events if collection empty
    try {
      const batch = writeBatch(db);
      for (const ev of INITIAL_EVENTS) {
        const evRef = doc(db, 'events', ev.slug);
        batch.set(evRef, ev);
      }
      await batch.commit();
    } catch (seedErr) {
      console.warn('Events seed note:', seedErr);
    }

    return [...INITIAL_EVENTS];
  }

  public async getEventBySlug(slug: string): Promise<CompetitionEvent | undefined> {
    const all = await this.getEvents();
    return all.find((e) => e.slug === slug);
  }

  public async updateEvent(slug: string, updates: Partial<CompetitionEvent>): Promise<void> {
    const evRef = doc(db, 'events', slug);
    try {
      await updateDoc(evRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${slug}`);
    }
    this.notify();
  }

  // --- REGISTRATIONS ---
  public async getUserRegistrations(userId: string): Promise<RegistrationRecord[]> {
    const q = query(
      collection(db, 'registrations'),
      where('user_id', '==', userId)
    );
    const snap = await getDocs(q);
    const results: RegistrationRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as RegistrationRecord;
      results.push({ ...data, id: data.id || docSnap.id });
    });
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getAllRegistrations(): Promise<RegistrationRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'registrations'));
      const results: RegistrationRecord[] = [];
      snap.forEach((docSnap) => {
        results.push(docSnap.data() as RegistrationRecord);
      });
      return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.warn('getAllRegistrations error:', err);
      return [];
    }
  }

  public async isUserRegisteredForEvent(userId: string, eventSlug: string): Promise<boolean> {
    const regs = await this.getUserRegistrations(userId);
    return regs.some((r) => r.event_slug === eventSlug && r.registration_status !== 'Cancelled');
  }

  public async createRegistration(data: {
    event_slug: string;
    full_name: string;
    email: string;
    phone_number: string;
    college: string;
    branch: string;
    academic_year: AcademicYear;
    enrollment_number: string;
    division?: string;
    team_name?: string;
    team_members?: string[];
    team_member_details?: TeamMemberDetail[];
  }): Promise<RegistrationRecord> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required to register for competitions.');

    let idToken = '';
    try {
      idToken = await user.getIdToken();
    } catch {
      // ignore
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const payload = {
      event_slug: data.event_slug,
      full_name: data.full_name?.trim(),
      email: data.email?.trim().toLowerCase(),
      phone_number: data.phone_number?.trim(),
      college: data.college?.trim(),
      branch: data.branch?.trim(),
      academic_year: data.academic_year,
      enrollment_number: data.enrollment_number?.trim().toUpperCase(),
      division: data.division?.trim() || '',
      team_name: data.team_name?.trim() || '',
      team_members: data.team_members || [],
      team_member_details: data.team_member_details || []
    };

    let res: Response;
    try {
      res = await fetch('/api/registrations/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch {
      throw new Error('Registration service is unavailable. Nothing was saved. Please try again.');
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      if (json && typeof json.error === 'string') {
        throw new Error(json.error);
      }
      throw new Error('Registration service is unavailable. Nothing was saved. Please try again.');
    }

    if (!json || !json.registration) {
      throw new Error('Registration service is unavailable. Nothing was saved. Please try again.');
    }

    this.notify();
    return json.registration;
  }

  // --- CONTACT INQUIRIES (PROMPT 1) ---
  public async submitContactMessage(data: {
    sender_name: string;
    sender_email: string;
    subject?: string;
    message: string;
    submissionId?: string;
    honeypot?: string;
  }): Promise<{ success: boolean; id: string; message: string }> {
    const payload = {
      sender_name: data.sender_name.trim(),
      sender_email: data.sender_email.trim().toLowerCase(),
      subject: data.subject?.trim() || 'NEXORA General Inquiry',
      message: data.message.trim(),
      submissionId: data.submissionId,
      honeypot: data.honeypot
    };

    const res = await safeApiFetch<{ success: boolean; id?: string; messageId?: string; message?: string }>('/api/contact/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      id: res.id || res.messageId || data.submissionId || `msg_${Date.now()}`,
      message: res.message || 'Your message has been received. The NEXORA team will review it.'
    };
  }

  public async retryContactEmail(id: string): Promise<{ success: boolean; message: string }> {
    return safeApiFetch<{ success: boolean; message: string }>(`/api/admin/contact-messages/${id}/retry-email`, {
      method: 'POST',
      headers: this.getAdminHeaders()
    });
  }

  // --- FOUNDER ADMIN SECURITY & CONSOLE METHODS ---
  public async getAdminStatus(): Promise<{
    initialized: boolean;
  }> {
    try {
      const res = await safeApiFetch<{
        initialized: boolean;
      }>('/api/admin/auth/status', { method: 'POST' });

      // If server returned false, check authoritative Firestore directly
      if (!res.initialized) {
        try {
          const confSnap = await getDoc(doc(db, 'systemConfig', 'status'));
          if (confSnap.exists() && confSnap.data()?.initialized) {
            safeApiFetch('/api/admin/auth/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientConfirmedInitialized: true })
            }).catch(() => {});
            return { initialized: true };
          }
        } catch (clientFsErr) {
          console.warn('[ADMIN STATUS] Firestore client check fallback:', clientFsErr);
        }
      }
      return { initialized: Boolean(res.initialized) };
    } catch (apiErr) {
      try {
        const confSnap = await getDoc(doc(db, 'systemConfig', 'status'));
        const initialized = confSnap.exists() && confSnap.data()?.initialized === true;
        return { initialized };
      } catch {
        return { initialized: true };
      }
    }
  }

  public async requestAdminSetupOtp(): Promise<{
    success: boolean;
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldown: number;
  }> {
    return safeApiFetch('/api/admin/auth/request-setup-otp', { method: 'POST' });
  }

  public async generateAdminPassword(): Promise<{ success: boolean; password: string }> {
    return safeApiFetch('/api/admin/auth/generate-password', { method: 'GET' });
  }

  public async setupAdminPassword(setupOtp: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await safeApiFetch<{ success: boolean; message: string }>('/api/admin/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupOtp, newPassword, confirmPassword })
    });
    try {
      await setDoc(doc(db, 'systemConfig', 'status'), {
        initialized: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (fsErr) {
      console.warn('[ADMIN SETUP] Client Firestore sync notice:', fsErr);
    }
    return res;
  }

  public async verifyAdminPassword(password: string): Promise<{
    success: boolean;
    sessionToken?: string;
    passwordToken?: string;
    maskedEmail?: string;
    expiresAt?: number;
    durationMinutes?: number;
    expiresInSeconds?: number;
    resendCooldown?: number;
  }> {
    const res = await safeApiFetch<{
      success: boolean;
      sessionToken?: string;
      passwordToken?: string;
      maskedEmail?: string;
      expiresAt?: number;
      durationMinutes?: number;
      expiresInSeconds?: number;
      resendCooldown?: number;
    }>('/api/admin/auth/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    // Session token is now set as HttpOnly cookie by the server; no client-side storage needed.
    return res;
  }

  // --- FORGOT PASSWORD FLOW (PHASE 5) ---
  public async requestAdminPasswordResetOtp(email?: string): Promise<{
    success: boolean;
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldown: number;
  }> {
    return safeApiFetch('/api/admin/auth/forgot-password/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  }

  public async verifyAdminPasswordResetOtp(otp: string): Promise<{
    success: boolean;
    resetToken: string;
    expiresInSeconds: number;
  }> {
    return safeApiFetch('/api/admin/auth/forgot-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
  }

  public async resetAdminPassword(resetToken: string, newPassword: string, confirmPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await safeApiFetch<{ success: boolean; message: string }>('/api/admin/auth/forgot-password/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword, confirmPassword })
    });
    try {
      await setDoc(doc(db, 'systemConfig', 'status'), {
        initialized: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}
    return res;
  }

  public async resendAdminOtp(passwordToken: string): Promise<{
    success: boolean;
    expiresInSeconds: number;
    resendCooldown: number;
  }> {
    return safeApiFetch('/api/admin/auth/resend-admin-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordToken })
    });
  }

  public async verifyAdminOtp(passwordToken: string, otp: string): Promise<{
    success: boolean;
    sessionToken: string;
    expiresAt: number;
    durationMinutes: number;
  }> {
    const data = await safeApiFetch<{
      success: boolean;
      sessionToken: string;
      expiresAt: number;
      durationMinutes: number;
    }>('/api/admin/auth/verify-admin-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordToken, otp })
    });

    // Session token is now set as HttpOnly cookie by the server; no client-side storage needed.
    return data;
  }

  // Backward compatibility alias for any existing caller
  public async startAdminChallenge(adminEmail: string) {
    return this.getAdminStatus();
  }

  public async checkElevatedAdminSession(): Promise<boolean> {
    try {
      // Cookie is sent automatically by the browser (HttpOnly, SameSite=Strict)
      const data = await safeApiFetch<{ authenticated: boolean }>('/api/admin/auth/session');
      if (!data.authenticated) {
        this.clearElevatedAdminSession();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  public clearElevatedAdminSession() {
    // Notify server to revoke session; do not ignore errors (P1-05 fix)
    safeApiFetch('/api/admin/auth/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch((err) => {
      console.error('[ADMIN LOCK] Failed to revoke session server-side:', err);
    });
    // Cookie is cleared server-side via Set-Cookie; no client-side storage to clean
  }

  public sendPresenceHeartbeat = sendPresenceHeartbeat;

  public async getAdminStats(): Promise<any> {
    // Cookie is sent automatically by the browser (HttpOnly, SameSite=Strict)
    return safeApiFetch('/api/admin/stats');
  }

  public async getAdminStudents(): Promise<any> {
    // Cookie is sent automatically by the browser (HttpOnly, SameSite=Strict)
    return safeApiFetch('/api/admin/students');
  }

  public async uploadAdminImage(imageBase64: string, filename?: string): Promise<{ success: boolean; url: string }> {
    return safeApiFetch('/api/admin/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageBase64, filename })
    });
  }

  public async recordAdminAuditLog(entry: {
    event_type: string;
    details: string;
  }): Promise<void> {
    const user = auth.currentUser;
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logDoc = {
      id: logId,
      admin_uid: user?.uid || 'system',
      event_type: entry.event_type,
      details: entry.details,
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'adminAuditLogs', logId), logDoc);
    } catch (err) {
      console.warn('Audit log write error:', err);
    }
  }

  // --- REAL-TIME FIRESTORE SUBSCRIPTIONS ---
  public subscribeEvents(callback: (events: CompetitionEvent[]) => void): () => void {
    try {
      const q = collection(db, 'events');
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const events = snap.docs.map(d => d.data() as CompetitionEvent);
          callback(events);
        } else {
          callback(INITIAL_EVENTS);
        }
      }, (err) => {
        console.warn('Events subscription error:', err);
        callback(INITIAL_EVENTS);
      });
      return unsubscribe;
    } catch {
      callback(INITIAL_EVENTS);
      return () => {};
    }
  }

  public subscribeRegistrations(callback: (regs: RegistrationRecord[]) => void): () => void {
    try {
      const q = collection(db, 'registrations');
      const unsubscribe = onSnapshot(q, (snap) => {
        const regs = snap.docs.map(d => d.data() as RegistrationRecord);
        regs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        callback(regs);
      }, (err) => {
        console.warn('Registrations subscription error:', err);
        callback([]);
      });
      return unsubscribe;
    } catch {
      callback([]);
      return () => {};
    }
  }

  public subscribeNotifications(
    audienceOrCallback: string | ((notifs: InAppNotification[]) => void),
    maybeCallback?: (notifs: InAppNotification[]) => void
  ): () => void {
    const audience = typeof audienceOrCallback === 'string' ? audienceOrCallback : 'all';
    const callback = typeof audienceOrCallback === 'function' ? audienceOrCallback : (maybeCallback || (() => {}));

    try {
      const q = collection(db, 'notifications');
      const unsubscribe = onSnapshot(q, (snap) => {
        let notifs = snap.docs.map(d => d.data() as InAppNotification);
        if (audience !== 'all') {
          notifs = notifs.filter(n => n.audience === 'all' || n.audience === audience);
        }
        notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        callback(notifs);
      }, (err) => {
        console.warn('Notifications subscription error:', err);
        callback([]);
      });
      return unsubscribe;
    } catch {
      callback([]);
      return () => {};
    }
  }

  public subscribeContactMessages(callback: (msgs: ContactMessage[]) => void): () => void {
    try {
      const q = collection(db, 'contactMessages');
      const unsubscribe = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => d.data() as ContactMessage);
        msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        callback(msgs);
      }, (err) => {
        console.warn('Contact messages subscription error:', err);
        callback([]);
      });
      return unsubscribe;
    } catch {
      callback([]);
      return () => {};
    }
  }

  public subscribeSiteContent(callback: (content: SiteContent) => void): () => void {
    try {
      const docRef = doc(db, 'siteContent', 'main');
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          callback(snap.data() as SiteContent);
        }
      }, (err) => {
        console.warn('Site content subscription error:', err);
      });
      return unsubscribe;
    } catch {
      return () => {};
    }
  }

  // --- REAL-TIME STUDENT ONLINE/OFFLINE PRESENCE (PROMPT 2) ---
  public subscribeStudentPresence(
    callback: (presenceMap: Record<string, { online: boolean; lastSeen: number; sessionCount: number }>, isError?: boolean) => void
  ): () => void {
    try {
      const q = collection(db, 'presenceSessions');
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const map: Record<string, { online: boolean; lastSeen: number; sessionCount: number }> = {};
          const now = Date.now();
          const LEASE_MS = 150_000;

          snap.forEach((d) => {
            const data = d.data();
            if (!data || !data.uid) return;
            const uid = data.uid;
            const rawTs = data.lastSeen;
            const lastSeen = rawTs?.toMillis ? rawTs.toMillis() : (typeof rawTs === 'number' ? rawTs : (rawTs ? new Date(rawTs).getTime() : 0));
            const isFresh = (now - lastSeen) < LEASE_MS && lastSeen > 0;

            if (!map[uid]) {
              map[uid] = {
                online: isFresh,
                lastSeen,
                sessionCount: isFresh ? 1 : 0
              };
            } else {
              if (lastSeen > map[uid].lastSeen) {
                map[uid].lastSeen = lastSeen;
              }
              if (isFresh) {
                map[uid].online = true;
                map[uid].sessionCount += 1;
              }
            }
          });
          callback(map, false);
        },
        async (err) => {
          console.warn('[PRESENCE] Real-time presenceSessions listener note:', err?.message || err);
          try {
            const fallback = await safeApiFetch<{ success: boolean; presence: Record<string, any> }>('/api/admin/presence', {
              headers: this.getAdminHeaders()
            });
            if (fallback && fallback.presence) {
              callback(fallback.presence, false);
              return;
            }
          } catch {}
          callback({}, true);
        }
      );
      return unsubscribe;
    } catch {
      callback({}, true);
      return () => {};
    }
  }

  // --- REAL DASHBOARD STATS ---
  public async getRealDashboardStats(): Promise<RealDashboardStats> {
    try {
      const [usersSnap, eventsSnap, regsSnap, teamSnap, msgsSnap, notifsSnap] = await Promise.all([
        getDocs(collection(db, 'users')).catch(() => null),
        getDocs(collection(db, 'events')).catch(() => null),
        getDocs(collection(db, 'registrations')).catch(() => null),
        getDocs(collection(db, 'teamMembers')).catch(() => null),
        getDocs(collection(db, 'contactMessages')).catch(() => null),
        getDocs(collection(db, 'notifications')).catch(() => null)
      ]);

      if (eventsSnap && regsSnap) {
        const events = eventsSnap.docs.map(d => d.data() as CompetitionEvent);
        const regs = regsSnap.docs.map(d => d.data() as RegistrationRecord);
        const confirmedRegs = regs.filter(r => r.registration_status === 'Confirmed');
        const msgs = msgsSnap ? msgsSnap.docs.map(d => d.data() as ContactMessage) : [];
        const notifs = notifsSnap ? notifsSnap.docs.map(d => d.data() as InAppNotification) : [];

        const totalStudents = usersSnap && !usersSnap.empty ? usersSnap.size : Math.max(regs.length, 1);
        const totalCompetitions = events.length;
        const publishedCompetitions = events.filter(e => e.status === 'Published').length;
        const totalRegistrations = regs.length;
        const confirmedRegistrations = confirmedRegs.length;
        const actualTeamMembers = teamSnap && !teamSnap.empty ? teamSnap.size : 6;
        const unreadVisitorMessages = msgs.filter(m => m.status === 'unread').length;
        const publishedNotifications = notifs.filter(n => n.status === 'Published').length;
        const upcomingEvents = events.filter(e => e.status === 'Published' && e.registration_open).length;
        const totalRevenue = confirmedRegistrations * 50;

        return {
          totalStudents,
          activeStudents: totalStudents,
          totalCompetitions,
          publishedCompetitions,
          totalRegistrations,
          confirmedRegistrations,
          actualTeamMembers,
          unreadVisitorMessages,
          publishedNotifications,
          upcomingEvents,
          totalRevenue
        };
      }
    } catch (err) {
      console.warn('Direct Firestore stats query note:', err);
    }

    try {
      const serverRes = await this.getAdminStats();
      if (serverRes?.stats) {
        const s = serverRes.stats;
        return {
          totalStudents: s.totalStudents || 1,
          activeStudents: s.onlineStudents || 1,
          totalCompetitions: s.totalCompetitions || 4,
          publishedCompetitions: s.activeCompetitions || 4,
          totalRegistrations: s.totalRegistrations || 0,
          confirmedRegistrations: s.totalRegistrations || 0,
          actualTeamMembers: s.teamMembers || 6,
          unreadVisitorMessages: 0,
          publishedNotifications: 0,
          upcomingEvents: 4,
          totalRevenue: (s.totalRegistrations || 0) * 50
        };
      }
    } catch {}

    return {
      totalStudents: 1,
      activeStudents: 1,
      totalCompetitions: 4,
      publishedCompetitions: 4,
      totalRegistrations: 0,
      confirmedRegistrations: 0,
      actualTeamMembers: 6,
      unreadVisitorMessages: 0,
      publishedNotifications: 0,
      upcomingEvents: 4,
      totalRevenue: 0
    };
  }

  public async getAllStudents(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as UserProfile);
      }
      return [];
    } catch (err) {
      console.warn('[STUDENTS DIRECTORY] Firestore users query warning:', err);
      return [];
    }
  }

  public async getNotifications(): Promise<InAppNotification[]> {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const notifs = snap.docs.map(d => d.data() as InAppNotification);
      return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  public async getContactMessages(): Promise<ContactMessage[]> {
    try {
      const snap = await getDocs(collection(db, 'contactMessages'));
      const msgs = snap.docs.map(d => d.data() as ContactMessage);
      return msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  public async getAuditLogs(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'adminAuditLogs'));
      const logs = snap.docs.map(d => d.data());
      return logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      try {
        // Cookie is sent automatically by the browser (HttpOnly, SameSite=Strict)
        const res = await safeApiFetch<{ success: boolean; logs: any[] }>('/api/admin/audit-logs');
        return res?.logs || [];
      } catch {
        return [];
      }
    }
  }

  // Admin Session Header Helper (kept for backward compatibility; cookies are automatic)
  private getAdminHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }

  // --- COMPETITION CRUD (PHASE 2 & PHASE 5 RESILIENT PERSISTENCE) ---
  public async createCompetition(eventData: Partial<CompetitionEvent>): Promise<CompetitionEvent> {
    if (!eventData.title || !eventData.title.trim()) {
      throw new Error('Competition title is required.');
    }

    // Auto-generate slug from title if not explicitly provided
    let cleanSlug = (eventData.slug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!cleanSlug) {
      cleanSlug = eventData.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (!cleanSlug) {
      cleanSlug = `event-${Date.now().toString(36)}`;
    }

    const newEvent: CompetitionEvent = {
      id: cleanSlug,
      slug: cleanSlug,
      title: eventData.title.trim(),
      tagline: eventData.tagline?.trim() || 'Engineered for Excellence',
      description: eventData.description?.trim() || eventData.short_description?.trim() || 'Join NEXORA for this flagship competition.',
      short_description: eventData.short_description?.trim() || eventData.description?.trim() || 'Flagship technical challenge.',
      full_description: eventData.full_description?.trim() || eventData.description?.trim() || 'Complete competition specifications.',
      category: eventData.category || 'AI-Assisted Development',
      difficulty: eventData.difficulty || 'All Skill Levels',
      status: eventData.status || 'Published',
      registration_open: eventData.registration_open !== false,
      is_published: eventData.status === 'Published',
      isComingSoon: Boolean(eventData.isComingSoon),
      capacity: toFiniteNumber(eventData.capacity, 60),
      registered_count: 0,
      fee_per_participant: toFiniteNumber(eventData.fee_per_participant, 50),
      banner_image: eventData.banner_image || eventData.cover_image || '/images/competitions/zerocode.jpg',
      cover_image: eventData.cover_image || eventData.banner_image || '/images/competitions/zerocode.jpg',
      event_date: eventData.event_date || 'TBA',
      registration_deadline: eventData.registration_deadline || 'TBA',
      venue: eventData.venue || 'BVM Engineering College, Vallabh Vidyanagar',
      duration: eventData.duration || '6 Hours',
      team_size: eventData.team_size || '1–4 Participants',
      min_team_size: toFiniteNumber(eventData.min_team_size, 1),
      max_team_size: toFiniteNumber(eventData.max_team_size, 4),
      eligibility: eventData.eligibility || 'Open to all engineering students.',
      prizes: eventData.prizes || {
        first_place: '₹2,000 Cash Prize',
        second_place: '₹1,000 Cash Prize',
        special_rewards: 'Certificates of Merit'
      },
      rules: eventData.rules?.length ? eventData.rules : ['Standard ethical engineering competition rules apply.'],
      judging_criteria: eventData.judging_criteria?.length ? eventData.judging_criteria : [
        { label: 'Technical Execution', percentage: 50, description: 'Code architecture and engineering' }
      ],
      faq: eventData.faq?.length ? eventData.faq : [
        { question: 'Who can participate?', answer: 'All engineering students across recognized colleges.' }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const sanitized = cleanFirestoreData(newEvent);

    // Check hard ceiling before creation
    const currentEvents = await this.getEvents();
    if (currentEvents.length >= 15) {
      throw new Error('Maximum competition limit reached (15/15 competitions). Archive or delete an existing competition to create a new one.');
    }

    // Primary: Write through secure server-side endpoint with Admin SDK
    try {
      const res = await safeApiFetch<{ success: boolean; competition?: CompetitionEvent }>('/api/admin/competitions', {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(sanitized)
      });
      if (res && res.competition) {
        this.notify();
        return res.competition;
      }
    } catch (apiErr: any) {
      if (apiErr?.status === 409 || apiErr?.message?.includes('limit')) {
        throw apiErr;
      }
      console.warn('[COMPETITION CREATE] Server endpoint fallback to direct Firestore:', apiErr);
      // Secondary Fallback: Direct client SDK write
      try {
        const evRef = doc(db, 'events', cleanSlug);
        await setDoc(evRef, sanitized);
      } catch (clientErr) {
        handleFirestoreError(clientErr, OperationType.CREATE, `events/${cleanSlug}`);
      }
    }

    await this.recordAdminAuditLog({
      event_type: 'COMPETITION_CREATED',
      details: `Created competition: ${newEvent.title} (${cleanSlug})`
    });

    this.notify();
    return newEvent;
  }

  public async updateCompetition(slug: string, updates: Partial<CompetitionEvent>): Promise<void> {
    const sanitizedUpdates = cleanFirestoreData({
      ...updates,
      slug,
      updated_at: new Date().toISOString()
    });

    // Primary: Write through secure server-side endpoint
    try {
      await safeApiFetch(`/api/admin/competitions/${slug}`, {
        method: 'PUT',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(sanitizedUpdates)
      });
    } catch (apiErr) {
      console.warn('[COMPETITION UPDATE] Server endpoint fallback to direct Firestore:', apiErr);
      try {
        const evRef = doc(db, 'events', slug);
        await updateDoc(evRef, sanitizedUpdates);
      } catch (clientErr) {
        handleFirestoreError(clientErr, OperationType.UPDATE, `events/${slug}`);
      }
    }

    await this.recordAdminAuditLog({
      event_type: 'COMPETITION_UPDATED',
      details: `Updated competition: ${slug}`
    });

    this.notify();
  }

  public async publishCompetition(slug: string, willPublish: boolean = true): Promise<void> {
    const status: EventStatus = willPublish ? 'Published' : 'Draft';
    await this.updateCompetition(slug, {
      status,
      is_published: willPublish,
      registration_open: willPublish
    });
  }

  public async archiveCompetition(slug: string): Promise<void> {
    await this.updateCompetition(slug, {
      status: 'Archived',
      is_published: false,
      registration_open: false
    });
  }

  public async deleteCompetition(slug: string): Promise<void> {
    // Primary: Server-side endpoint
    try {
      await safeApiFetch(`/api/admin/competitions/${slug}`, {
        method: 'DELETE',
        headers: this.getAdminHeaders()
      });
    } catch (apiErr) {
      console.warn('[COMPETITION DELETE] Server endpoint fallback to direct Firestore:', apiErr);
      const regs = await getDocs(query(collection(db, 'registrations'), where('event_slug', '==', slug)));
      if (!regs.empty) {
        throw new Error(`Cannot delete this competition because ${regs.size} student registration(s) exist. Please Archive it instead to safely preserve student registration history.`);
      }

      try {
        await deleteDoc(doc(db, 'events', slug));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `events/${slug}`);
      }
    }

    await this.recordAdminAuditLog({
      event_type: 'COMPETITION_DELETED',
      details: `Deleted competition: ${slug}`
    });

    this.notify();
  }

  // --- NOTIFICATIONS (PHASE 8 FIX: SAFE SERVER-SIDE PERSISTENCE & UNDEFINED GUARDS) ---
  public async createNotification(notifData: Partial<InAppNotification>): Promise<InAppNotification> {
    const notifId = notifData.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newNotif: InAppNotification = {
      id: notifId,
      title: notifData.title?.trim() || 'Announcement',
      message: notifData.message?.trim() || '',
      category: notifData.category || 'Announcement',
      priority: notifData.priority || 'Normal',
      audience: notifData.audience || 'all',
      status: notifData.status || 'Published',
      created_at: now
    };

    if (notifData.link_url?.trim()) newNotif.link_url = notifData.link_url.trim();
    if (notifData.link_text?.trim()) newNotif.link_text = notifData.link_text.trim();
    if (notifData.image_url?.trim()) newNotif.image_url = notifData.image_url.trim();
    if (notifData.publish_at?.trim()) newNotif.publish_at = notifData.publish_at.trim();
    if (notifData.expires_at?.trim()) newNotif.expires_at = notifData.expires_at.trim();
    if (notifData.created_by?.trim()) newNotif.created_by = notifData.created_by.trim();

    const sanitized = cleanFirestoreData(newNotif);

    // Primary: Write through secure server-side endpoint
    try {
      const res = await safeApiFetch<{ success: boolean; notification?: InAppNotification }>('/api/admin/notifications', {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(sanitized)
      });
      if (res && res.notification) {
        this.notify();
        return res.notification;
      }
    } catch (apiErr) {
      console.warn('[NOTIFICATION CREATE] Server endpoint fallback to direct Firestore:', apiErr);
      try {
        await setDoc(doc(db, 'notifications', notifId), sanitized);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
      }
    }

    await this.recordAdminAuditLog({
      event_type: 'NOTIFICATION_PUBLISHED',
      details: `Broadcast notification: "${newNotif.title}"`
    });

    this.notify();
    return newNotif;
  }

  public async deleteNotification(id: string): Promise<void> {
    try {
      await safeApiFetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: this.getAdminHeaders()
      });
    } catch (apiErr) {
      console.warn('[NOTIFICATION DELETE] Server endpoint fallback to direct Firestore:', apiErr);
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
      }
    }
    this.notify();
  }

  // --- IMAGE LIBRARY (PHASE 3) ---
  public async getImageLibrary(): Promise<ImageLibraryItem[]> {
    try {
      const res = await safeApiFetch<{ success: boolean; images: ImageLibraryItem[] }>('/api/admin/images', {
        headers: this.getAdminHeaders()
      });
      if (res && Array.isArray(res.images)) {
        return res.images;
      }
    } catch (apiErr) {
      console.warn('[IMAGE LIBRARY] Server fallback to direct Firestore:', apiErr);
    }

    try {
      const snap = await getDocs(collection(db, 'imageLibrary'));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ImageLibraryItem));
      }
    } catch {}

    return [];
  }

  public async addImageToLibrary(item: Partial<ImageLibraryItem>): Promise<ImageLibraryItem> {
    const id = item.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: ImageLibraryItem = {
      id,
      title: item.title?.trim() || 'Uploaded Image',
      category: item.category || 'General Student Groups',
      url: item.url?.trim() || '',
      file_name: item.file_name || 'image.jpg',
      file_size: item.file_size || 0,
      dimensions: item.dimensions || '1200x800',
      uploaded_by: 'NEXORA Admin Desk',
      is_system_preset: Boolean(item.is_system_preset),
      created_at: new Date().toISOString()
    };

    try {
      const res = await safeApiFetch<{ success: boolean; image: ImageLibraryItem }>('/api/admin/images', {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(fullItem)
      });
      if (res && res.image) return res.image;
    } catch (apiErr) {
      console.warn('[IMAGE ADD] Server fallback to direct Firestore:', apiErr);
      try {
        await setDoc(doc(db, 'imageLibrary', id), cleanFirestoreData(fullItem));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `imageLibrary/${id}`);
      }
    }

    return fullItem;
  }

  public async deleteImageFromLibrary(id: string): Promise<void> {
    const res = await safeApiFetch<{ success: boolean; error?: string; inUse?: boolean; usedBy?: string }>(`/api/admin/images/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders()
    });

    if (res && (res as any).error) {
      throw new Error((res as any).error);
    }
  }

  // --- TEAM CMS CRUD (PHASE 5) ---
  public async getTeamMeta(): Promise<{
    roles: TeamRole[];
    branches: AcademicBranch[];
    divisions: TeamDivision[];
    departments: TeamDepartment[];
  }> {
    try {
      const res = await safeApiFetch<{ success: boolean; meta: any }>('/api/admin/team/meta', {
        headers: this.getAdminHeaders()
      });
      if (res && res.meta) return res.meta;
    } catch {}

    try {
      const snap = await getDoc(doc(db, 'teamConfig', 'meta'));
      if (snap.exists()) return snap.data() as any;
    } catch {}

    return { roles: [], branches: [], divisions: [], departments: [] };
  }

  public async updateTeamMeta(meta: any): Promise<void> {
    try {
      await safeApiFetch('/api/admin/team/meta', {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(meta)
      });
    } catch (apiErr) {
      console.warn('[TEAM META] Server fallback to direct Firestore:', apiErr);
      await setDoc(doc(db, 'teamConfig', 'meta'), cleanFirestoreData(meta), { merge: true });
    }
  }

  public async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const res = await safeApiFetch<{ success: boolean; members: TeamMember[] }>('/api/admin/team/members', {
        headers: this.getAdminHeaders()
      });
      if (res && Array.isArray(res.members)) return res.members;
    } catch {}

    try {
      const snap = await getDocs(collection(db, 'teamMembers'));
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMember));
        list.sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
        return list;
      }
    } catch {}

    return [];
  }

  public async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    const id = data.id || `member_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newMember: TeamMember = {
      id,
      name: data.name?.trim() || '',
      role_name: data.role_name || 'Executive Member',
      academic_branch_name: data.academic_branch_name || 'Engineering',
      division: data.division || 'Division A',
      department_name: data.department_name || 'Technical Operations',
      bio: data.bio?.trim() || '',
      avatar_url: data.avatar_url?.trim() || '/images/team/mitesh_founder.jpg',
      enrollment_number: data.enrollment_number?.trim() || '',
      institution: data.institution?.trim() || 'Birla Vishvakarma Mahavidyalaya',
      social_links: data.social_links || {},
      display_order: Number(data.display_order) || 99,
      is_featured: Boolean(data.is_featured),
      is_founder: Boolean(data.is_founder),
      enabled: data.enabled !== false,
      created_at: now,
      updated_at: now
    };

    try {
      const res = await safeApiFetch<{ success: boolean; member: TeamMember }>('/api/admin/team/members', {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(newMember)
      });
      if (res && res.member) return res.member;
    } catch (apiErr) {
      console.warn('[TEAM MEMBER CREATE] Server fallback to direct Firestore:', apiErr);
      await setDoc(doc(db, 'teamMembers', id), cleanFirestoreData(newMember));
    }

    return newMember;
  }

  public async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<void> {
    try {
      await safeApiFetch(`/api/admin/team/members/${id}`, {
        method: 'PUT',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(updates)
      });
    } catch (apiErr) {
      console.warn('[TEAM MEMBER UPDATE] Server fallback to direct Firestore:', apiErr);
      await updateDoc(doc(db, 'teamMembers', id), cleanFirestoreData(updates));
    }
  }

  public async deleteTeamMember(id: string): Promise<void> {
    try {
      await safeApiFetch(`/api/admin/team/members/${id}`, {
        method: 'DELETE',
        headers: this.getAdminHeaders()
      });
    } catch (apiErr) {
      console.warn('[TEAM MEMBER DELETE] Server fallback to direct Firestore:', apiErr);
      await deleteDoc(doc(db, 'teamMembers', id));
    }
  }

  public async getPublicTeamData(): Promise<{ members: TeamMember[]; meta: any }> {
    // Public endpoint may be slow on a cold serverless invocation. Do not let the
    // Team page remain on a spinner for 30 seconds before trying Firestore.
    try {
      const response = await fetch('/api/team/public', {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Team API responded ${response.status}`);
      const result = await response.json() as { members?: TeamMember[]; meta?: any };
      if (Array.isArray(result.members)) {
        return {
          members: result.members.filter(member => member.enabled !== false),
          meta: result.meta ?? {},
        };
      }
      throw new Error('Invalid team payload');
    } catch (error) {
      console.warn('[TEAM] Fast public endpoint unavailable; using Firestore fallback:', error);
    }
    // These queries are independent; do not await them sequentially.
    const [members, meta] = await Promise.all([
      this.getTeamMembers(),
      this.getTeamMeta(),
    ]);
    return { members: members.filter(member => member.enabled !== false), meta };
  }

  // --- STUDENT NOTIFICATION READ RECEIPTS ---
  public async getReadNotificationIds(userId: string): Promise<Set<string>> {
    try {
      const q = query(collection(db, 'userNotificationReads'), where('user_id', '==', userId));
      const snap = await getDocs(q);
      const set = new Set<string>();
      snap.forEach(d => {
        const data = d.data();
        if (data.notification_id) set.add(data.notification_id);
      });
      return set;
    } catch {
      return new Set();
    }
  }

  public async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const receiptId = `${userId}_${notificationId}`.replace(/[:\/]/g, '_');
      await setDoc(doc(db, 'userNotificationReads', receiptId), {
        user_id: userId,
        notification_id: notificationId,
        read_at: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Read receipt write error:', err);
    }
  }

  // --- CONTACT MESSAGE REPLIES ---
  public async replyToContactMessage(messageId: string, replyText: string, channel: 'in-app' | 'email'): Promise<void> {
    const msgRef = doc(db, 'contactMessages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) throw new Error('Contact message not found.');
    const msg = snap.data() as ContactMessage;

    const reply = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender_name: 'NEXORA Organizing Desk',
      message: replyText.trim(),
      created_at: new Date().toISOString(),
      is_admin_reply: true,
      channel
    };

    const updatedReplies = [...(msg.replies || []), reply];
    await updateDoc(msgRef, {
      replies: updatedReplies,
      status: 'resolved',
      updated_at: new Date().toISOString()
    });
  }

  // --- WEBSITE CONTENT CMS (PHASE 8) ---
  public async updateSiteContent(content: SiteContent): Promise<void> {
    const docRef = doc(db, 'siteContent', 'main');
    await setDoc(docRef, {
      ...content,
      updated_at: new Date().toISOString(),
      updated_by: auth.currentUser?.email || 'founder'
    }, { merge: true });
  }

  // --- STATUS UPDATES ---
  public async updatePaymentStatus(regId: string, status: PaymentStatus): Promise<void> {
    const regRef = doc(db, 'registrations', regId);
    await updateDoc(regRef, {
      payment_status: status,
      updated_at: new Date().toISOString()
    });
    this.notify();
  }

  public async updateRegistrationStatus(regId: string, status: RegistrationStatus): Promise<void> {
    const regRef = doc(db, 'registrations', regId);
    await updateDoc(regRef, {
      registration_status: status,
      updated_at: new Date().toISOString()
    });
    this.notify();
  }

  // --- IMAGE UPLOAD (PHASE 6) ---
  public async uploadLocalImage(
    file: File, 
    folder: string = 'competitions', 
    onProgress?: (pct: number) => void
  ): Promise<{ url: string; name: string }> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error('Unsupported file format. Please upload JPG, PNG, or WebP images.');
    }
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('Image exceeds 25 MB size limit. Please select a smaller or compressed image.');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `${folder}/${safeName}`;

    try {
      const fileRef = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser?.email || 'admin',
          originalName: file.name
        }
      });

      return await new Promise<{ url: string; name: string }>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(Math.min(99, pct));
            }
          },
          (err) => {
            console.warn('[STORAGE] Resumable upload failed, falling back to server preview:', err);
            this.uploadViaServerFallback(file, safeName, onProgress).then(resolve).catch(reject);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve({ url: downloadUrl, name: safeName });
            } catch (urlErr) {
              this.uploadViaServerFallback(file, safeName, onProgress).then(resolve).catch(reject);
            }
          }
        );
      });
    } catch {
      return this.uploadViaServerFallback(file, safeName, onProgress);
    }
  }

  private async uploadViaServerFallback(
    file: File, 
    safeName: string, 
    onProgress?: (pct: number) => void
  ): Promise<{ url: string; name: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 90));
        }
      };
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await this.uploadAdminImage(base64, safeName);
          if (onProgress) onProgress(100);
          resolve({ url: res.url, name: safeName });
        } catch {
          if (onProgress) onProgress(100);
          resolve({ url: reader.result as string, name: safeName });
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(file);
    });
  }
}

export const dataService = new NexoraDataService();
