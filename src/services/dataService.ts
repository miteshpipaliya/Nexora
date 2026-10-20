import { 
  UserProfile, 
  CompetitionEvent, 
  RegistrationRecord, 
  ContactMessage, 
  RegistrationStatus, 
  PaymentStatus,
  TeamMemberDetail,
  AcademicYear,
  InAppNotification,
  SiteContent,
  RealDashboardStats,
  MessageReply,
  TeamMemberProfile
} from '../types';
import { 
  auth, 
  db, 
  storage,
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
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  INITIAL_EVENTS, 
  FOUNDING_TEAM
} from './mockData';
import { extractErrorMessage } from './apiClient';
import firebaseConfig from '../../firebase-applet-config.json';

// Administrator emails
export const ADMIN_EMAILS = [
  'miteshpipaliya2202@gmail.com',
  'mitesh.aiml@gmail.com',
  'editwithvision@gmail.com'
];
export const ADMIN_PHONE = '+91 8200243606';

// Cryptographically secure competition ID generator (Format: ZC-XXXX, CTF-XXXX, HN-XXXX, CR-XXXX)
export function generateCompetitionId(eventSlug: string): string {
  const prefixMap: Record<string, string> = {
    zerocode: 'ZC-',
    ctf: 'CTF-',
    hackathon: 'HN-',
    coderush: 'CR-'
  };
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = prefixMap[eventSlug.toLowerCase()] || 'NXR-';

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

// Safe HTTP JSON Response Parser with strict error extraction
async function safeParseJsonResponse<T = any>(res: Response, defaultErrorMsg: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  let body: any = null;
  if (isJson) {
    try {
      body = await res.json();
    } catch {
      // JSON syntax error
    }
  } else {
    const rawText = await res.text().catch(() => '');
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Backend route not found (HTTP 404). Please ensure the API server is reachable.');
      }
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(`Server temporarily unavailable (HTTP ${res.status}). Please try again shortly.`);
      }
      const cleaned = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
      throw new Error(cleaned || `${defaultErrorMsg} (HTTP ${res.status})`);
    }
  }

  if (!res.ok) {
    const errorMsg = extractErrorMessage(body, `${defaultErrorMsg} (HTTP ${res.status})`);
    const errObj = new Error(errorMsg);
    (errObj as any).code = body?.code;
    (errObj as any).status = res.status;
    (errObj as any).details = body;
    throw errObj;
  }

  return (body ?? {}) as T;
}

