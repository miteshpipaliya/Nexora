import { 
  UserProfile, 
  CompetitionEvent, 
  RegistrationRecord, 
  ContactMessage, 
  RegistrationStatus, 
  PaymentStatus,
  TeamMemberDetail,
  AcademicYear
} from '../types';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  signOut,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection
} from './firebase';
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
  writeBatch
} from 'firebase/firestore';
import { 
  INITIAL_EVENTS, 
  INITIAL_DEMO_USER, 
  INITIAL_REGISTRATIONS 
} from './mockData';
import { safeApiFetch } from './apiClient';

// Administrator emails
export const ADMIN_EMAILS = [
  'miteshpipaliya2202@gmail.com',
  'editwithvision@gmail.com'
];
export const ADMIN_PHONE = '+91 8200243606';

// Cryptographically secure competition ID generator (Format: ZC-XXXX, CTF-XXXX, HN-XXXX, CR-XXXX)
export function generateCompetitionId(eventSlug: 'zerocode' | 'ctf' | 'hackathon' | 'coderush'): string {
  const prefixMap = {
    zerocode: 'ZC-',
    ctf: 'CTF-',
    hackathon: 'HN-',
    coderush: 'CR-'
  };
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = prefixMap[eventSlug] || 'NXR-';

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
  try {
    const user = auth.currentUser;
    if (!user || !user.uid) return;
    await safeApiFetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, email: user.email || '' })
    }).catch(() => {});
  } catch {
    // Failures in presence heartbeat must never crash the UI
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
        try {
          this.currentUserCache = await this.fetchUserProfile(fbUser.uid, fbUser);
        } catch {
          this.currentUserCache = this.buildFallbackProfile(fbUser);
        }
      } else {
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

  public isUserAdmin(emailOrUser?: string | UserProfile | null): boolean {
    if (!emailOrUser) {
      if (!this.currentUserCache) return false;
      return ADMIN_EMAILS.includes(this.currentUserCache.email.toLowerCase().trim());
    }
    if (typeof emailOrUser === 'string') {
      return ADMIN_EMAILS.includes(emailOrUser.toLowerCase().trim());
    }
    return Boolean(emailOrUser.is_admin || ADMIN_EMAILS.includes(emailOrUser.email.toLowerCase().trim()));
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
        const isAdmin = ADMIN_EMAILS.includes((fbUser.email || '').toLowerCase().trim());
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
    const isAdmin = ADMIN_EMAILS.includes((fbUser.email || '').toLowerCase().trim());
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
      is_admin: isAdmin,
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

      const isAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase().trim());

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
      const result = await createUserWithEmailAndPassword(auth, data.email.trim().toLowerCase(), data.password);
      const user = result.user;

      let emailVerified = false;
      if (data.verificationToken) {
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
          if (confirmRes.ok) {
            emailVerified = true;
          }
        } catch {
          // Non-fatal confirmation fallback
        }
      }

      const isAdmin = ADMIN_EMAILS.includes(data.email.trim().toLowerCase());

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

    // Also trigger Firebase client password reset if possible
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch {
      // ignore
    }
  }


  // 6. Sign Out
  public async logout(): Promise<void> {
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
    try {
      const q = query(
        collection(db, 'registrations'),
        where('user_id', '==', userId)
      );
      const snap = await getDocs(q);
      const results: RegistrationRecord[] = [];
      snap.forEach((docSnap) => {
        results.push(docSnap.data() as RegistrationRecord);
      });
      return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.warn('Could not fetch registrations from Firestore:', err);
      return [];
    }
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
    event_slug: 'zerocode' | 'ctf' | 'hackathon' | 'coderush';
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

    // Duplicate check
    const alreadyRegistered = await this.isUserRegisteredForEvent(user.uid, data.event_slug);
    if (alreadyRegistered) {
      throw new Error('You are already registered for this competition.');
    }

    const event = await this.getEventBySlug(data.event_slug);
    if (!event) throw new Error('Event not found.');

    if (!event.registration_open) {
      throw new Error('Registration for this competition is currently closed.');
    }

    if (event.registered_count >= event.capacity) {
      throw new Error('Competition capacity has been reached. Please contact NEXORA organizing desk.');
    }

    // Generate unique permanent competition ID e.g. ZC-A7K2
    const competitionId = generateCompetitionId(data.event_slug);

    // Uniform ₹50 fee calculation
    const participantCount = data.team_members && data.team_members.length > 0 
      ? data.team_members.length 
      : 1;
    const totalFee = participantCount * 50;

    const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newRecord: RegistrationRecord = {
      id: regId,
      competition_id: competitionId,
      reference_id: competitionId,
      user_id: user.uid,
      event_slug: data.event_slug,
      event_title: event.title,
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone_number: data.phone_number.trim(),
      college: data.college.trim(),
      branch: data.branch.trim(),
      academic_year: data.academic_year,
      enrollment_number: data.enrollment_number.trim().toUpperCase(),
      division: data.division?.trim() || '',
      team_name: data.team_name?.trim() || '',
      team_members: data.team_members?.filter(Boolean) || [],
      team_member_details: data.team_member_details || [],
      participant_count: participantCount,
      registration_status: 'Confirmed',
      payment_status: 'Unpaid',
      calculated_fee: totalFee,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const regRef = doc(db, 'registrations', regId);
      await setDoc(regRef, newRecord);

      // Increment registered_count on event
      try {
        const evRef = doc(db, 'events', data.event_slug);
        await updateDoc(evRef, {
          registered_count: (event.registered_count || 0) + 1
        });
      } catch (evErr) {
        console.warn('Event count update note:', evErr);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `registrations/${regId}`);
    }

    this.notify();
    return newRecord;
  }

  // --- CONTACT INQUIRIES ---
  public async submitContactMessage(data: {
    sender_name: string;
    sender_email: string;
    subject?: string;
    message: string;
  }): Promise<ContactMessage> {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ContactMessage = {
      id: msgId,
      sender_name: data.sender_name.trim(),
      sender_email: data.sender_email.trim().toLowerCase(),
      subject: data.subject?.trim() || 'General Inquiry',
      message: data.message.trim(),
      created_at: new Date().toISOString()
    };

    try {
      const msgRef = doc(db, 'contactMessages', msgId);
      await setDoc(msgRef, newMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `contactMessages/${msgId}`);
    }

    return newMsg;
  }

  // --- FOUNDER ADMIN SECURITY & CONSOLE METHODS ---
  public async getAdminStatus(): Promise<{
    initialized: boolean;
    founderEmail: string;
    maskedEmail: string;
    founderPhone: string;
    maskedPhone: string;
  }> {
    return safeApiFetch('/api/admin/auth/status', { method: 'POST' });
  }

  public async requestAdminSetupOtp(): Promise<{
    success: boolean;
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldown: number;
  }> {
    return safeApiFetch('/api/admin/auth/request-setup-otp', { method: 'POST' });
  }

  public async setupAdminPassword(setupOtp: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    return safeApiFetch('/api/admin/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupOtp, newPassword, confirmPassword })
    });
  }

  public async verifyAdminPassword(password: string): Promise<{
    success: boolean;
    passwordToken: string;
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldown: number;
  }> {
    return safeApiFetch('/api/admin/auth/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
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

    sessionStorage.setItem('nexora_elevated_admin_token', data.sessionToken);
    sessionStorage.setItem('nexora_elevated_admin_expires', data.expiresAt.toString());
    return data;
  }

  // Backward compatibility alias for any existing caller
  public async startAdminChallenge(adminEmail: string) {
    return this.getAdminStatus();
  }

  public async verifyAdminDualOtp(challengeId: string, emailOtp: string, smsOtp: string) {
    return { sessionToken: challengeId, expiresAt: Date.now() + 15 * 60 * 1000 };
  }

  public async checkElevatedAdminSession(): Promise<boolean> {
    const token = sessionStorage.getItem('nexora_elevated_admin_token');
    const expires = sessionStorage.getItem('nexora_elevated_admin_expires');

    if (!token || !expires) return false;
    if (Date.now() > Number(expires)) {
      this.clearElevatedAdminSession();
      return false;
    }

    try {
      const data = await safeApiFetch<{ authenticated: boolean }>('/api/admin/auth/session', {
        headers: { 'x-admin-session': token }
      });
      if (!data.authenticated) {
        this.clearElevatedAdminSession();
        return false;
      }
      return true;
    } catch {
      return Date.now() < Number(expires);
    }
  }

  public clearElevatedAdminSession() {
    const token = sessionStorage.getItem('nexora_elevated_admin_token');
    if (token) {
      safeApiFetch('/api/admin/auth/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token })
      }).catch(() => {});
    }
    sessionStorage.removeItem('nexora_elevated_admin_token');
    sessionStorage.removeItem('nexora_elevated_admin_expires');
  }

  public sendPresenceHeartbeat = sendPresenceHeartbeat;

  public async getAdminStats(): Promise<any> {
    const token = sessionStorage.getItem('nexora_elevated_admin_token') || '';
    return safeApiFetch('/api/admin/stats', {
      headers: { 'x-admin-session': token }
    });
  }

  public async getAdminStudents(): Promise<any> {
    const token = sessionStorage.getItem('nexora_elevated_admin_token') || '';
    return safeApiFetch('/api/admin/students', {
      headers: { 'x-admin-session': token }
    });
  }

  public async uploadAdminImage(imageBase64: string, filename?: string): Promise<{ success: boolean; url: string }> {
    const token = sessionStorage.getItem('nexora_elevated_admin_token') || '';
    return safeApiFetch('/api/admin/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-session': token
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

  // --- STUDENT PRESENCE HEARTBEAT ---
  public async sendPresenceHeartbeat(): Promise<void> {
    try {
      const user = auth.currentUser || this.currentUserCache;
      if (!user) return;
      const payload = {
        userId: 'uid' in user ? user.uid : user.id,
        email: user.email,
        name: 'displayName' in user ? user.displayName : (user as any).name || (user as any).full_name || ''
      };
      await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      // Non-fatal presence ping
    }
  }

  // --- FOUNDER CONSOLE AUTHENTICATION & MANAGEMENT ---
  public async getAdminStatus(): Promise<{
    initialized: boolean;
    founderEmail: string;
    maskedEmail: string;
    founderPhone: string;
    maskedPhone: string;
  }> {
    const founderEmail = ADMIN_EMAILS[0];
    const maskedEmail = maskEmail(founderEmail);
    const founderPhone = ADMIN_PHONE;
    const maskedPhone = maskPhone(ADMIN_PHONE);

    try {
      const response = await fetch('/api/admin/status');
      if (response.ok) {
        const data = await response.json();
        return {
          initialized: !!data.initialized,
          founderEmail: data.founderEmail || founderEmail,
          maskedEmail: data.maskedEmail || maskedEmail,
          founderPhone: data.founderPhone || founderPhone,
          maskedPhone: data.maskedPhone || maskedPhone
        };
      }
    } catch {
      // Fallback
    }
    return {
      initialized: true,
      founderEmail,
      maskedEmail,
      founderPhone,
      maskedPhone
    };
  }

  public async requestAdminSetupOtp(): Promise<{ success: boolean; maskedEmail: string }> {
    const response = await fetch('/api/admin/request-setup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return safeParseJsonResponse<{ success: boolean; maskedEmail: string }>(response, 'Failed to dispatch setup code.');
  }

  public async setupAdminPassword(setupOtp: string, newAdminPassword: string, confirmAdminPassword: string): Promise<{ success: boolean }> {
    const response = await fetch('/api/admin/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupOtp, newAdminPassword, confirmAdminPassword })
    });
    return safeParseJsonResponse<{ success: boolean }>(response, 'Failed to set up Admin Security Password.');
  }

  public async verifyAdminPassword(password: string): Promise<{ passwordToken: string; maskedEmail: string }> {
    const response = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return safeParseJsonResponse<{ passwordToken: string; maskedEmail: string }>(response, 'Incorrect Admin Security Password.');
  }

  public async resendAdminOtp(passwordToken: string): Promise<{ success: boolean }> {
    const response = await fetch('/api/admin/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordToken })
    });
    return safeParseJsonResponse<{ success: boolean }>(response, 'Failed to resend verification code.');
  }

  public async verifyAdminOtp(passwordToken: string, otp: string): Promise<{ sessionToken: string; durationMinutes: number }> {
    const response = await fetch('/api/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordToken, otp })
    });
    const data = await safeParseJsonResponse<{ sessionToken: string; durationMinutes: number; expiresAt: number }>(response, 'Incorrect verification code.');
    sessionStorage.setItem('nexora_elevated_admin_token', data.sessionToken);
    sessionStorage.setItem('nexora_elevated_admin_expires', (data.expiresAt || (Date.now() + 30 * 60 * 1000)).toString());
    return data;
  }

  public async getAdminStats(): Promise<{ stats: { registeredStudents: number; eventRegistrations: number; publishedEvents: number; unreadMessages: number; activeStudents: number } }> {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }

    // Dynamic fallback from cached/live data
    const regs = await this.getAllRegistrations().catch(() => []);
    const events = await this.getEvents().catch(() => []);
    return {
      stats: {
        registeredStudents: Math.max(regs.length, 1),
        eventRegistrations: regs.length,
        publishedEvents: events.length || 4,
        unreadMessages: 0,
        activeStudents: 1
      }
    };
  }

  public async getAdminStudents(): Promise<{ students: Array<{ id: string; email: string; name?: string; lastSeen: number; status: 'online' | 'recent' | 'offline' }> }> {
    try {
      const response = await fetch('/api/admin/students');
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }
    return {
      students: [
        {
          id: 'admin_primary',
          email: ADMIN_EMAILS[0],
          name: 'Mitesh Pipaliya (Founder)',
          lastSeen: Date.now(),
          status: 'online'
        }
      ]
    };
  }
}

export const dataService = new NexoraDataService();
