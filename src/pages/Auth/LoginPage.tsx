import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NexoraLogo } from '../../components/ui/NexoraLogo';
import { AcademicYear } from '../../types';

interface ErrorDetails {
  message: string;
  code?: string;
  isDomainError?: boolean;
  hostname?: string;
  projectId?: string;
}

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/profile';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [copiedHostname, setCopiedHostname] = useState(false);
  const [showAdminGuide, setShowAdminGuide] = useState(false);

  // First-time Google profile completion modal state
  const [showProfileCompleteModal, setShowProfileCompleteModal] = useState(false);
  const [academicData, setAcademicData] = useState({
    college: 'Birla Vishvakarma Mahavidyalaya (BVM)',
    branch: 'Information Technology',
    academic_year: '1st Year' as AcademicYear,
    enrollment_number: '',
    division: '',
    phone_number: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Email/Password login
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);
    setSubmitting(true);

    try {
      await loginWithEmail(email.trim(), password);
      navigate(redirectPath);
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Invalid credentials. Please verify your email and password.',
        code: err?.code
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setErrorDetails(null);
    setGoogleLoading(true);

    try {
      const loggedInUser = await loginWithGoogle();
      if (!loggedInUser.enrollment_number || !loggedInUser.is_profile_complete) {
        // First-time user needs academic profile completion
        setShowProfileCompleteModal(true);
      } else {
        navigate(redirectPath);
      }
    } catch (err: any) {
      const isDomain = err?.isDomainError || err?.code === 'auth/unauthorized-domain';
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      
      setErrorDetails({
        message: err.message || 'Failed to sign in with Google.',
        code: err?.code,
        isDomainError: isDomain,
        hostname: err?.hostname || currentHost,
        projectId: err?.projectId || 'gen-lang-client-0089073748'
      });
      if (isDomain) {
        setShowAdminGuide(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCopyHostname = (host: string) => {
    if (!host) return;
    navigator.clipboard.writeText(host);
    setCopiedHostname(true);
    setTimeout(() => setCopiedHostname(false), 3000);
  };

  // Complete academic profile
  const handleSaveAcademicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicData.enrollment_number.trim()) {
      setErrorDetails({
        message: 'Enrollment number is required to participate in BVM & collegiate events.'
      });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        college: academicData.college,
        branch: academicData.branch,
        academic_year: academicData.academic_year,
        enrollment_number: academicData.enrollment_number.trim().toUpperCase(),
        division: academicData.division.trim(),
        phone_number: academicData.phone_number.trim(),
        is_profile_complete: true
      });
      setShowProfileCompleteModal(false);
      navigate(redirectPath);
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Failed to save academic profile.'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const activeHostname = errorDetails?.hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
  const activeProjectId = errorDetails?.projectId || 'gen-lang-client-0089073748';

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        {/* Brand Master Wordmark */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block transition-transform hover:scale-105">
            <NexoraLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign In to NEXORA
          </h1>
          <p className="text-xs text-slate-400">
            Student Technology &amp; Innovation Community at BVM
          </p>
        </div>

        {/* Glassmorphic Auth Card */}
        <div className="p-8 rounded-2xl bg-[#11101B]/85 backdrop-blur-xl border border-violet-500/25 shadow-[0_0_50px_-10px_rgba(139,92,246,0.25)] space-y-6">
          
          {/* Error Message & Unauthorized Domain Diagnostic Panel */}
          {errorDetails && (
            <div className="space-y-3">
              <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="leading-relaxed">{errorDetails.message}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-900/50 hover:bg-red-800/60 border border-red-400/30 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${googleLoading ? 'animate-spin' : ''}`} />
                      <span>Retry Google Sign-In</span>
                    </button>
                    {errorDetails.isDomainError && (
                      <button
                        type="button"
                        onClick={() => setShowAdminGuide(!showAdminGuide)}
                        className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-white underline cursor-pointer ml-auto"
                      >
                        <span>{showAdminGuide ? 'Hide Setup Guide' : 'Domain Setup Guide'}</span>
                        {showAdminGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Domain Authorization Guide (Appears when auth/unauthorized-domain occurs) */}
              {errorDetails.isDomainError && showAdminGuide && (
                <div className="p-4 bg-violet-950/50 border border-violet-500/30 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-mono text-violet-300 font-semibold border-b border-violet-500/20 pb-2">
                    <Globe className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Authorize Domain in Firebase</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Firebase Authentication requires this application&apos;s current hostname to be added to your project&apos;s list of authorized domains.
                  </p>

                  {/* Hostname Box with Copy Button */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Exact Hostname to Add:</span>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#08080D] border border-violet-500/25 font-mono text-violet-200 text-xs">
                      <span className="truncate pr-2">{activeHostname}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyHostname(activeHostname)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-600/40 hover:bg-violet-600 text-white rounded text-[10px] shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedHostname ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Hostname</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-1.5 text-[11px] text-slate-300 pt-1">
                    <div>1. Open <strong className="text-white">Firebase Console</strong> → Build → <strong className="text-white">Authentication</strong></div>
                    <div>2. Click <strong className="text-white">Settings</strong> tab → <strong className="text-white">Authorized domains</strong></div>
                    <div>3. Click <strong className="text-white">Add domain</strong>, paste the copied hostname, and Save.</div>
                  </div>

                  {/* Direct Link to Firebase Console */}
                  <div className="pt-2 border-t border-violet-500/15 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">Project: {activeProjectId}</span>
                    <a
                      href={`https://console.firebase.google.com/project/${activeProjectId}/authentication/settings`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-300 hover:text-white underline cursor-pointer"
                    >
                      <span>Open Firebase Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1. Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || submitting}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-violet-500/20 w-full" />
            <span className="bg-[#11101B] px-3 text-[11px] font-mono text-slate-400 uppercase tracking-wider relative shrink-0">
              or with password
            </span>
            <div className="border-t border-violet-500/20 w-full" />
          </div>

          {/* 2. Email & Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@bvmengineering.ac.in"
                  className="w-full bg-[#08080D]/70 border border-violet-500/25 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#08080D]/70 border border-violet-500/25 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_-3px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In with Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Direct Link to Sign Up */}
          <div className="pt-2 text-center text-xs text-slate-400 border-t border-violet-500/10">
            <span>New to NEXORA? </span>
            <Link
              to="/signup"
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
            >
              Create student account
            </Link>
          </div>
        </div>

        {/* Security / Privacy notice */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
          <span>Protected by Firebase Authentication &amp; BVM Collegiate Standards</span>
        </div>
      </div>

      {/* First-Time Academic Profile Modal for Google Sign-In */}
      {showProfileCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-lg w-full bg-[#11101B] border border-violet-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-500/30 text-[10px] font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Google Account Authenticated</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Complete Academic Profile
              </h2>
              <p className="text-xs text-slate-300">
                To participate in BVM tech events and verify collegiate eligibility, please provide your academic details once.
              </p>
            </div>

            <form onSubmit={handleSaveAcademicProfile} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">College / Institution</label>
                <select
                  value={academicData.college}
                  onChange={(e) => setAcademicData({ ...academicData, college: e.target.value })}
                  className="w-full bg-[#08080D] border border-violet-500/25 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="Birla Vishvakarma Mahavidyalaya (BVM)">Birla Vishvakarma Mahavidyalaya (BVM)</option>
                  <option value="G H Patel College of Engineering & Technology (GCET)">GCET</option>
                  <option value="A.D. Patel Institute of Technology (ADIT)">ADIT</option>
                  <option value="Charotar University of Science and Technology (CHARUSAT)">CHARUSAT</option>
                  <option value="Other">Other Collegiate Institution</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Branch</label>
                  <input
                    type="text"
                    required
                    value={academicData.branch}
                    onChange={(e) => setAcademicData({ ...academicData, branch: e.target.value })}
                    placeholder="Information Technology"
                    className="w-full bg-[#08080D] border border-violet-500/25 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Academic Year</label>
                  <select
                    value={academicData.academic_year}
                    onChange={(e) => setAcademicData({ ...academicData, academic_year: e.target.value as AcademicYear })}
                    className="w-full bg-[#08080D] border border-violet-500/25 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Enrollment ID *</label>
                  <input
                    type="text"
                    required
                    value={academicData.enrollment_number}
                    onChange={(e) => setAcademicData({ ...academicData, enrollment_number: e.target.value })}
                    placeholder="23IT401"
                    className="w-full bg-[#08080D] border border-violet-500/25 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Division (Optional)</label>
                  <input
                    type="text"
                    value={academicData.division}
                    onChange={(e) => setAcademicData({ ...academicData, division: e.target.value })}
                    placeholder="A / B"
                    className="w-full bg-[#08080D] border border-violet-500/25 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Mobile Number (For WhatsApp / Event Updates)</label>
                <input
                  type="tel"
                  value={academicData.phone_number}
                  onChange={(e) => setAcademicData({ ...academicData, phone_number: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full bg-[#08080D] border border-violet-500/25 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                {savingProfile ? 'Saving Profile...' : 'Save & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
