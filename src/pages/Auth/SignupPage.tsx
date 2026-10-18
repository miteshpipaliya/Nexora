import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Building, BookOpen, IdCard, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NexoraLogo } from '../../components/ui/NexoraLogo';

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/profile';

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [college, setCollege] = useState('BVM');
  const [customCollege, setCustomCollege] = useState('');
  const [branch, setBranch] = useState('Electronics Engineering');
  const [academicYear, setAcademicYear] = useState('1st Year');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [division, setDivision] = useState('11');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (!enrollmentNumber.trim()) return setError('Enrollment or Student ID is required.');

    const activeCollege = college === 'Other' ? customCollege.trim() : college;
    if (!activeCollege) return setError('Please specify your institution.');

    setSubmitting(true);
    try {
      await signup({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        college: activeCollege,
        branch: branch.trim(),
        academic_year: academicYear,
        enrollment_number: enrollmentNumber.trim().toUpperCase(),
        division: division.trim(),
        phone_number: phone.trim()
      });
      navigate(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Account creation failed. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-8">
      
      {/* Brand Heading */}
      <div className="text-center space-y-3">
        <Link to="/" className="inline-block transition-transform hover:scale-105">
          <NexoraLogo size="lg" />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs text-slate-400">
          Join the student technology &amp; innovation community at BVM.
        </p>
      </div>

      {/* Card */}
      <div className="p-8 rounded-2xl bg-[#11101B]/85 backdrop-blur-xl border border-violet-500/25 shadow-2xl space-y-6">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Mitesh Pipaliya"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 selectable-content"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Academic or Personal Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="student@bvmengineering.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 selectable-content"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 selectable-content"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-violet-400 selectable-content"
                />
              </div>
            </div>

            {/* College */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                College / Institution *
              </label>
              <select
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400"
              >
                <option value="BVM">BVM (Birla Vishvakarma Mahavidyalaya)</option>
                <option value="GCET">GCET</option>
                <option value="ADIT">ADIT</option>
                <option value="CHARUSAT">CHARUSAT</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Custom College if other */}
            {college === 'Other' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  College Name *
                </label>
                <input
                  type="text"
                  placeholder="Your college name"
                  value={customCollege}
                  onChange={(e) => setCustomCollege(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
                />
              </div>
            )}

            {/* Branch */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Branch / Engineering Discipline *
              </label>
              <input
                type="text"
                placeholder="e.g. Electronics Engineering"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
              />
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Academic Year *
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>

            {/* Enrollment Number */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Enrollment / Roll Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 26EL309"
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white uppercase focus:outline-none focus:border-violet-400 selectable-content"
              />
            </div>

            {/* Division */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Division (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 11"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-500 hover:to-purple-500 transition-all shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>{submitting ? 'Creating Profile...' : 'Complete Registration'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Login Redirection */}
      <div className="text-center text-xs text-slate-400">
        <span>Already have an account? </span>
        <Link
          to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          className="text-violet-400 hover:text-violet-300 font-semibold"
        >
          Sign In Here →
        </Link>
      </div>
    </div>
  );
};
