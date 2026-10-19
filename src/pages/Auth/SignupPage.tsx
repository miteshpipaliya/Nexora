import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  GraduationCap, 
  Calendar, 
  IdCard, 
  Layers, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NexoraLogo } from '../../components/ui/NexoraLogo';
import { AcademicYear } from '../../types';

const COLLEGES = [
  'Birla Vishvakarma Mahavidyalaya (BVM)',
  'G H Patel College of Engineering & Technology (GCET)',
  'A.D. Patel Institute of Technology (ADIT)',
  'Charotar University of Science and Technology (CHARUSAT)',
  'Dharmsinh Desai University (DDU)',
  'Other College'
];

const BRANCHES = [
  'Computer Engineering',
  'Information Technology',
  'Electronics Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other'
];

const ACADEMIC_YEARS: AcademicYear[] = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate'
];

export const SignupPage: React.FC = () => {
  const { signupWithEmail, loginWithGoogle, sendEmailOtp, verifyEmailOtp, updateProfile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/profile';

  // Wizard Step State
  // Flow:
  // 1: Name
  // 2: Email
  // 3: Password (skipped for Google)
  // 4: Email OTP Verification (skipped for Google)
  // 5: College
  // 6: Branch
  // 7: Academic Year
  // 8: Enrollment Number
  // 9: Division (Optional)
  // 10: Phone Number (Optional)
  // 11: Review & Submit
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isGoogleAuth, setIsGoogleAuth] = useState<boolean>(false);
  const [googleUserUid, setGoogleUserUid] = useState<string | null>(null);

  // Form Fields (ZERO personal default values)
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Academic Details
  const [college, setCollege] = useState<string>('');
  const [customCollege, setCustomCollege] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [customBranch, setCustomBranch] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<AcademicYear | ''>('');
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>('');
  const [division, setDivision] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phone, setPhone] = useState<string>('');

  // Global submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);

  // Auto-focus input on step change
  const mainInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setStepError(null);
    if (currentStep !== 4) {
      setTimeout(() => {
        mainInputRef.current?.focus();
      }, 100);
    } else {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [currentStep]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If user is already logged in with an incomplete profile, resume from college
  useEffect(() => {
    if (user && !user.is_profile_complete) {
      setIsGoogleAuth(true);
      setGoogleUserUid(user.id);
      if (user.full_name) setFullName(user.full_name);
      if (user.email) setEmail(user.email);
      setCurrentStep(5);
    }
  }, [user]);

  // Handle Google Sign-In Onboarding
  const handleGoogleSignup = async () => {
    setStepError(null);
    setGoogleLoading(true);
    try {
      const loggedIn = await loginWithGoogle();
      setIsGoogleAuth(true);
      setGoogleUserUid(loggedIn.id);
      setFullName(loggedIn.full_name || '');
      setEmail(loggedIn.email || '');

      if (loggedIn.enrollment_number && loggedIn.branch && loggedIn.is_profile_complete) {
        // Returning student with complete profile -> skip straight to redirect
        navigate(redirectPath);
        return;
      }

      // First-time or incomplete Google account -> proceed to academic onboarding
      setCurrentStep(5);
    } catch (err: any) {
      setStepError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Dispatch Email OTP
  const triggerSendEmailOtp = async (targetEmail: string) => {
    setOtpError(null);
    setOtpSuccess(null);
    setOtpSending(true);
    try {
      const res = await sendEmailOtp(targetEmail, 'signup');
      setMaskedEmail(res.maskedEmail);
      setResendCooldown(res.resendCooldown || 60);
      setOtpSuccess('6-digit verification code dispatched to your email.');
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
    } catch (err: any) {
      setOtpError(err.message || 'Could not send verification code. Please check your email.');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify Email OTP
  const handleVerifyOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setOtpError('Please enter all 6 digits.');
      return;
    }

    setOtpError(null);
    setOtpVerifying(true);
    try {
      const res = await verifyEmailOtp(email.trim().toLowerCase(), fullOtp, 'signup');
      setVerificationToken(res.verificationToken);
      setOtpSuccess('Email verified successfully!');
      setTimeout(() => {
        setCurrentStep(5); // Advance to College
      }, 500);
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Handle digit box typing
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Single digit typed
    const digit = cleanVal.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
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
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    const nextIdx = Math.min(5, pasted.length);
    otpInputRefs.current[nextIdx]?.focus();
  };

  // Step Validation & Navigation
  const handleNext = async () => {
    setStepError(null);

    // Step 1: Full Name
    if (currentStep === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setStepError('Please enter your full name (minimum 2 characters).');
        return;
      }
      setCurrentStep(2);
      return;
    }

    // Step 2: Email
    if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setStepError('Please enter a valid student or personal email address.');
        return;
      }
      setCurrentStep(3);
      return;
    }

    // Step 3: Password
    if (currentStep === 3) {
      if (password.length < 6) {
        setStepError('Password must be at least 6 characters long.');
        return;
      }
      // Send OTP and move to Step 4
      setCurrentStep(4);
      triggerSendEmailOtp(email.trim().toLowerCase());
      return;
    }

    // Step 4: OTP Verification handled by handleVerifyOtp
    if (currentStep === 4) {
      handleVerifyOtp();
      return;
    }

    // Step 5: College
    if (currentStep === 5) {
      const finalCol = college === 'Other College' ? customCollege.trim() : college;
      if (!finalCol) {
        setStepError('Please select or specify your college/institution.');
        return;
      }
      setCurrentStep(6);
      return;
    }

    // Step 6: Branch
    if (currentStep === 6) {
      const finalBranch = branch === 'Other' ? customBranch.trim() : branch;
      if (!finalBranch) {
        setStepError('Please select or specify your field of study.');
        return;
      }
      setCurrentStep(7);
      return;
    }

    // Step 7: Academic Year
    if (currentStep === 7) {
      if (!academicYear) {
        setStepError('Please select your current academic year.');
        return;
      }
      setCurrentStep(8);
      return;
    }

    // Step 8: Enrollment Number
    if (currentStep === 8) {
      if (!enrollmentNumber.trim() || enrollmentNumber.trim().length < 3) {
        setStepError('Please enter your official enrollment or student ID.');
        return;
      }
      setCurrentStep(9);
      return;
    }

    // Step 9: Division (Optional)
    if (currentStep === 9) {
      setCurrentStep(10);
      return;
    }

    // Step 10: Phone Number (Optional)
    if (currentStep === 10) {
      setCurrentStep(11);
      return;
    }

    // Step 11: Review -> Complete Final Registration
    if (currentStep === 11) {
      handleFinalSubmission();
    }
  };

  const handleBack = () => {
    setStepError(null);
    if (currentStep === 1) return;
    if (isGoogleAuth && currentStep === 5) {
      // If Google user went into academic questions, back to step 1
      setCurrentStep(1);
      return;
    }
    if (currentStep === 5 && !isGoogleAuth) {
      // Back from college to OTP
      setCurrentStep(4);
      return;
    }
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSkip = () => {
    setStepError(null);
    if (currentStep === 9) {
      setDivision('');
      setCurrentStep(10);
      return;
    }
    if (currentStep === 10) {
      setPhone('');
      setCurrentStep(11);
      return;
    }
  };

  // Final Registration & Profile Saving in Firestore
  const handleFinalSubmission = async () => {
    setSubmitting(true);
    setStepError(null);

    const finalCollege = college === 'Other College' ? customCollege.trim() : college;
    const finalBranch = branch === 'Other' ? customBranch.trim() : branch;
    const formattedPhone = phone.trim() ? `${countryCode} ${phone.trim()}` : '';

    try {
      if (isGoogleAuth && googleUserUid) {
        // Complete Google authenticated profile
        await updateProfile({
          full_name: fullName.trim(),
          college: finalCollege,
          branch: finalBranch,
          academic_year: academicYear as AcademicYear,
          enrollment_number: enrollmentNumber.trim().toUpperCase(),
          division: division.trim(),
          phone_number: formattedPhone,
          is_profile_complete: true
        });
      } else {
        // Create full email/password Firebase Auth account + Firestore profile
        await signupWithEmail({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          college: finalCollege,
          branch: finalBranch,
          academic_year: academicYear as AcademicYear,
          enrollment_number: enrollmentNumber.trim().toUpperCase(),
          division: division.trim(),
          phone_number: formattedPhone
        });
      }

      navigate(redirectPath);
    } catch (err: any) {
      setStepError(err.message || 'Failed to complete registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute dynamic progress metrics
  // Total steps for email flow = 11 (Name, Email, Password, OTP, College, Branch, Year, Enrollment, Div, Phone, Review)
  // Total steps for Google flow = 8 (Name, College, Branch, Year, Enrollment, Div, Phone, Review)
  const totalSteps = isGoogleAuth ? 8 : 11;
  const currentStepDisplay = isGoogleAuth 
    ? (currentStep === 1 ? 1 : Math.min(8, currentStep - 3))
    : currentStep;
  const progressPercent = Math.round((currentStepDisplay / totalSteps) * 100);

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block transition-transform hover:scale-105" aria-label="NEXORA Home">
            <NexoraLogo size="md" />
          </Link>
          <div className="text-[11px] font-mono text-violet-400 tracking-wider uppercase">
            Student Onboarding Portal
          </div>
        </div>

        {/* Multi-Step Card */}
        <div className="relative rounded-2xl bg-[#11101B]/90 backdrop-blur-xl border border-violet-500/25 shadow-[0_0_50px_-10px_rgba(139,92,246,0.3)] p-6 sm:p-8 space-y-6">
          
          {/* Progress Indicator Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="text-violet-300 font-semibold">
                Step {currentStepDisplay} of {totalSteps}
              </span>
              <span>{progressPercent}% Complete</span>
            </div>
            <div className="w-full h-1 bg-[#171426] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Validation Error Alert */}
          {stepError && (
            <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{stepError}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: Full Name */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Welcome to NEXORA</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  What should we call you?
                </h2>
                <p className="text-xs text-slate-400">
                  Enter your full name as you would like it to appear on competition certificates.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    ref={mainInputRef}
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    className="w-full pl-10 pr-4 py-3 bg-[#08080D] border border-violet-500/25 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 transition-all select-text"
                  />
                </div>
              </div>

              {/* Fast-track Google Sign-In */}
              <div className="pt-2 border-t border-violet-500/15 space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={googleLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {googleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>Continue with Google (Fast Track)</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: Email Address */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Account Identity</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  What's your email address?
                </h2>
                <p className="text-xs text-slate-400">
                  We'll use this to send competition confirmations and verify your eligibility.
                </p>
              </div>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  ref={mainInputRef}
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full pl-10 pr-4 py-3 bg-[#08080D] border border-violet-500/25 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 transition-all select-text"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: Password */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Account Security</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Create your password
                </h2>
                <p className="text-xs text-slate-400">
                  Must be at least 6 characters long to secure your student portal.
                </p>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    ref={mainInputRef}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    className="w-full pl-10 pr-11 py-3 bg-[#08080D] border border-violet-500/25 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 transition-all select-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength guidance */}
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <div className={`w-2 h-2 rounded-full ${password.length >= 6 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span>{password.length >= 6 ? 'Minimum length satisfied' : 'At least 6 characters required'}</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: 6-Digit Email OTP Verification */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-300">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Verify Your Email
                </h2>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  We've sent a 6-digit verification code to <span className="text-violet-300 font-mono">{maskedEmail || email}</span>.
                </p>
              </div>

              {otpError && (
                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {otpSuccess && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{otpSuccess}</span>
                </div>
              )}

              {/* 6 Individual Digit Boxes */}
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
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold bg-[#08080D] border border-violet-500/30 rounded-xl text-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                  />
                ))}
              </div>

              {/* Dev Inspection Helper for testing without live SMTP */}
              {devOtp && (
                <div className="p-3 bg-violet-950/40 border border-violet-500/30 rounded-xl text-[11px] space-y-1 font-mono">
                  <div className="flex items-center justify-between text-violet-300">
                    <span>Dev Verification Code:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const arr = devOtp.split('').slice(0, 6);
                        setOtpDigits(arr);
                      }}
                      className="px-2 py-0.5 bg-violet-600/40 hover:bg-violet-600 text-white rounded text-[10px] cursor-pointer"
                    >
                      Auto-fill
                    </button>
                  </div>
                  <div className="text-white font-bold text-center tracking-widest text-sm">
                    {devOtp}
                  </div>
                </div>
              )}

              {/* Resend & Change Email Actions */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-violet-500/15">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={() => triggerSendEmailOtp(email.trim().toLowerCase())}
                  disabled={resendCooldown > 0 || otpSending}
                  className="text-violet-400 hover:text-violet-300 font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpVerifying || otpDigits.join('').length !== 6}
                className="w-full py-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {otpVerifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Verify Email &amp; Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: College / Institution */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Academic Affiliation</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Which college do you study at?
                </h2>
                <p className="text-xs text-slate-400">
                  Select your institution. All engineering and technology colleges are welcome.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  {COLLEGES.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setCollege(col)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                        college === col
                          ? 'bg-violet-950/70 border-violet-400 text-white shadow-sm'
                          : 'bg-[#08080D]/60 border-violet-500/20 text-slate-300 hover:border-violet-500/40 hover:bg-[#171426]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className={`w-4 h-4 ${college === col ? 'text-violet-400' : 'text-slate-500'}`} />
                        <span>{col}</span>
                      </div>
                      {college === col && <Check className="w-4 h-4 text-violet-400" />}
                    </button>
                  ))}
                </div>

                {college === 'Other College' && (
                  <div className="pt-2">
                    <label className="block text-xs text-slate-300 mb-1">Enter College Name</label>
                    <input
                      ref={mainInputRef}
                      type="text"
                      placeholder="Enter your college or university name"
                      value={customCollege}
                      onChange={(e) => setCustomCollege(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      className="w-full px-4 py-2.5 bg-[#08080D] border border-violet-500/30 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 6: Branch / Discipline */}
          {/* ======================================================== */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Field of Study</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  What's your field of study?
                </h2>
                <p className="text-xs text-slate-400">
                  Select your engineering department or degree branch.
                </p>
              </div>

              <div className="space-y-2">
                {BRANCHES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBranch(b)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                      branch === b
                        ? 'bg-violet-950/70 border-violet-400 text-white shadow-sm'
                        : 'bg-[#08080D]/60 border-violet-500/20 text-slate-300 hover:border-violet-500/40 hover:bg-[#171426]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className={`w-4 h-4 ${branch === b ? 'text-violet-400' : 'text-slate-500'}`} />
                      <span>{b}</span>
                    </div>
                    {branch === b && <Check className="w-4 h-4 text-violet-400" />}
                  </button>
                ))}

                {branch === 'Other' && (
                  <div className="pt-2">
                    <label className="block text-xs text-slate-300 mb-1">Enter Discipline / Branch</label>
                    <input
                      ref={mainInputRef}
                      type="text"
                      placeholder="e.g. Mechatronics, Data Science"
                      value={customBranch}
                      onChange={(e) => setCustomBranch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      className="w-full px-4 py-2.5 bg-[#08080D] border border-violet-500/30 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 7: Academic Year */}
          {/* ======================================================== */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Academic Level</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Which year are you studying in?
                </h2>
                <p className="text-xs text-slate-400">
                  Select your current degree year.
                </p>
              </div>

              <div className="space-y-2">
                {ACADEMIC_YEARS.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setAcademicYear(yr)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      academicYear === yr
                        ? 'bg-violet-950/70 border-violet-400 text-white shadow-sm'
                        : 'bg-[#08080D]/60 border-violet-500/20 text-slate-300 hover:border-violet-500/40 hover:bg-[#171426]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className={`w-4 h-4 ${academicYear === yr ? 'text-violet-400' : 'text-slate-500'}`} />
                      <span>{yr}</span>
                    </div>
                    {academicYear === yr && <Check className="w-4 h-4 text-violet-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 8: Enrollment Number */}
          {/* ======================================================== */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Student Verification</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  What's your enrollment number?
                </h2>
                <p className="text-xs text-slate-400">
                  Your university roll or enrollment number ensures authentic roster verification.
                </p>
              </div>

              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  ref={mainInputRef}
                  type="text"
                  placeholder="Enter your enrollment number"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full pl-10 pr-4 py-3 bg-[#08080D] border border-violet-500/25 rounded-xl text-sm font-mono uppercase text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 transition-all select-text"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 9: Division (Optional) */}
          {/* ======================================================== */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Class Section (Optional)</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  What's your division?
                </h2>
                <p className="text-xs text-slate-400">
                  Optional class section or batch code. You may skip this if not applicable.
                </p>
              </div>

              <div className="relative">
                <Layers className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  ref={mainInputRef}
                  type="text"
                  placeholder="Enter your division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full pl-10 pr-4 py-3 bg-[#08080D] border border-violet-500/25 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 transition-all select-text"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 10: Phone Number (Optional) */}
          {/* ======================================================== */}
          {currentStep === 10 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Contact Communication</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Would you like to add a contact number?
                </h2>
                <p className="text-xs text-slate-400">
                  Used for urgent event announcements and team coordination. Optional for general signup.
                </p>
              </div>

              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-2.5 py-3 bg-[#08080D] border border-violet-500/25 rounded-xl text-xs text-white focus:outline-none focus:border-violet-400"
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+971">+971 (UAE)</option>
                </select>

                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    ref={mainInputRef}
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    className="w-full pl-10 pr-4 py-3 bg-[#08080D] border border-violet-500/25 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 transition-all select-text"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 11: Summary Review & Final Account Creation */}
          {/* ======================================================== */}
          {currentStep === 11 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Ready to Launch</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  You're almost there!
                </h2>
                <p className="text-xs text-slate-400">
                  Review your information before initializing your permanent NEXORA student profile.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#08080D]/70 border border-violet-500/20 divide-y divide-violet-500/10 text-xs space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Name:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{fullName}</span>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-violet-400 hover:text-white">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Email:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{email}</span>
                    {!isGoogleAuth && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">College:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white truncate max-w-[200px]">
                      {college === 'Other College' ? customCollege : college}
                    </span>
                    <button type="button" onClick={() => setCurrentStep(5)} className="text-violet-400 hover:text-white">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Branch:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{branch === 'Other' ? customBranch : branch}</span>
                    <button type="button" onClick={() => setCurrentStep(6)} className="text-violet-400 hover:text-white">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Year:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{academicYear}</span>
                    <button type="button" onClick={() => setCurrentStep(7)} className="text-violet-400 hover:text-white">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Enrollment ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{enrollmentNumber}</span>
                    <button type="button" onClick={() => setCurrentStep(8)} className="text-violet-400 hover:text-white">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {division && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Division:</span>
                    <span className="text-white">{division}</span>
                  </div>
                )}

                {phone && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-white">{countryCode} {phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls (Excluding OTP step which has its own Verify button) */}
          {currentStep !== 4 && (
            <div className="pt-2 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#171426] hover:bg-[#1f1b33] border border-violet-500/20 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {/* Optional Skip button for Division (Step 9) and Phone (Step 10) */}
                {(currentStep === 9 || currentStep === 10) && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all shadow-[0_0_20px_-3px_rgba(139,92,246,0.6)] cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : currentStep === 11 ? (
                    <span>{isGoogleAuth ? 'Complete My Profile' : 'Create My NEXORA Account'}</span>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Member Redirection */}
        <div className="text-center text-xs text-slate-400">
          <span>Already registered? </span>
          <Link
            to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-violet-400 hover:text-violet-300 font-semibold"
          >
            Sign In Here →
          </Link>
        </div>
      </div>
    </div>
  );
};