class NexoraDataService {
  private listeners: Set<() => void> = new Set();
  private authInitialized: boolean = false;
  private currentUserCache: UserProfile | null = null;
  private eventsInitialized: boolean = false;

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
          is_profile_complete: Boolean(data.enrollment_number && data.branch),
          last_active: data.last_active || Date.now()
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
      is_profile_complete: false,
      last_active: Date.now()
    };
  }

  // 1. Google Account Sign-In
  public async loginWithGoogle(): Promise<UserProfile> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
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
          is_profile_complete: false,
          last_active: Date.now()
        };

        try {
          await setDoc(userDocRef, {
            ...profile,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
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
          is_profile_complete: Boolean(data.enrollment_number && data.branch),
          last_active: Date.now()
        };

        // Update last active
        setDoc(userDocRef, { last_active: Date.now() }, { merge: true }).catch(() => {});
      }

      this.currentUserCache = profile;
      this.notify();
      return profile;
    } catch (error: any) {
      const errObj: any = new Error(extractErrorMessage(error, 'Google Sign-In failed.'));
      errObj.code = error?.code || 'auth/unknown';
      if (error?.code === 'auth/unauthorized-domain') {
        errObj.message = "Google Sign-In domain is not yet authorized in Firebase Console. Please register with your email below.";
        errObj.isDomainError = true;
      }
      throw errObj;
    }
  }

  // 2. Email & Password Sign-In
  public async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      const profile = await this.fetchUserProfile(result.user.uid, result.user);
      
      // Update last_active
      setDoc(doc(db, 'users', result.user.uid), { last_active: Date.now() }, { merge: true }).catch(() => {});

      this.currentUserCache = profile;
      this.notify();
      return profile;
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }
      if (error?.code === 'auth/too-many-requests') {
        throw new Error('Access temporarily disabled due to failed login attempts. Reset your password or try again later.');
      }
      throw new Error(extractErrorMessage(error, 'Failed to sign in.'));
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
          // non-fatal
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
        is_profile_complete: true,
        last_active: Date.now()
      };

      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          ...profilePayload,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
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
      throw new Error(extractErrorMessage(error, 'Failed to create account.'));
    }
  }

  public async sendVerificationEmail(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No signed-in user found.');
    await sendEmailVerification(user);
  }

  public async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') return;
      throw new Error(extractErrorMessage(error, 'Failed to send password reset email.'));
    }
  }

  // 5a. Send 6-digit Email OTP via Brevo backend
  public async sendEmailOtp(email: string, purpose: 'signup' | 'reset-password' = 'signup'): Promise<{
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldown: number;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, purpose })
    });

    const data = await safeParseJsonResponse<{
      maskedEmail?: string;
      expiresInSeconds?: number;
      resendCooldown?: number;
    }>(res, 'Failed to dispatch verification code via email.');

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

    const res = await fetch('/api/auth/verify-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, purpose })
    });

    const data = await safeParseJsonResponse<{
      verificationToken: string;
      expiresAt: number;
    }>(res, 'Invalid or expired verification code.');

    return {
      verificationToken: data.verificationToken,
      expiresAt: data.expiresAt
    };
  }

  // 5c. Complete Password Reset using Verified OTP Token
  public async resetPasswordWithOtp(email: string, verificationToken: string, newPassword: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, verificationToken, newPassword })
    });

    await safeParseJsonResponse(res, 'Failed to update password.');
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch {}
  }

  public async logout(): Promise<void> {
    await signOut(auth);
    this.currentUserCache = null;
    this.notify();
  }

  public async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required.');

    const userDocRef = doc(db, 'users', user.uid);
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
      last_active: Date.now()
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

  // ==========================================
  // PRIORITY 1: REAL DATABASE-BACKED STATISTICS
  // ==========================================
  public async getRealDashboardStats(): Promise<RealDashboardStats> {
    try {
      // 1. Fetch real students from users collection
      const usersSnap = await getDocs(collection(db, 'users'));
      const totalStudents = usersSnap.size;

      // 2. Compute active students based on 15-minute activity window
      const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
      let activeStudents = 0;
      usersSnap.forEach((docSnap) => {
        const u = docSnap.data();
        const lastActiveTime = typeof u.last_active === 'number' 
          ? u.last_active 
          : (u.updated_at ? new Date(u.updated_at).getTime() : 0);
        if (lastActiveTime >= fifteenMinsAgo) {
          activeStudents++;
        }
      });

      // 3. Fetch real competitions from events collection
      const eventsSnap = await getDocs(collection(db, 'events'));
      const totalCompetitions = eventsSnap.size;
      let publishedCompetitions = 0;
      let upcomingEvents = 0;

      eventsSnap.forEach((docSnap) => {
        const ev = docSnap.data() as CompetitionEvent;
        const isPub = ev.status !== 'Draft' && ev.status !== 'Archived';
        if (isPub) publishedCompetitions++;
        if (ev.registration_open) upcomingEvents++;
      });

      // 4. Fetch real registrations
      const regSnap = await getDocs(collection(db, 'registrations'));
      const totalRegistrations = regSnap.size;
      let confirmedRegistrations = 0;
      let totalRevenue = 0;

      regSnap.forEach((docSnap) => {
        const r = docSnap.data() as RegistrationRecord;
        if (r.registration_status === 'Confirmed') confirmedRegistrations++;
        totalRevenue += (r.calculated_fee || 0);
      });

      // 5. Fetch team members
      const teamSnap = await getDocs(collection(db, 'teamMembers'));
      const actualTeamMembers = teamSnap.size;

      // 6. Fetch unread visitor messages
      const msgSnap = await getDocs(collection(db, 'contactMessages'));
      let unreadVisitorMessages = 0;
      msgSnap.forEach((docSnap) => {
        const m = docSnap.data() as ContactMessage;
        if (m.status === 'unread' || (!m.status && !(m as any).read)) {
          unreadVisitorMessages++;
        }
      });

      // 7. Fetch published notifications
      const notifSnap = await getDocs(collection(db, 'notifications'));
      let publishedNotifications = 0;
      notifSnap.forEach((docSnap) => {
        const n = docSnap.data() as InAppNotification;
        if (n.status === 'Published') publishedNotifications++;
      });

      return {
        totalStudents,
        activeStudents,
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
    } catch (err: any) {
      console.error('[DATABASE METRICS ERROR]', err);
      throw new Error(`Failed to load real database statistics: ${extractErrorMessage(err)}`);
    }
  }

  // ==========================================
  // PRIORITY 2 & 3: COMPETITION CRUD & REAL-TIME SYNC
  // ==========================================
  
  // Real-time listener on events collection
  public subscribeEvents(callback: (events: CompetitionEvent[]) => void): () => void {
    // Initial check for one-time seed if DB is completely fresh
    this.ensureEventsInitialized().catch(() => {});

    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: CompetitionEvent[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as CompetitionEvent);
      });
      callback(results);
    }, (error) => {
      console.warn('Real-time events subscription note:', error);
      this.getEvents().then(callback).catch(() => callback([]));
    });

    return unsubscribe;
  }

  // One-time initialization guard (never recreates after user archives/deletes)
  private async ensureEventsInitialized(): Promise<void> {
    if (this.eventsInitialized) return;
    try {
      const initDocRef = doc(db, 'systemConfig', 'events_initialized');
      const initSnap = await getDoc(initDocRef);
      if (initSnap.exists()) {
        this.eventsInitialized = true;
        return;
      }

      // Check if events collection has any docs
      const existingSnap = await getDocs(collection(db, 'events'));
      if (!existingSnap.empty) {
        await setDoc(initDocRef, { initializedAt: new Date().toISOString() });
        this.eventsInitialized = true;
        return;
      }

      // First-time seed of initial 4 flagship events
      const batch = writeBatch(db);
      for (const ev of INITIAL_EVENTS) {
        const evRef = doc(db, 'events', ev.slug);
        batch.set(evRef, {
          ...ev,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      batch.set(initDocRef, { initializedAt: new Date().toISOString() });
      await batch.commit();
      this.eventsInitialized = true;
    } catch (err) {
      console.warn('Event initialization check note:', err);
    }
  }

  public async getEvents(): Promise<CompetitionEvent[]> {
    await this.ensureEventsInitialized();
    try {
      const snap = await getDocs(collection(db, 'events'));
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as CompetitionEvent);
      }
    } catch (err) {
      console.warn('Firestore events collection read warning:', err);
    }
    return [];
  }

  public async getEventBySlug(slug: string): Promise<CompetitionEvent | undefined> {
    try {
      const snap = await getDoc(doc(db, 'events', slug.toLowerCase().trim()));
      if (snap.exists()) {
        return snap.data() as CompetitionEvent;
      }
    } catch (err) {
      console.warn(`Could not read event ${slug} directly:`, err);
    }
    const all = await this.getEvents();
    return all.find((e) => e.slug.toLowerCase().trim() === slug.toLowerCase().trim());
  }

  // CREATE COMPETITION
  public async createCompetition(data: Partial<CompetitionEvent>): Promise<CompetitionEvent> {
    const title = data.title?.trim();
    if (!title) throw new Error('Competition title is required.');

    const slug = (data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).toLowerCase().trim();
    if (!slug) throw new Error('A valid unique URL slug is required.');

    // Duplicate check
    const existingSnap = await getDoc(doc(db, 'events', slug));
    if (existingSnap.exists()) {
      throw new Error(`A competition with the URL slug "${slug}" already exists. Please choose a different slug.`);
    }

    const eventRecord: CompetitionEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      slug,
      title,
      tagline: data.tagline?.trim() || 'INNOVATE WITHOUT LIMITS',
      description: data.description?.trim() || data.short_description?.trim() || 'A flagship technical challenge at NEXORA.',
      short_description: data.short_description?.trim() || data.description?.trim() || '',
      full_description: data.full_description?.trim() || data.description?.trim() || '',
      category: data.category?.trim() || 'General Engineering',
      difficulty: data.difficulty || 'All Skill Levels',
      status: data.status || 'Published',
      registration_open: data.registration_open ?? true,
      is_published: data.is_published ?? true,
      event_date: data.event_date?.trim() || 'Schedule to be announced',
      event_time: data.event_time?.trim() || '',
      duration: data.duration?.trim() || 'To be announced',
      venue: data.venue?.trim() || 'BVM Engineering College, Vallabh Vidyanagar',
      format: data.format || 'Individual or Team',
      team_size: data.team_size?.trim() || '1–4 Participants',
      min_team_size: data.min_team_size || 1,
      max_team_size: data.max_team_size || 4,
      eligibility: data.eligibility?.trim() || 'Open to all recognized engineering and polytechnic students.',
      capacity: Number(data.capacity) || 60,
      registered_count: 0,
      fee_per_participant: Number(data.fee_per_participant) >= 0 ? Number(data.fee_per_participant) : 50,
      banner_image: data.banner_image || data.cover_image || '/images/competitions/zerocode.jpg',
      cover_image: data.cover_image || data.banner_image || '/images/competitions/zerocode.jpg',
      additional_images: data.additional_images || [],
      prizes: data.prizes || { first_place: '₹2,000 Cash Prize', special_rewards: 'Top Performers Surprise Gift' },
      rules: Array.isArray(data.rules) && data.rules.length > 0 ? data.rules : ['Standard academic integrity and competition conduct apply.'],
      judging_criteria: Array.isArray(data.judging_criteria) ? data.judging_criteria : [],
      tracks_or_format: data.tracks_or_format || [],
      faq: Array.isArray(data.faq) ? data.faq : [],
      contact_details: data.contact_details || { email: 'nexora.bvm@gmail.com' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'events', slug), eventRecord);
      await this.recordAdminAuditLog({
        event_type: 'COMPETITION_CREATED',
        details: `Created competition "${eventRecord.title}" (slug: ${slug})`
      });
      this.notify();
      return eventRecord;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `events/${slug}`);
    }
  }

  // UPDATE COMPETITION
  public async updateCompetition(slug: string, updates: Partial<CompetitionEvent>): Promise<void> {
    const cleanSlug = slug.toLowerCase().trim();
    const eventRef = doc(db, 'events', cleanSlug);

    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc(eventRef, payload, { merge: true });
      await this.recordAdminAuditLog({
        event_type: 'COMPETITION_UPDATED',
        details: `Updated competition parameters for "${cleanSlug}"`
      });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${cleanSlug}`);
    }
  }

  // SAFE DELETE COMPETITION (Checks existing student registrations)
  public async deleteCompetition(slug: string): Promise<void> {
    const cleanSlug = slug.toLowerCase().trim();
    
    // Check registrations
    const regQuery = query(collection(db, 'registrations'), where('event_slug', '==', cleanSlug));
    const regSnap = await getDocs(regQuery);
    
    if (!regSnap.empty) {
      throw new Error(`Cannot delete competition "${cleanSlug}" because ${regSnap.size} student registration(s) exist. To protect participant records, archive the competition instead.`);
    }

    try {
      await deleteDoc(doc(db, 'events', cleanSlug));
      await this.recordAdminAuditLog({
        event_type: 'COMPETITION_DELETED',
        details: `Deleted competition "${cleanSlug}"`
      });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `events/${cleanSlug}`);
    }
  }

  // ARCHIVE COMPETITION (Protects registrations, hides from public listing)
  public async archiveCompetition(slug: string): Promise<void> {
    await this.updateCompetition(slug, {
      status: 'Archived',
      registration_open: false,
      is_published: false
    });
    await this.recordAdminAuditLog({
      event_type: 'COMPETITION_ARCHIVED',
      details: `Archived competition "${slug}". Student registration records preserved.`
    });
  }

  // PUBLISH / UNPUBLISH COMPETITION
  public async publishCompetition(slug: string, isPublished: boolean): Promise<void> {
    await this.updateCompetition(slug, {
      status: isPublished ? 'Published' : 'Draft',
      is_published: isPublished,
      registration_open: isPublished
    });
    await this.recordAdminAuditLog({
      event_type: isPublished ? 'COMPETITION_PUBLISHED' : 'COMPETITION_UNPUBLISHED',
      details: `${isPublished ? 'Published' : 'Unpublished'} competition "${slug}"`
    });
  }

  // ==========================================
  // PRIORITY 4: PERMANENT IMAGE UPLOADS (FIREBASE STORAGE)
  // ==========================================
  public async uploadLocalImage(
    file: File, 
    folder = 'competitions', 
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; path: string; name: string }> {
    // 1. Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported image format. Please select a JPG, PNG, or WebP file.');
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      throw new Error('Image size exceeds 5MB limit. Please choose a compressed file.');
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `media/${folder}/${Date.now()}_${safeName}`;

    // 2. Attempt Firebase Storage
    try {
      if (onProgress) onProgress(20);
      const storageRef = ref(storage, storagePath);
      if (onProgress) onProgress(40);
      const uploadResult = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedBy: auth.currentUser?.email || 'admin'
        }
      });
      if (onProgress) onProgress(80);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      if (onProgress) onProgress(100);

      // Record media metadata in Firestore for auditing
      try {
        await setDoc(doc(db, 'mediaUploads', `med_${Date.now()}`), {
          path: storagePath,
          downloadUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: auth.currentUser?.email || 'admin'
        });
      } catch {}

      return {
        url: downloadUrl,
        path: storagePath,
        name: file.name
      };
    } catch (storageErr: any) {
      console.warn('Direct Firebase Storage upload encountered error, attempting server fallback:', storageErr);
      
      // Server-side base64 fallback route
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string;
            const res = await fetch('/api/media/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataUrl: base64Data,
                fileName: safeName,
                mimeType: file.type,
                folder
              })
            });
            const result = await safeParseJsonResponse<{ url: string; path: string; name: string }>(
              res,
              'Failed to upload image via server relay.'
            );
            resolve(result);
          } catch (serverErr) {
            reject(new Error(extractErrorMessage(serverErr, 'Failed to upload image.')));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file from local disk.'));
        reader.readAsDataURL(file);
      });
    }
  }

  // ==========================================
  // PRIORITY 5: ADMIN NOTIFICATIONS SYSTEM
  // ==========================================
  public subscribeNotifications(
    audience: string | undefined, 
    callback: (notifs: InAppNotification[]) => void
  ): () => void {
    const q = query(collection(db, 'notifications'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const all: InAppNotification[] = [];
      snapshot.forEach((d) => {
        all.push(d.data() as InAppNotification);
      });
      // Filter by audience if specified
      if (audience && audience !== 'all') {
        callback(all.filter((n) => n.audience === 'all' || n.audience === audience));
      } else {
        callback(all);
      }
    }, (err) => {
      console.warn('Notifications real-time error:', err);
      this.getNotifications().then(callback).catch(() => callback([]));
    });
  }

  public async getNotifications(): Promise<InAppNotification[]> {
    try {
      const q = query(collection(db, 'notifications'), orderBy('created_at', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list: InAppNotification[] = [];
      snap.forEach((d) => list.push(d.data() as InAppNotification));
      return list;
    } catch {
      return [];
    }
  }

  public async createNotification(data: Partial<InAppNotification>): Promise<InAppNotification> {
    const title = data.title?.trim();
    const message = data.message?.trim();
    if (!title || !message) {
      throw new Error('Notification title and message body are both required.');
    }

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: InAppNotification = {
      id: notifId,
      title,
      message,
      category: data.category || 'Announcement',
      priority: data.priority || 'Normal',
      image_url: data.image_url?.trim() || '',
      link_url: data.link_url?.trim() || '',
      link_text: data.link_text?.trim() || 'Learn More',
      audience: data.audience || 'all',
      status: data.status || 'Published',
      publish_at: data.publish_at || new Date().toISOString(),
      expires_at: data.expires_at || '',
      created_at: new Date().toISOString(),
      created_by: auth.currentUser?.email || 'admin'
    };

    try {
      await setDoc(doc(db, 'notifications', notifId), record);
      await this.recordAdminAuditLog({
        event_type: 'NOTIFICATION_PUBLISHED',
        details: `Published announcement "${title}" to audience "${record.audience}"`
      });
      this.notify();
      return record;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
    }
  }

  public async updateNotification(id: string, updates: Partial<InAppNotification>): Promise<void> {
    try {
      await setDoc(doc(db, 'notifications', id), updates, { merge: true });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  }

  public async deleteNotification(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
    }
  }

  // Student Notification Read Receipts
  public async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    const receiptId = `${userId}_${notificationId}`;
    try {
      await setDoc(doc(db, 'userNotificationReads', receiptId), {
        userId,
        notificationId,
        readAt: new Date().toISOString()
      });
      this.notify();
    } catch (err) {
      console.warn('Read receipt write error:', err);
    }
  }

  public async getReadNotificationIds(userId: string): Promise<Set<string>> {
    try {
      const q = query(collection(db, 'userNotificationReads'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const readIds = new Set<string>();
      snap.forEach((d) => {
        const data = d.data();
        if (data.notificationId) readIds.add(data.notificationId);
      });
      return readIds;
    } catch {
      return new Set<string>();
    }
  }

  // ==========================================
  // PRIORITY 6: VISITOR MESSAGES & ADMIN INBOX
  // ==========================================
  public subscribeContactMessages(callback: (messages: ContactMessage[]) => void): () => void {
    const q = query(collection(db, 'contactMessages'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: ContactMessage[] = [];
      snapshot.forEach((d) => list.push(d.data() as ContactMessage));
      callback(list);
    }, (err) => {
      console.warn('Contact messages snapshot notice:', err);
      this.getContactMessages().then(callback).catch(() => callback([]));
    });
  }

  public async getContactMessages(): Promise<ContactMessage[]> {
    try {
      const q = query(collection(db, 'contactMessages'), orderBy('created_at', 'desc'), limit(100));
      const snap = await getDocs(q);
      const list: ContactMessage[] = [];
      snap.forEach((d) => list.push(d.data() as ContactMessage));
      return list;
    } catch {
      return [];
    }
  }

  public async submitContactMessage(data: {
    sender_name: string;
    sender_email: string;
    subject?: string;
    message: string;
    competition_reference?: string;
  }): Promise<ContactMessage> {
    const name = data.sender_name?.trim();
    const email = data.sender_email?.trim().toLowerCase();
    const message = data.message?.trim();

    if (!name || name.length < 2) throw new Error('Please enter your name.');
    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (!message || message.length < 10) throw new Error('Message must be at least 10 characters long.');

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ContactMessage = {
      id: msgId,
      sender_name: name,
      sender_email: email,
      subject: data.subject?.trim() || 'General Inquiry',
      message,
      competition_reference: data.competition_reference?.trim() || '',
      user_id: auth.currentUser?.uid || undefined,
      status: 'unread',
      replies: [],
      created_at: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'contactMessages', msgId), newMsg);
      this.notify();
      return newMsg;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `contactMessages/${msgId}`);
    }
  }

  public async updateContactMessageStatus(
    messageId: string, 
    status: 'unread' | 'read' | 'resolved' | 'archived'
  ): Promise<void> {
    try {
      await setDoc(doc(db, 'contactMessages', messageId), {
        status,
        updated_at: new Date().toISOString()
      }, { merge: true });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `contactMessages/${messageId}`);
    }
  }

  public async replyToContactMessage(
    messageId: string, 
    replyText: string,
    channel: 'in-app' | 'email' = 'in-app'
  ): Promise<void> {
    const text = replyText.trim();
    if (!text) throw new Error('Reply text cannot be empty.');

    const msgRef = doc(db, 'contactMessages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) throw new Error('Original message not found.');

    const currentMsg = snap.data() as ContactMessage;
    const reply: MessageReply = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender_name: 'NEXORA Organizing Desk',
      sender_email: ADMIN_EMAILS[0],
      message: text,
      created_at: new Date().toISOString(),
      is_admin_reply: true,
      channel
    };

    const existingReplies = currentMsg.replies || [];
    const updatedReplies = [...existingReplies, reply];

    // If channel is email, attempt to dispatch real email via Brevo
    if (channel === 'email' && currentMsg.sender_email) {
      try {
        await fetch('/api/admin/reply-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: currentMsg.sender_email,
            recipientName: currentMsg.sender_name,
            originalSubject: currentMsg.subject,
            replyMessage: text
          })
        });
      } catch (emailErr) {
        console.warn('Email dispatch warning for reply:', emailErr);
      }
    }

    try {
      await setDoc(msgRef, {
        replies: updatedReplies,
        status: 'resolved',
        updated_at: new Date().toISOString()
      }, { merge: true });

      await this.recordAdminAuditLog({
        event_type: 'MESSAGE_REPLIED',
        details: `Replied to message ${messageId} from ${currentMsg.sender_email}`
      });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `contactMessages/${messageId}`);
    }
  }

  // ==========================================
  // PRIORITY 8: WEBSITE CONTENT MANAGEMENT
  // ==========================================
  public subscribeSiteContent(callback: (content: SiteContent) => void): () => void {
    const contentRef = doc(db, 'siteContent', 'public');
    return onSnapshot(contentRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as SiteContent);
      } else {
        this.getSiteContent().then(callback);
      }
    }, () => {
      this.getSiteContent().then(callback);
    });
  }

  public async getSiteContent(): Promise<SiteContent> {
    const defaultContent: SiteContent = {
      tagline: 'THE BEGINNING OF BVM’S NEXT TECH ERA.',
      description: 'Where code meets creativity, curiosity becomes innovation, and students become builders of what’s next.',
      aboutHeading: 'NOT JUST A CLUB. THE BEGINNING OF BVM’S NEXT TECH ERA.',
      aboutMission: 'Unite students across branches and colleges to transform theoretical engineering knowledge into working products.',
      aboutVision: 'Establish an open, interdisciplinary, student-led innovation ecosystem across Gujarat.',
      announcement: 'Proposed platform schedule pending formal faculty council ratification.',
      contactEmail: 'nexora.bvm@gmail.com',
      contactPhone: '+91 8200243606'
    };

    try {
      const snap = await getDoc(doc(db, 'siteContent', 'public'));
      if (snap.exists()) {
        return { ...defaultContent, ...snap.data() } as SiteContent;
      }
      // Seed default once
      setDoc(doc(db, 'siteContent', 'public'), defaultContent).catch(() => {});
    } catch (err) {
      console.warn('Could not read site content from Firestore:', err);
    }
    return defaultContent;
  }

  public async updateSiteContent(content: Partial<SiteContent>): Promise<void> {
    try {
      const contentRef = doc(db, 'siteContent', 'public');
      await setDoc(contentRef, {
        ...content,
        updated_at: new Date().toISOString(),
        updated_by: auth.currentUser?.email || 'admin'
      }, { merge: true });

      await this.recordAdminAuditLog({
        event_type: 'SITE_CONTENT_PUBLISHED',
        details: 'Published updated homepage and platform content to public website'
      });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'siteContent/public');
    }
  }

  // ==========================================
  // PRIORITY 9: REAL REGISTRATIONS & STUDENT DATA
  // ==========================================
  public subscribeRegistrations(callback: (regs: RegistrationRecord[]) => void): () => void {
    const q = query(collection(db, 'registrations'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: RegistrationRecord[] = [];
      snapshot.forEach((d) => list.push(d.data() as RegistrationRecord));
      callback(list);
    }, (err) => {
      console.warn('Registrations real-time listener notice:', err);
      this.getAllRegistrations().then(callback).catch(() => callback([]));
    });
  }

  public async getUserRegistrations(userId: string): Promise<RegistrationRecord[]> {
    try {
      const q = query(collection(db, 'registrations'), where('user_id', '==', userId));
      const snap = await getDocs(q);
      const results: RegistrationRecord[] = [];
      snap.forEach((docSnap) => results.push(docSnap.data() as RegistrationRecord));
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
      snap.forEach((docSnap) => results.push(docSnap.data() as RegistrationRecord));
      return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.warn('getAllRegistrations error:', err);
      return [];
    }
  }

  public async updatePaymentStatus(regId: string, paymentStatus: PaymentStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'registrations', regId), {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      });
      await this.recordAdminAuditLog({
        event_type: 'PAYMENT_STATUS_UPDATED',
        details: `Updated payment status of registration ${regId} to ${paymentStatus}`
      });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${regId}`);
    }
  }

  public async updateRegistrationStatus(regId: string, registrationStatus: RegistrationStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'registrations', regId), {
        registration_status: registrationStatus,
        updated_at: new Date().toISOString()
      });
      await this.recordAdminAuditLog({
        event_type: 'REGISTRATION_STATUS_UPDATED',
        details: `Updated registration status of registration ${regId} to ${registrationStatus}`
      });
      this.notify();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${regId}`);
    }
  }

  public async isUserRegisteredForEvent(userId: string, eventSlug: string): Promise<boolean> {
    const regs = await this.getUserRegistrations(userId);
    return regs.some((r) => r.event_slug === eventSlug && r.registration_status !== 'Cancelled');
  }

  public async getAllStudents(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const results: UserProfile[] = [];
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        results.push(u);
      });
      return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.warn('getAllStudents error:', err);
      return [];
    }
  }

  // CREATE REGISTRATION with transactional capacity checks
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

    const cleanSlug = data.event_slug.toLowerCase().trim();
    const event = await this.getEventBySlug(cleanSlug);
    if (!event) throw new Error('Competition not found.');

    if (event.status === 'Draft' || event.status === 'Archived' || !event.registration_open) {
      throw new Error('Registration for this competition is currently closed.');
    }

    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline).getTime();
      if (!isNaN(deadline) && Date.now() > deadline) {
        throw new Error('Registration deadline for this competition has passed.');
      }
    }

    // Duplicate check
    const alreadyRegistered = await this.isUserRegisteredForEvent(user.uid, cleanSlug);
    if (alreadyRegistered) {
      throw new Error('You are already registered for this competition.');
    }

    const participantCount = data.team_member_details && data.team_member_details.length > 0 
      ? 1 + data.team_member_details.filter((m) => m.name.trim()).length
      : 1;

    // Use event.fee_per_participant dynamically
    const unitFee = typeof event.fee_per_participant === 'number' ? event.fee_per_participant : 50;
    const totalFee = participantCount * unitFee;

    const competitionId = generateCompetitionId(cleanSlug);
    const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newRecord: RegistrationRecord = {
      id: regId,
      competition_id: competitionId,
      reference_id: competitionId,
      user_id: user.uid,
      event_slug: cleanSlug,
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

    // Run in a Firestore transaction to ensure capacity is strictly enforced
    const eventRef = doc(db, 'events', cleanSlug);
    const regRef = doc(db, 'registrations', regId);

    try {
      await runTransaction(db, async (transaction) => {
        const evSnap = await transaction.get(eventRef);
        if (evSnap.exists()) {
          const currentCount = evSnap.data().registered_count || 0;
          const capacity = evSnap.data().capacity || 100;
          if (currentCount >= capacity) {
            throw new Error(`Competition capacity of ${capacity} seats has been reached.`);
          }
          transaction.update(eventRef, { registered_count: currentCount + 1 });
        }
        transaction.set(regRef, newRecord);
      });
    } catch (err: any) {
      if (err.message && err.message.includes('capacity')) throw err;
      // Fallback direct set
      try {
        await setDoc(regRef, newRecord);
        await updateDoc(eventRef, { registered_count: (event.registered_count || 0) + 1 }).catch(() => {});
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.CREATE, `registrations/${regId}`);
      }
    }

    this.notify();
    return newRecord;
  }

  // --- ADMIN SECURITY & AUTHENTICATION ENDPOINTS ---
  public async getAdminStatus(): Promise<{
    initialized: boolean;
    founderEmail: string;
    maskedEmail: string;
    founderPhone: string;
    maskedPhone: string;
  }> {
    try {
      const res = await fetch('/api/admin/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      initialized: true,
      founderEmail: ADMIN_EMAILS[0],
      maskedEmail: maskEmail(ADMIN_EMAILS[0]),
      founderPhone: ADMIN_PHONE,
      maskedPhone: maskPhone(ADMIN_PHONE)
    };
  }

  public async requestAdminSetupOtp(): Promise<{
    maskedEmail: string;
    expiresInSeconds?: number;
  }> {
    const res = await fetch('/api/admin/request-setup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await safeParseJsonResponse(res, 'Failed to request setup verification code.');
  }

  public async setupAdminPassword(
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    const res = await fetch('/api/admin/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, newPassword, confirmPassword })
    });
    await safeParseJsonResponse(res, 'Failed to save Admin Security Password.');
  }

  public async verifyAdminPassword(password: string): Promise<{
    passwordToken: string;
    maskedEmail: string;
    expiresInSeconds?: number;
  }> {
    const res = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return await safeParseJsonResponse(res, 'Incorrect Admin Security Password.');
  }

  public async resendAdminOtp(passwordToken: string): Promise<void> {
    const res = await fetch('/api/admin/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordToken })
    });
    await safeParseJsonResponse(res, 'Failed to resend verification code.');
  }

  public async verifyAdminOtp(
    passwordToken: string,
    otp: string
  ): Promise<{
    sessionToken: string;
    durationMinutes: number;
    expiresAt: number;
  }> {
    const res = await fetch('/api/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordToken, otp })
    });
    const data = await safeParseJsonResponse<{
      sessionToken: string;
      durationMinutes: number;
      expiresAt: number;
    }>(res, 'Incorrect verification code.');

    sessionStorage.setItem('nexora_elevated_admin_token', data.sessionToken);
    sessionStorage.setItem('nexora_elevated_admin_expires', data.expiresAt.toString());

    try {
      await this.recordAdminAuditLog({
        event_type: 'ADMIN_SESSION_ELEVATED',
        details: 'Admin verification succeeded via Admin Security Password + Brevo OTP'
      });
    } catch {}

    return data;
  }

  public async checkElevatedAdminSession(): Promise<boolean> {
    const token = sessionStorage.getItem('nexora_elevated_admin_token');
    const expires = sessionStorage.getItem('nexora_elevated_admin_expires');

    if (!token || !expires) return false;
    if (Date.now() > Number(expires)) {
      this.clearElevatedAdminSession();
      return false;
    }

    if (!token.startsWith('adm_sess_')) {
      try {
        const response = await fetch('/api/admin/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token })
        });
        if (response.ok) {
          const data = await response.json();
          if (!data.valid) {
            this.clearElevatedAdminSession();
            return false;
          }
          return true;
        }
      } catch {}
    }

    return Date.now() < Number(expires);
  }

  public clearElevatedAdminSession() {
    const token = sessionStorage.getItem('nexora_elevated_admin_token');
    if (token && !token.startsWith('adm_sess_')) {
      fetch('/api/admin/logout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token })
      }).catch(() => {});
    }
    sessionStorage.removeItem('nexora_elevated_admin_token');
    sessionStorage.removeItem('nexora_elevated_admin_expires');
  }

  public async sendPresenceHeartbeat(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, email: user.email })
      }).catch(() => {});
      // Also update Firestore users doc last_active timestamp
      setDoc(doc(db, 'users', user.uid), { last_active: Date.now() }, { merge: true }).catch(() => {});
    } catch {}
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

  public async getAuditLogs(): Promise<any[]> {
    try {
      const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      return list;
    } catch {
      return [];
    }
  }
}

export const dataService = new NexoraDataService();
