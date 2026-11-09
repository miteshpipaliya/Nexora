import React, { useState, useEffect } from 'react';
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
  Smartphone,
  Mail,
  Lock,
  RefreshCw,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService, ADMIN_EMAILS, ADMIN_PHONE } from '../../services/dataService';
import { RegistrationRecord, CompetitionEvent } from '../../types';
import { NexoraLogo } from '../../components/ui/NexoraLogo';

export const AdminPage: React.FC = () => {
  const { user, isAdmin, elevatedAdminVerified, setElevatedAdminVerified } = useAuth();
  
  // Registration and Event Data
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Dual-OTP Admin Verification State
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>('m•••••••••••02@gmail.com');
  const [maskedPhone, setMaskedPhone] = useState<string>('+91 ••••• ••606');
  const [emailOtp, setEmailOtp] = useState<string>('');
  const [smsOtp, setSmsOtp] = useState<string>('');
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [devCodes, setDevCodes] = useState<{ emailOtp: string; smsOtp: string } | null>(null);

  // Active view: 'all' | 'zerocode' | 'ctf' | 'hackathon' | 'coderush' | 'audit'
  const [activeEventView, setActiveEventView] = useState<'all' | 'zerocode' | 'ctf' | 'hackathon' | 'coderush' | 'audit'>('all');
  const [hackathonViewMode, setHackathonViewMode] = useState<'participants' | 'teams'>('participants');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCollege, setFilterCollege] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<RegistrationRecord | null>(null);

  // Timer countdown for active challenge
  useEffect(() => {
    if (!challengeId || timeLeft <= 0 || elevatedAdminVerified) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [challengeId, timeLeft, elevatedAdminVerified]);

  const loadData = async () => {
    try {
      const [allRegs, allEvents] = await Promise.all([
        dataService.getAllRegistrations(),
        dataService.getEvents()
      ]);
      setRegistrations(allRegs);
      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading Firestore data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && elevatedAdminVerified) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAdmin, elevatedAdminVerified]);

  // Request Dual OTP Challenge
  const handleStartChallenge = async () => {
    if (!user) return;
    setOtpError(null);
    setOtpSuccess(null);
    setOtpSending(true);

    try {
      const data = await dataService.startAdminChallenge(user.email);
      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail);
      setMaskedPhone(data.maskedPhone);
      setTimeLeft(300);
      setOtpSuccess('Verification codes dispatched! Check email and SMS.');

      if (data.devCodes) {
        setDevCodes(data.devCodes);
      } else {
        // Inspect challenge codes in dev mode if server endpoint provides JSON
        try {
          const inspectRes = await fetch(`/api/admin/inspect-challenge/${data.challengeId}`);
          const contentType = inspectRes.headers.get('content-type') || '';
          if (inspectRes.ok && contentType.includes('application/json')) {
            const codes = await inspectRes.json();
            setDevCodes({ emailOtp: codes.emailOtp, smsOtp: codes.smsOtp });
          }
        } catch {
          // Gracefully ignore
        }
      }
    } catch (err: any) {
      setOtpError(err.message || 'Failed to dispatch verification codes.');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify Both OTPs
  const handleVerifyDualOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) {
      setOtpError('Please request verification codes first.');
      return;
    }
    if (!emailOtp.trim() || !smsOtp.trim()) {
      setOtpError('Both 6-digit Email OTP and 6-digit Mobile SMS OTP are required.');
      return;
    }

    setOtpError(null);
    setOtpVerifying(true);

    try {
      await dataService.verifyAdminDualOtp(challengeId, emailOtp.trim(), smsOtp.trim());
      setElevatedAdminVerified(true);
      await loadData();
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed. Please check the entered codes.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Lock Admin Session
  const handleLockSession = () => {
    dataService.clearElevatedAdminSession();
    setElevatedAdminVerified(false);
    setChallengeId(null);
    setEmailOtp('');
    setSmsOtp('');
    setDevCodes(null);
  };

  // Auto-fill dev test codes for quick evaluation
  const handleFillDevCodes = () => {
    if (devCodes) {
      setEmailOtp(devCodes.emailOtp);
      setSmsOtp(devCodes.smsOtp);
    }
  };

  // 1. Unauthorized Student Screen
  if (!user || !isAdmin) {
    return (
      <div className="py-24 px-4 max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The NEXORA Management Console is restricted to provisioned founder administrators. Your current account ({user?.email || 'unauthenticated'}) does not have verified administrative authorization.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/profile"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-all shadow-md"
          >
            Return to Student Profile
          </Link>
          <Link
            to="/login"
            className="px-5 py-2.5 text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
          >
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  // 2. Dual-OTP Administrator Verification Screen
  if (!elevatedAdminVerified) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
      <div className="min-h-[85vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-8">
          
          <div className="text-center space-y-3">
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <NexoraLogo size="lg" />
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-950/70 border border-violet-500/30 rounded-full text-violet-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Founder Administrator: {user.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Administrator Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              Additional dual-factor verification is required to access the NEXORA management console.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#11101B]/90 backdrop-blur-xl border border-violet-500/30 shadow-[0_0_50px_-10px_rgba(139,92,246,0.3)] space-y-6">
            
            {otpError && (
              <div className="p-3.5 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{otpSuccess}</span>
              </div>
            )}

            {!challengeId ? (
              <div className="space-y-5 text-center">
                <div className="p-4 rounded-xl bg-[#08080D]/70 border border-violet-500/20 text-left space-y-2 text-xs">
                  <div className="text-slate-400">Target Verification Channels:</div>
                  <div className="flex items-center gap-2 text-slate-200 font-mono">
                    <Mail className="w-4 h-4 text-violet-400" />
                    <span>Email: {maskedEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-mono">
                    <Smartphone className="w-4 h-4 text-violet-400" />
                    <span>Mobile SMS: {maskedPhone}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartChallenge}
                  disabled={otpSending}
                  className="w-full py-3.5 px-6 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-[0_0_25px_-5px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {otpSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Initiate Dual-OTP Challenge</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyDualOtp} className="space-y-6">
                
                {/* Timer bar */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-violet-500/15">
                  <span className="flex items-center gap-1.5 text-violet-300">
                    <Clock className="w-3.5 h-3.5 text-violet-400" />
                    Expires in: {formattedTime}
                  </span>
                  <button
                    type="button"
                    onClick={handleStartChallenge}
                    disabled={otpSending}
                    className="text-violet-400 hover:text-violet-300 text-[11px] underline cursor-pointer"
                  >
                    Resend Codes
                  </button>
                </div>

                {/* Step 1: Email OTP */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <Mail className="w-4 h-4 text-violet-400" />
                      <span>Step 1 — Email Verification</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{maskedEmail}</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit Email OTP"
                    className="w-full text-center tracking-[0.5em] font-mono text-lg py-3 bg-[#08080D] border border-violet-500/30 rounded-xl text-white placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-xs focus:outline-none focus:border-violet-400"
                  />
                </div>

                {/* Step 2: Mobile SMS OTP */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-violet-400" />
                      <span>Step 2 — Mobile Verification</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{maskedPhone}</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={smsOtp}
                    onChange={(e) => setSmsOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit Mobile SMS OTP"
                    className="w-full text-center tracking-[0.5em] font-mono text-lg py-3 bg-[#08080D] border border-violet-500/30 rounded-xl text-white placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-xs focus:outline-none focus:border-violet-400"
                  />
                </div>

                {/* Dev Helper Panel for Testing / Faculty Pitch Evaluation */}
                {devCodes && (
                  <div className="p-3 bg-violet-950/40 border border-violet-500/30 rounded-xl text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-violet-300">
                      <span>Server Verification Console:</span>
                      <button
                        type="button"
                        onClick={handleFillDevCodes}
                        className="px-2 py-0.5 bg-violet-600/40 hover:bg-violet-600 text-white rounded text-[10px]"
                      >
                        Auto-fill Codes
                      </button>
                    </div>
                    <div className="font-mono text-slate-300 flex justify-between">
                      <span>Email OTP: <strong className="text-white">{devCodes.emailOtp}</strong></span>
                      <span>SMS OTP: <strong className="text-white">{devCodes.smsOtp}</strong></span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpVerifying || !emailOtp || !smsOtp}
                  className="w-full py-3.5 px-6 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-[0_0_25px_-5px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {otpVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Verify Both Codes &amp; Access Console</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Fully Elevated Admin Console
  const totalRegistrations = registrations.length;
  const zeroCodeCount = registrations.filter((r) => r.event_slug === 'zerocode').length;
  const ctfCount = registrations.filter((r) => r.event_slug === 'ctf').length;
  const hackathonCount = registrations.filter((r) => r.event_slug === 'hackathon').length;
  const codeRushCount = registrations.filter((r) => r.event_slug === 'coderush').length;
  
  const uniqueEmails = new Set(registrations.map((r) => r.email.toLowerCase()));
  const totalUniqueParticipants = uniqueEmails.size;
  const pendingPayments = registrations.filter((r) => r.payment_status === 'Unpaid').length;
  const confirmedPayments = registrations.filter((r) => r.payment_status === 'Verified').length;

  const filteredList = registrations.filter((r) => {
    if (activeEventView !== 'all' && activeEventView !== 'audit' && r.event_slug !== activeEventView) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.competition_id.toLowerCase().includes(q) ||
        r.enrollment_number.toLowerCase().includes(q) ||
        r.college.toLowerCase().includes(q) ||
        (r.team_name && r.team_name.toLowerCase().includes(q));
      if (!matches) return false;
    }

    if (filterCollege !== 'all') {
      if (filterCollege === 'BVM' && !r.college.includes('BVM') && !r.college.includes('Birla')) return false;
      if (filterCollege === 'Other' && (r.college.includes('BVM') || r.college.includes('Birla'))) return false;
    }

    if (filterYear !== 'all' && r.academic_year !== filterYear) return false;
    if (filterPayment !== 'all' && r.payment_status !== filterPayment) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    const headers = [
      'Registration ID',
      'Competition ID',
      'Competition',
      'Participant Name',
      'Email',
      'Phone',
      'College',
      'Branch',
      'Academic Year',
      'Enrollment Number',
      'Team Name',
      'Team Members',
      'Registration Status',
      'Payment Status',
      'Fee',
      'Created At'
    ];

    const rows = filteredList.map((r) => [
      `"${r.id}"`,
      `"${r.competition_id}"`,
      `"${r.event_title}"`,
      `"${r.full_name}"`,
      `"${r.email}"`,
      `"${r.phone_number}"`,
      `"${r.college}"`,
      `"${r.branch}"`,
      `"${r.academic_year}"`,
      `"${r.enrollment_number}"`,
      `"${r.team_name || ''}"`,
      `"${(r.team_members || []).join('; ')}"`,
      `"${r.registration_status}"`,
      `"${r.payment_status}"`,
      `"${r.calculated_fee}"`,
      `"${r.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXORA_Registrations_${activeEventView}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    dataService.recordAdminAuditLog({
      event_type: 'CSV_EXPORT',
      details: `Exported ${filteredList.length} records for ${activeEventView}`
    });
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Admin Header with Elevated Session Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-violet-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <NexoraLogo size="sm" />
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-500/30">
              Cloud Management Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Organizer Administration Portal
          </h1>
          <p className="text-xs text-slate-400">
            Real-time participant verification and roster governance for Birla Vishvakarma Mahavidyalaya.
          </p>
        </div>

        {/* Elevated Session Indicator & Lock Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Elevated Dual-OTP Session Active</span>
          </div>
          <button
            type="button"
            onClick={handleLockSession}
            className="px-3.5 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/40 text-xs font-medium transition-colors cursor-pointer"
          >
            Lock Session
          </button>
        </div>
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#11101B]/80 border border-violet-500/20 space-y-1">
          <div className="text-[11px] font-mono text-slate-400">Total Entries</div>
          <div className="text-2xl font-bold text-white font-mono">{totalRegistrations}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#11101B]/80 border border-violet-500/20 space-y-1">
          <div className="text-[11px] font-mono text-slate-400">Unique Students</div>
          <div className="text-2xl font-bold text-violet-300 font-mono">{totalUniqueParticipants}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#11101B]/80 border border-violet-500/20 space-y-1">
          <div className="text-[11px] font-mono text-slate-400">ZeroCode</div>
          <div className="text-2xl font-bold text-white font-mono">{zeroCodeCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#11101B]/80 border border-violet-500/20 space-y-1">
          <div className="text-[11px] font-mono text-slate-400">CTF Cyber</div>
          <div className="text-2xl font-bold text-white font-mono">{ctfCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#11101B]/80 border border-violet-500/20 space-y-1">
          <div className="text-[11px] font-mono text-slate-400">Hackathon</div>
          <div className="text-2xl font-bold text-white font-mono">{hackathonCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#11101B]/80 border border-violet-500/20 space-y-1">
          <div className="text-[11px] font-mono text-slate-400">CodeRush</div>
          <div className="text-2xl font-bold text-white font-mono">{codeRushCount}</div>
        </div>
      </div>

      {/* Competition Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Registrations' },
            { id: 'zerocode', label: 'ZeroCode' },
            { id: 'ctf', label: 'CTF' },
            { id: 'hackathon', label: 'Hackathon' },
            { id: 'coderush', label: 'CodeRush' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveEventView(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeEventView === tab.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-[#171426]/70 text-slate-300 hover:bg-[#171426] border border-violet-500/15'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Filtered CSV ({filteredList.length})</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#11101B]/70 border border-violet-500/20">
        <div className="relative sm:col-span-2">
          <input
            type="text"
            placeholder="Search student name, ID (ZC-XXXX), email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#08080D] border border-violet-500/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div>
          <select
            value={filterCollege}
            onChange={(e) => {
              setFilterCollege(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full py-2 px-2.5 text-xs bg-[#08080D] border border-violet-500/20 rounded-lg text-slate-300 focus:outline-none focus:border-violet-400"
          >
            <option value="all">All Colleges</option>
            <option value="BVM">BVM Only</option>
            <option value="Other">Non-BVM Colleges</option>
          </select>
        </div>

        <div>
          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full py-2 px-2.5 text-xs bg-[#08080D] border border-violet-500/20 rounded-lg text-slate-300 focus:outline-none focus:border-violet-400"
          >
            <option value="all">All Academic Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto rounded-xl border border-violet-500/20 bg-[#11101B]/80">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#171426]/90 text-[11px] font-mono text-slate-400 border-b border-violet-500/20">
            <tr>
              <th className="py-3 px-4">Permanent ID</th>
              <th className="py-3 px-4">Participant</th>
              <th className="py-3 px-4">Competition</th>
              <th className="py-3 px-4">College &amp; Branch</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Fee</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-500/10 font-sans">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No registration records match the current criteria.
                </td>
              </tr>
            ) : (
              paginatedList.map((record) => (
                <tr key={record.id} className="hover:bg-violet-950/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-violet-300">
                    {record.competition_id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{record.full_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{record.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-950/70 text-violet-300 border border-violet-500/20">
                      {record.event_title}
                    </span>
                    {record.team_name && (
                      <div className="text-[10px] text-slate-400 mt-1">Team: {record.team_name}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="truncate max-w-[180px]">{record.college}</div>
                    <div className="text-[11px] text-slate-400">{record.branch} ({record.academic_year})</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                      {record.registration_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200">
                    ₹{record.calculated_fee}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-violet-600/30 rounded cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>Showing page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-violet-950/40 rounded border border-violet-500/20 disabled:opacity-30 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-violet-950/40 rounded border border-violet-500/20 disabled:opacity-30 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-lg w-full bg-[#11101B] border border-violet-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-violet-500/15 pb-3">
              <div>
                <span className="text-xs font-mono text-violet-400">{selectedRecord.competition_id}</span>
                <h3 className="text-lg font-bold text-white">{selectedRecord.full_name}</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-violet-500/10">
                <span className="text-slate-400">Competition:</span>
                <span className="text-white font-medium">{selectedRecord.event_title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-violet-500/10">
                <span className="text-slate-400">Student Email:</span>
                <span className="text-white font-mono">{selectedRecord.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-violet-500/10">
                <span className="text-slate-400">Mobile Phone:</span>
                <span className="text-white">{selectedRecord.phone_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-violet-500/10">
                <span className="text-slate-400">College:</span>
                <span className="text-white">{selectedRecord.college}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-violet-500/10">
                <span className="text-slate-400">Branch &amp; Year:</span>
                <span className="text-white">{selectedRecord.branch} ({selectedRecord.academic_year})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-violet-500/10">
                <span className="text-slate-400">Enrollment ID:</span>
                <span className="text-white font-mono">{selectedRecord.enrollment_number}</span>
              </div>
              {selectedRecord.team_name && (
                <div className="py-2 border-b border-violet-500/10 space-y-1">
                  <div className="text-violet-300 font-semibold">Team: {selectedRecord.team_name}</div>
                  {selectedRecord.team_members && (
                    <div className="text-[11px] text-slate-400">
                      Roster: {selectedRecord.team_members.join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-violet-500/10">
                <span className="text-slate-400">Registration Fee:</span>
                <span className="text-violet-300 font-bold">₹{selectedRecord.calculated_fee}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Registered Timestamp:</span>
                <span className="text-slate-400">{new Date(selectedRecord.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
