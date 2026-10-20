import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NexoraLogo } from '../../components/ui/NexoraLogo';

export const ForgotPasswordPage: React.FC = () => {
  const { sendEmailOtp, verifyEmailOtp, resetPasswordWithOtp } = useAuth();
  const navigate = useNavigate();

  // Wizard state: 1: Request Email -> 2: Verify 6-digit OTP -> 3: Set New Password -> 4: Success
  const [stage, setStage] = useState<'request' | 'otp' | 'new-password' | 'success'>('request');
  const [email, setEmail] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  
  // OTP state (Strict 30-second window)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(30);
  const [resendCooldown, setResendCooldown] = useState<number>(30);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & loading
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // 30-Second Countdown Timer for OTP Expiration & Resend Cooldown
  useEffect(() => {
    if (stage !== 'otp' || countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((p) => {
        if (p <= 1) {
          clearInterval(interval);
          return 0;
        }
        return p - 1;
      });
      setResendCooldown((p) => Math.max(0, p - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, countdownSeconds]);

  // Stage 1: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid student email address.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await sendEmailOtp(cleanEmail, 'reset-password');
      setMaskedEmail(res.maskedEmail);
      setCountdownSeconds(res.expiresInSeconds || 180);
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setStage('otp');
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await verifyEmailOtp(email.trim().toLowerCase(), fullOtp, 'reset-password');
      setVerificationToken(res.verificationToken);
      setStage('new-password');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const copy = [...otpDigits];
      copy[index] = '';
      setOtpDigits(copy);
      return;
    }
    const digit = cleanVal.slice(-1);
    const copy = [...otpDigits];
    copy[index] = digit;
    setOtpDigits(copy);
    if (index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerifyOtp();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const copy = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      copy[i] = pasted[i] || '';
    }
    setOtpDigits(copy);
    const nextIdx = Math.min(5, pasted.length);
    otpInputRefs.current[nextIdx]?.focus();
  };

  // Stage 3: Set New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken) {
      setErrorMsg('Verification authorization expired. Please restart.');
      setStage('request');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      await resetPasswordWithOtp(email.trim().toLowerCase(), verificationToken, newPassword);
      setStage('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please restart password recovery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block transition-transform hover:scale-105" aria-label="NEXORA Home">
            <NexoraLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Reset Your Password
          </h1>
          <p className="text-xs text-slate-400">
            Secure OTP-based student credential recovery
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl bg-[#11101B]/90 backdrop-blur-xl border border-violet-500/25 shadow-2xl space-y-6">
          
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STAGE 1: Request Password Reset */}
          {stage === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered student email address. If an eligible account exists, a 6-digit verification code will be dispatched.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#08080D] border border-violet-500/25 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 select-text"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {/* STAGE 2: 6-Digit OTP Verification */}
          {stage === 'otp' && (
            <div className="space-y-6">
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-white">Enter 6-Digit Code</h3>
                <p className="text-xs text-slate-300">
                  Verification code dispatched to <span className="text-violet-300 font-mono">{maskedEmail}</span>
                </p>
              </div>

              {/* 6 Digit Boxes */}
              <div className="flex justify-center items-center gap-2 sm:gap-3 py-2" onPaste={handleDigitPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold bg-[#08080D] border border-violet-500/30 rounded-xl text-white focus:outline-none focus:border-violet-400"
                  />
                ))}
              </div>

              {/* 30-Second Countdown Indicator */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Code expires in:</span>
                <span className={`font-bold ${countdownSeconds <= 10 ? 'text-red-400' : 'text-violet-300'}`}>
                  00:{countdownSeconds.toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-violet-500/15">
                <button
                  type="button"
                  onClick={() => setStage('request')}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestOtp()}
                  disabled={countdownSeconds > 0 || loading}
                  className="text-violet-400 hover:text-violet-300 font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {countdownSeconds > 0 ? `Resend OTP (${countdownSeconds}s)` : 'Resend OTP'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otpDigits.join('').length !== 6 || countdownSeconds <= 0}
                className="w-full py-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Verify Code &amp; Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* STAGE 3: Create New Password */}
          {stage === 'new-password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Email Verified</span>
                </div>
                <h3 className="text-xl font-bold text-white">Create New Password</h3>
                <p className="text-xs text-slate-400">
                  Choose a new strong password for your student account.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-[#08080D] border border-violet-500/25 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 select-text"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#08080D] border border-violet-500/25 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 select-text"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}

          {/* STAGE 4: Success Message */}
          {stage === 'success' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Password Updated</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                  Your password has been updated successfully. Please sign in again with your new credentials.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
