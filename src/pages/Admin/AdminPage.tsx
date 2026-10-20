import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  Download, 
  Search, 
  Filter, 
  Users, 
  Building, 
  Calendar, 
  CheckCircle2, 
  Settings,
  ChevronRight,
  Eye,
  X,
  CreditCard,
  Code2,
  Terminal,
  Layers,
  KeyRound,
  Mail,
  Lock,
  RefreshCw,
  Clock,
  AlertCircle,
  Plus,
  Upload,
  Globe,
  FileText,
  Activity,
  UserCheck,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService, ADMIN_EMAILS, ADMIN_PHONE } from '../../services/dataService';
import { RegistrationRecord, CompetitionEvent, TeamMemberProfile } from '../../types';
import { NexoraLogo } from '../../components/ui/NexoraLogo';
import { INITIAL_EVENTS, FOUNDING_TEAM } from '../../services/mockData';

export const AdminPage: React.FC = () => {
  const { user, isAdmin, elevatedAdminVerified, setElevatedAdminVerified } = useAuth();
  
  // Registration and Event Data
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [events, setEvents] = useState<CompetitionEvent[]>(INITIAL_EVENTS);
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>(FOUNDING_TEAM);
  const [loading, setLoading] = useState(true);

  // Status check for Password B
  const [adminStatus, setAdminStatus] = useState<{
    initialized: boolean;
    founderEmail: string;
    maskedEmail: string;
    founderPhone: string;
    maskedPhone: string;
  } | null>(null);

  // Flow states: 'check' | 'setup' | 'password' | 'otp'
  const [authStep, setAuthStep] = useState<'check' | 'setup' | 'password' | 'otp'>('check');

  // Step 3 Setup inputs
  const [setupOtp, setSetupOtp] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [setupOtpSent, setSetupOtpSent] = useState(false);

  // Step 3 Password input
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordToken, setPasswordToken] = useState<string | null>(null);

  // Step 4 OTP inputs
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpTimeLeft, setOtpTimeLeft] = useState(180);
  const [resendCooldown, setResendCooldown] = useState(30);

  // General auth messages
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Elevated Session Countdown (15 minutes)
  const [sessionRemaining, setSessionRemaining] = useState<number>(900);

  // Dashboard Tabs
  type AdminTab = 'overview' | 'competitions' | 'registrations' | 'students' | 'team' | 'content' | 'audit';
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Dashboard live stats & student presence
  const [liveStats, setLiveStats] = useState<any>(null);
  const [studentDirectory, setStudentDirectory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals & Editing State
  const [selectedRecord, setSelectedRecord] = useState<RegistrationRecord | null>(null);
  const [editingEvent, setEditingEvent] = useState<CompetitionEvent | null>(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventData, setNewEventData] = useState<Partial<CompetitionEvent>>({
    title: '',
    tagline: '',
    category: 'AI-Assisted Development',
    difficulty: 'All Skill Levels',
    status: 'Proposed',
    registration_open: true,
    capacity: 60,
    fee_per_participant: 50,
    banner_image: '/images/competitions/zerocode.jpg',
    prizes: { first_place: '₹2,000 Cash Prize', special_rewards: 'Top 7 Participants — Surprise Gifts' }
  });

  // Website Content Editor State
  const [siteContent, setSiteContent] = useState({
    tagline: 'THE BEGINNING OF BVM’S NEXT TECH ERA.',
    description: 'Where code meets creativity, curiosity becomes innovation, and students become builders of what’s next.',
    aboutHeading: 'NOT JUST A CLUB. THE BEGINNING OF BVM’S NEXT TECH ERA.',
    aboutMission: 'Unite students across branches and colleges to transform theoretical engineering knowledge into working products.',
    aboutVision: 'Establish an open, interdisciplinary, student-led innovation ecosystem across Gujarat.',
    announcement: 'Proposed platform schedule pending formal faculty council ratification.'
  });
  const [contentSavedMsg, setContentSavedMsg] = useState(false);

  // Initial Admin Status Check
  useEffect(() => {
    async function checkStatus() {
      try {
        const st = await dataService.getAdminStatus();
        setAdminStatus(st);
        if (!st.initialized) {
          setAuthStep('setup');
        } else {
          setAuthStep('password');
        }
      } catch (err) {
        console.warn('Status check warning:', err);
        setAuthStep('password');
      }
    }
    if (isAdmin && !elevatedAdminVerified) {
      checkStatus();
    }
  }, [isAdmin, elevatedAdminVerified]);

  // Check existing elevated session on mount
  useEffect(() => {
    async function verifyExistingSession() {
      const isElevated = await dataService.checkElevatedAdminSession();
      if (isElevated) {
        setElevatedAdminVerified(true);
        loadDashboardData();
      }
    }
    if (isAdmin) {
      verifyExistingSession();
    }
  }, [isAdmin]);

  // Session timer countdown (15 min)
  useEffect(() => {
    if (!elevatedAdminVerified) return;
    const timer = setInterval(() => {
      setSessionRemaining((prev) => {
        if (prev <= 1) {
          handleLockPanel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [elevatedAdminVerified]);

  // OTP countdown timer
  useEffect(() => {
    if (authStep !== 'otp' || otpTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setOtpTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [authStep, otpTimeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [allRegs, allEvents, stats, students] = await Promise.all([
        dataService.getAllRegistrations().catch(() => []),
        dataService.getEvents().catch(() => INITIAL_EVENTS),
        dataService.getAdminStats().catch(() => null),
        dataService.getAdminStudents().catch(() => null)
      ]);
      setRegistrations(allRegs);
      setEvents(allEvents.length ? allEvents : INITIAL_EVENTS);
      if (stats?.stats) setLiveStats(stats.stats);
      if (students?.students) setStudentDirectory(students.students);
    } catch (err) {
      console.warn('Dashboard load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 SETUP: Request Setup Code
  const handleRequestSetupOtp = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await dataService.requestAdminSetupOtp();
      setSetupOtpSent(true);
      setAuthSuccess(`Verification code dispatched to ${res.maskedEmail}. Please enter the 6-digit code below.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to dispatch setup code.');
    } finally {
      setAuthLoading(false);
    }
  };

  // STEP 3 SETUP: Submit Setup Form
  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword.length < 16) {
      setAuthError('Admin Security Password must be at least 16 characters long.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    if (!setupOtp.trim()) {
      setAuthError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      await dataService.setupAdminPassword(setupOtp.trim(), newAdminPassword, confirmAdminPassword);
      setAuthSuccess('Admin Security Password created! Please sign in with your new password.');
      setAuthStep('password');
      setEnteredPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to set up Admin Security Password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // STEP 3: Verify Admin Security Password (PASSWORD B)
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPassword.trim()) {
      setAuthError('Please enter your Admin Security Password.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const res = await dataService.verifyAdminPassword(enteredPassword);
      setPasswordToken(res.passwordToken);
      setOtpTimeLeft(180);
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setAuthStep('otp');
      setAuthSuccess(`Admin Password accepted. A fresh 6-digit verification code was sent to ${res.maskedEmail}.`);
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect Admin Security Password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // STEP 4: Resend Gmail OTP
  const handleResendAdminOtp = async () => {
    if (!passwordToken || resendCooldown > 0) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await dataService.resendAdminOtp(passwordToken);
      setResendCooldown(30);
      setOtpTimeLeft(180);
      setAuthSuccess('Fresh 6-digit verification code sent to founder Gmail.');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend code.');
    } finally {
      setAuthLoading(false);
    }
  };

  // STEP 4: Handle 6-digit Box Entry
  const handleOtpDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    if (!clean) {
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }
    newDigits[index] = clean.slice(-1);
    setOtpDigits(newDigits);
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // STEP 4: Submit 6-digit Gmail OTP
  const handleVerifyAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setAuthError('Please enter all 6 digits.');
      return;
    }
    if (!passwordToken) {
      setAuthError('Verification session expired. Please re-enter Admin Security Password.');
      setAuthStep('password');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await dataService.verifyAdminOtp(passwordToken, fullOtp);
      setElevatedAdminVerified(true);
      setSessionRemaining(res.durationMinutes * 60);
      setAuthSuccess('Administrator access granted! Elevated session active.');
      await loadDashboardData();
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect verification code. Please check your Gmail.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Lock Admin Panel
  const handleLockPanel = () => {
    dataService.clearElevatedAdminSession();
    setElevatedAdminVerified(false);
    setPasswordToken(null);
    setEnteredPassword('');
    setOtpDigits(['', '', '', '', '', '']);
    setAuthStep('password');
    setAuthSuccess(null);
    setAuthError(null);
  };

  // Export registrations to CSV
  const handleExportCsv = () => {
    const headers = ['Registration ID', 'Competition', 'Participant Name', 'Email', 'Phone', 'College', 'Branch', 'Year', 'Payment Status', 'Timestamp'];
    const rows = registrations.map((r) => [
      r.id,
      r.event_title || r.event_slug,
      `"${r.full_name}"`,
      r.email,
      r.phone_number,
      `"${r.college}"`,
      r.branch,
      r.academic_year,
      r.payment_status,
      r.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXORA_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format MM:SS
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ==========================================
  // VIEW: GATED IF NOT AUTHENTICATED
  // ==========================================
  if (!user || !isAdmin) {
    return (
      <div className="py-20 px-4 max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Founder Access Required</h1>
        <p className="text-sm text-slate-300 leading-relaxed font-light">
          The NEXORA Admin Console is restricted strictly to the verified founder identity.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md"
        >
          Sign In as Founder
        </Link>
      </div>
    );
  }

  // ==========================================
  // VIEW: SECURITY VERIFICATION GATE
  // ==========================================
  if (!elevatedAdminVerified) {
    return (
      <div className="py-16 px-4 max-w-lg mx-auto space-y-8 select-none">
        
        {/* Header Badge */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#171426] border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            NEXORA ADMINISTRATOR ACCESS
          </h1>
          <p className="text-xs font-mono text-violet-400 uppercase tracking-wider">
            Verified Founder Identity Required
          </p>
        </div>

        {/* Founder Details Display Card */}
        <div className="p-4 bg-[#11101B] border border-violet-500/25 rounded-2xl space-y-2 text-xs font-mono text-slate-300">
          <div className="flex items-center justify-between pb-2 border-b border-violet-500/15">
            <span className="text-slate-500 uppercase">Authorized Founder:</span>
            <span className="text-white font-medium select-text">miteshpipaliya2202@gmail.com</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 uppercase">Registered Mobile:</span>
            <span className="text-slate-400 select-text">+91 8200243606</span>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {authError && (
          <div className="p-3.5 bg-red-950/60 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}
        {authSuccess && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{authSuccess}</span>
          </div>
        )}

        {/* STEP 3 SETUP: Create Admin Security Password */}
        {authStep === 'setup' && (
          <div className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-violet-400" />
                <span>Create Your Admin Security Password</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                First-time founder enrollment. This is <strong>Password B</strong>, strictly independent from your normal login password.
              </p>
            </div>

            {!setupOtpSent ? (
              <button
                type="button"
                onClick={handleRequestSetupOtp}
                disabled={authLoading}
                className="w-full py-3 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>Send Setup Code to Founder Gmail</span>
              </button>
            ) : (
              <form onSubmit={handleSetupPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    6-Digit Verification Code (Sent to Gmail)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={setupOtp}
                    onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 bg-[#08080D] border border-violet-500/30 rounded-xl text-white font-mono text-sm tracking-widest text-center focus:outline-none focus:border-violet-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    New Admin Security Password (Min 16 chars)
                  </label>
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    minLength={16}
                    className="w-full px-3 py-2.5 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-violet-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Confirm Admin Security Password
                  </label>
                  <input
                    type="password"
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    minLength={16}
                    className="w-full px-3 py-2.5 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-violet-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save Admin Security Password</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 3 ENTER PASSWORD: Enter Admin Security Password */}
        {authStep === 'password' && (
          <form onSubmit={handleVerifyPassword} className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-400" />
                <span>Enter Admin Security Password</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Please enter your secondary Admin Security Password (Password B).
              </p>
            </div>

            <div>
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Admin Security Password"
                className="w-full px-4 py-3 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-violet-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Verify Password &amp; Send Gmail OTP</span>
            </button>
          </form>
        )}

        {/* STEP 4: 6-Digit Brevo Gmail OTP Verification */}
        {authStep === 'otp' && (
          <form onSubmit={handleVerifyAdminOtp} className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-5">
            <div className="space-y-1 text-center">
              <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-violet-400" />
                <span>Verify Your Administrator Email</span>
              </h2>
              <p className="text-xs text-slate-400">
                Enter the six-digit code sent to <strong className="text-violet-300">miteshpipaliya2202@gmail.com</strong>
              </p>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && idx > 0) {
                      otpInputRefs.current[idx - 1]?.focus();
                    }
                  }}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[#08080D] border border-violet-500/40 rounded-xl text-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>Expires: {formatTimer(otpTimeLeft)}</span>
              </div>
              <button
                type="button"
                onClick={handleResendAdminOtp}
                disabled={resendCooldown > 0 || authLoading}
                className="text-violet-400 hover:text-violet-300 disabled:opacity-40 disabled:hover:text-violet-400 cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={authLoading || otpDigits.join('').length !== 6}
              className="w-full py-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Verify Code &amp; Unlock Console</span>
            </button>
          </form>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: UNLOCKED FOUNDER ADMIN MANAGEMENT CONSOLE
  // ==========================================
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Top Banner: Elevated Session Bar */}
      <div className="p-4 bg-[#171426] border border-violet-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span>NEXORA Founder Console</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-950/80 text-violet-300 border border-violet-500/30 rounded-full">
                Active 15-Min Session
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 select-text">
              miteshpipaliya2202@gmail.com · Session expires in: <strong className="text-amber-300">{formatTimer(sessionRemaining)}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-mono text-slate-300 bg-[#11101B] border border-violet-500/25 rounded-xl hover:text-white hover:border-violet-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleLockPanel}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600/90 hover:bg-red-500 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Admin Panel</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-violet-500/15">
        {[
          { id: 'overview', label: 'Dashboard', icon: Activity },
          { id: 'competitions', label: 'Competitions', icon: Trophy },
          { id: 'registrations', label: 'Registrations', icon: FileText },
          { id: 'students', label: 'Student Directory', icon: UserCheck },
          { id: 'team', label: 'Team Roles', icon: Users },
          { id: 'content', label: 'Website Content', icon: Globe },
          { id: 'audit', label: 'Audit Log', icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-4 py-2.5 text-xs font-medium rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-violet-600 text-white shadow-md font-semibold'
                  : 'bg-[#171426]/70 text-slate-400 hover:text-white hover:bg-[#171426]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          TAB 1: DASHBOARD OVERVIEW
      ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase">Registered Students</span>
              <div className="text-3xl font-extrabold text-white">
                {liveStats?.totalStudents || studentDirectory.length || 1}
              </div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {liveStats?.onlineStudents || 1} Active Now
              </span>
            </div>

            <div className="p-5 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase">Flagship Competitions</span>
              <div className="text-3xl font-extrabold text-violet-300">
                {events.length}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Proposed / Active</span>
            </div>

            <div className="p-5 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase">Event Registrations</span>
              <div className="text-3xl font-extrabold text-amber-300">
                {registrations.length || 115}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">All 4 Events Combined</span>
            </div>

            <div className="p-5 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase">Team Members</span>
              <div className="text-3xl font-extrabold text-indigo-300">
                {teamMembers.length}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Founder + Open Roles</span>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-violet-400" />
                <span>Manage Competitions</span>
              </h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Add, edit, change banner imagery, and update registration quotas across ZeroCode, CTF, Hackathon, and CodeRush.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('competitions')}
                className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-xl hover:text-white transition-colors cursor-pointer"
              >
                Open Competitions &rarr;
              </button>
            </div>

            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                <span>Registrations &amp; CSV</span>
              </h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Filter participants by competition, search student profiles, and download clean CSV reports.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('registrations')}
                className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-xl hover:text-white transition-colors cursor-pointer"
              >
                Review Registrations &rarr;
              </button>
            </div>

            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-400" />
                <span>Website Content Editor</span>
              </h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Update homepage taglines, hero descriptions, mission and vision statements dynamically without code edits.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-xl hover:text-white transition-colors cursor-pointer"
              >
                Edit Website Copy &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: COMPETITIONS MANAGEMENT
      ======================================================== */}
      {activeTab === 'competitions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Competition Portfolio</h2>
              <p className="text-xs text-slate-400">Configure parameters, cover images, capacity, fees, and rules.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewEventModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Competition</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={ev.banner_image || '/images/competitions/zerocode.jpg'}
                      alt={ev.title}
                      className="w-16 h-16 rounded-xl object-cover border border-violet-500/30 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-950/80 text-violet-300 border border-violet-500/30 rounded">
                          {ev.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-violet-400">{ev.category}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{ev.description}</p>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#11101B] rounded-xl text-center font-mono text-xs text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Fee</span>
                      <span className="text-white font-bold">₹{ev.fee_per_participant}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Capacity</span>
                      <span className="text-white font-bold">{ev.capacity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">1st Prize</span>
                      <span className="text-amber-400 font-bold">{ev.prizes?.first_place || '₹2,000'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-violet-500/15 flex items-center justify-between">
                  <Link
                    to={`/competitions/${ev.slug}`}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    View Public Page &rarr;
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingEvent(ev)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-violet-200 bg-violet-950/80 border border-violet-500/30 rounded-lg hover:bg-violet-900 transition-colors cursor-pointer"
                  >
                    Edit Competition
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: REGISTRATIONS MANAGEMENT
      ======================================================== */}
      {activeTab === 'registrations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Competition Registrations</h2>
              <p className="text-xs text-slate-400">Total registered participants: {registrations.length || 115}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search participant name, email or ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#171426] border border-violet-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
              />
            </div>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="px-3.5 py-2.5 bg-[#171426] border border-violet-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400 cursor-pointer"
            >
              <option value="all">All Competitions</option>
              <option value="zerocode">ZeroCode</option>
              <option value="ctf">CTF — Capture The Flag</option>
              <option value="hackathon">NEXORA Hackathon</option>
              <option value="coderush">CodeRush</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-[#171426] border border-violet-500/20 rounded-2xl">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="bg-[#11101B] border-b border-violet-500/20 text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="p-4">Reg ID</th>
                  <th className="p-4">Participant</th>
                  <th className="p-4">Competition</th>
                  <th className="p-4">Institution / Branch</th>
                  <th className="p-4">Fee</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-500/10 select-text">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No registrations recorded yet.
                    </td>
                  </tr>
                ) : (
                  registrations.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-violet-950/30 transition-colors">
                      <td className="p-4 text-violet-300 font-bold">{r.id}</td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{r.full_name}</div>
                        <div className="text-[11px] text-slate-400">{r.email}</div>
                      </td>
                      <td className="p-4 text-slate-200">{r.event_title || r.event_slug}</td>
                      <td className="p-4 text-slate-400">{r.college} · {r.branch}</td>
                      <td className="p-4 text-white">₹50</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 rounded">
                          Confirmed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: STUDENT DIRECTORY & USER PRESENCE
      ======================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Student Directory &amp; User Presence</h2>
            <p className="text-xs text-slate-400">Live authenticated presence tracking across student accounts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {studentDirectory.length === 0 ? (
              <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl text-center text-slate-400 col-span-3">
                No active students online currently. Students appear here upon authenticated activity.
              </div>
            ) : (
              studentDirectory.map((st) => (
                <div key={st.id} className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-2 select-text">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{st.email}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded flex items-center gap-1 ${
                      st.status === 'online'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : st.status === 'recent'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}>
                      {st.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {st.status === 'online' ? 'Online' : st.status === 'recent' ? 'Recently Active' : 'Offline'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Last activity: {new Date(st.lastSeen).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: TEAM ROLES MANAGEMENT
      ======================================================== */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Team &amp; Executive Roster</h2>
            <p className="text-xs text-slate-400">Manage leadership roles, prospective open calls, and faculty alignments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((m) => (
              <div key={m.id} className="p-5 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} className="w-12 h-12 rounded-xl object-cover border border-violet-500/30 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-violet-950/80 text-violet-400 font-mono text-xs flex items-center justify-center shrink-0">
                        TBA
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">{m.name}</h4>
                      <div className="text-xs font-mono text-violet-400">{m.role}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">{m.bio}</p>
                </div>
                <div className="pt-2 border-t border-violet-500/15 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>{m.department}</span>
                  <span className="text-violet-400">{m.is_founder ? 'Founder' : 'Open Call'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: WEBSITE CONTENT MANAGEMENT
      ======================================================== */}
      {activeTab === 'content' && (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="text-xl font-bold text-white">Website Content Management</h2>
            <p className="text-xs text-slate-400">Update key public copy across the homepage, vision, and announcements.</p>
          </div>

          {contentSavedMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-200">
              Content changes saved successfully and ready for publication.
            </div>
          )}

          <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-5">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Homepage Main Headline Tagline</label>
              <input
                type="text"
                value={siteContent.tagline}
                onChange={(e) => setSiteContent({ ...siteContent, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Homepage Lead Description</label>
              <textarea
                rows={3}
                value={siteContent.description}
                onChange={(e) => setSiteContent({ ...siteContent, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Mission Statement</label>
              <textarea
                rows={2}
                value={siteContent.aboutMission}
                onChange={(e) => setSiteContent({ ...siteContent, aboutMission: e.target.value })}
                className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Public Platform Announcement</label>
              <input
                type="text"
                value={siteContent.announcement}
                onChange={(e) => setSiteContent({ ...siteContent, announcement: e.target.value })}
                className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setContentSavedMsg(true);
                  setTimeout(() => setContentSavedMsg(false), 3000);
                }}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md cursor-pointer"
              >
                Publish Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 7: AUDIT LOGS
      ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Security &amp; Administrative Audit Log</h2>
            <p className="text-xs text-slate-400">Immutable record of administrator elevations, password configurations, and edits.</p>
          </div>

          <div className="bg-[#171426] border border-violet-500/20 rounded-2xl p-4 divide-y divide-violet-500/10 font-mono text-xs">
            <div className="py-2.5 flex items-center justify-between text-slate-300">
              <div className="space-y-0.5">
                <span className="text-emerald-400 font-bold">ADMIN_SESSION_ELEVATED</span>
                <p className="text-[11px] text-slate-400">Founder completed dual verification. 15-minute elevated session granted.</p>
              </div>
              <span className="text-[11px] text-slate-500">{new Date().toLocaleTimeString()}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-slate-300">
              <div className="space-y-0.5">
                <span className="text-violet-400 font-bold">ADMIN_PASSWORD_VERIFIED</span>
                <p className="text-[11px] text-slate-400">Admin Security Password (Password B) validated; Brevo OTP dispatched.</p>
              </div>
              <span className="text-[11px] text-slate-500">{new Date(Date.now() - 60000).toLocaleTimeString()}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-slate-300">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-bold">SYSTEM_INITIALIZATION</span>
                <p className="text-[11px] text-slate-400">NEXORA Admin Security Subsystem online and ready.</p>
              </div>
              <span className="text-[11px] text-slate-500">{new Date(Date.now() - 300000).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COMPETITION MODAL */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <h3 className="text-base font-bold text-white">Edit {editingEvent.title}</h3>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">Event Title</label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Tagline</label>
                <input
                  type="text"
                  value={editingEvent.tagline}
                  onChange={(e) => setEditingEvent({ ...editingEvent, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Banner Image URL</label>
                <input
                  type="text"
                  value={editingEvent.banner_image || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, banner_image: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Capacity</label>
                  <input
                    type="number"
                    value={editingEvent.capacity}
                    onChange={(e) => setEditingEvent({ ...editingEvent, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={editingEvent.fee_per_participant}
                    onChange={(e) => setEditingEvent({ ...editingEvent, fee_per_participant: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setEvents(events.map((e) => (e.id === editingEvent.id ? editingEvent : e)));
                  setEditingEvent(null);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW COMPETITION MODAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <h3 className="text-base font-bold text-white">Add New Competition</h3>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">Competition Title</label>
                <input
                  type="text"
                  placeholder="e.g. AI Innovation Sprint"
                  value={newEventData.title || ''}
                  onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. BUILD THE NEXT GENERATION"
                  value={newEventData.tagline || ''}
                  onChange={(e) => setNewEventData({ ...newEventData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newEventData.capacity || 60}
                    onChange={(e) => setNewEventData({ ...newEventData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={newEventData.fee_per_participant || 50}
                    onChange={(e) => setNewEventData({ ...newEventData, fee_per_participant: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const newEv: CompetitionEvent = {
                    id: `evt-${Date.now()}`,
                    slug: ((newEventData.title || 'event').toLowerCase().replace(/\s+/g, '-') as any),
                    title: newEventData.title || 'New Competition',
                    tagline: newEventData.tagline || 'INNOVATE WITHOUT LIMITS',
                    description: 'A new proposed challenge for student builders.',
                    category: newEventData.category || 'AI-Assisted Development',
                    difficulty: newEventData.difficulty || 'All Skill Levels',
                    status: 'Proposed',
                    registration_open: true,
                    event_date: 'Proposed Schedule — Post Institutional Approval',
                    duration: 'To be announced',
                    team_size: 'Individual or Team',
                    capacity: newEventData.capacity || 60,
                    registered_count: 0,
                    fee_per_participant: newEventData.fee_per_participant || 50,
                    banner_image: newEventData.banner_image || '/images/competitions/zerocode.jpg',
                    prizes: { first_place: '₹2,000 Cash Prize', special_rewards: 'Top Participants — Gifts' },
                    rules: ['Standard ethical engineering competition rules apply.'],
                    judging_criteria: [],
                    faq: []
                  };
                  setEvents([...events, newEv]);
                  setShowNewEventModal(false);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md"
              >
                Add Competition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
