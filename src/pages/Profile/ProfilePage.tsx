import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Building, 
  BookOpen, 
  IdCard, 
  Calendar, 
  LogOut, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Shield,
  Layers,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { RegistrationRecord, UserProfile } from '../../types';

export const ProfilePage: React.FC = () => {
  const { user, logout, updateProfile, isAdmin, sendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editYear, setEditYear] = useState<any>('1st Year');
  const [editEnrollment, setEditEnrollment] = useState('');
  const [editDivision, setEditDivision] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/profile');
      return;
    }

    // Prefill form
    setEditFullName(user.full_name);
    setEditCollege(user.college);
    setEditBranch(user.branch);
    setEditYear(user.academic_year);
    setEditEnrollment(user.enrollment_number);
    setEditDivision(user.division || '');
    setEditPhone(user.phone_number || '');

    // Fetch user's registrations
    dataService.getUserRegistrations(user.id)
      .then((regs) => {
        setRegistrations(regs);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingRegs(false));
  }, [user, navigate]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (!editFullName.trim()) throw new Error('Full name cannot be empty.');
      if (!editEnrollment.trim()) throw new Error('Enrollment number is required.');

      await updateProfile({
        full_name: editFullName.trim(),
        college: editCollege.trim(),
        branch: editBranch.trim(),
        academic_year: editYear,
        enrollment_number: editEnrollment.trim().toUpperCase(),
        division: editDivision.trim(),
        phone_number: editPhone.trim()
      });

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-violet-500/15">
        <div>
          <div className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            STUDENT DASHBOARD
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Personal Profile &amp; Registrations
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-lg hover:bg-violet-900/60 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-[#171426] border border-violet-500/20 rounded-lg hover:text-white hover:border-violet-400 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Student Identity Card */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-[#171426] border border-violet-500/25 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-purple-600/20 border border-violet-500/40 flex items-center justify-center text-white text-2xl font-bold font-mono">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  user.full_name.charAt(0)
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white selectable-content">
                  {user.full_name}
                </h2>
                <div className="text-xs text-violet-400 font-mono">
                  {user.enrollment_number} · Div {user.division || '—'}
                </div>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-violet-950/40 transition-colors"
                title="Edit Profile"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Student Info Details */}
          <div className="space-y-3 font-mono text-xs border-t border-violet-500/15 pt-4">
            <div className="flex items-center justify-between py-1 border-b border-violet-500/10">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-violet-400" />
                <span>Email:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-200 selectable-content">{user.email}</span>
                {user.email_verified ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await sendVerificationEmail();
                      setEmailVerificationSent(true);
                      setTimeout(() => setEmailVerificationSent(false), 5000);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/30 hover:bg-amber-900/80 cursor-pointer"
                  >
                    {emailVerificationSent ? 'Link Dispatched' : 'Verify'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-violet-500/10">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-violet-400" />
                <span>Institution:</span>
              </span>
              <span className="text-slate-200">{user.college}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-violet-500/10">
              <span className="text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                <span>Branch:</span>
              </span>
              <span className="text-slate-200">{user.branch}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-violet-500/10">
              <span className="text-slate-500 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-violet-400" />
                <span>Academic Year:</span>
              </span>
              <span className="text-slate-200">{user.academic_year}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                <span>Account Created:</span>
              </span>
              <span className="text-slate-400">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="p-3 bg-violet-950/40 border border-violet-500/20 rounded-xl text-[11px] text-slate-400 leading-relaxed font-mono">
            <span className="text-violet-300 font-semibold flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Firebase Cloud Connected
            </span>
            Academic identity is securely persisted in Cloud Firestore and verified across BVM &amp; collegiate competition rosters.
          </div>
        </div>

        {/* Right Column: Edit Profile or Quick Overview */}
        <div className="lg:col-span-7">
          {isEditing ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-[#11101B] border border-violet-500/25 space-y-6">
              <div className="flex items-center justify-between border-b border-violet-500/15 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-violet-400" />
                  <span>Edit Student Information</span>
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {saveError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      College / Institution
                    </label>
                    <input
                      type="text"
                      value={editCollege}
                      onChange={(e) => setEditCollege(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Branch / Department
                    </label>
                    <input
                      type="text"
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Postgraduate">Postgraduate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Enrollment Number
                    </label>
                    <input
                      type="text"
                      value={editEnrollment}
                      onChange={(e) => setEditEnrollment(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white uppercase focus:outline-none focus:border-violet-400 selectable-content"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Division
                    </label>
                    <input
                      type="text"
                      value={editDivision}
                      onChange={(e) => setEditDivision(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 selectable-content"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <span>NEXORA Student Passport</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                Your profile authenticates your entries into NEXORA competitions, maintains verified submission reference numbers, and will later serve as your official credential for the NEXORA flagship technology festival.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/70 border border-violet-500/30 rounded-lg hover:bg-violet-900/60 transition-colors inline-flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Academic Credentials</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security & Passwords Management Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-violet-400" />
            <span>Security &amp; Passwords</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your separate account credentials and security authentication factors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1: NEXORA Account Password */}
          <div className="p-6 rounded-2xl bg-[#171426] border border-violet-500/20 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-violet-400">
                <User className="w-4 h-4" />
                <span className="font-semibold uppercase tracking-wider">Credential A</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                NEXORA Account Password
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your password for signing in to your NEXORA account. Managed by Firebase Authentication.
              </p>
            </div>

            <div className="pt-3 border-t border-violet-500/10 flex flex-wrap gap-2">
              <Link
                to="/forgot-password"
                className="px-3.5 py-2 text-xs font-semibold text-white bg-violet-600/40 border border-violet-500/30 rounded-lg hover:bg-violet-600 transition-colors"
              >
                Change Account Password
              </Link>
              <Link
                to="/forgot-password"
                className="px-3.5 py-2 text-xs text-slate-300 hover:text-white bg-white/5 rounded-lg border border-white/10 transition-colors"
              >
                Forgot Account Password?
              </Link>
            </div>
          </div>

          {/* CARD 2: Admin Security Password (Founder Only) */}
          {user && user.email?.toLowerCase().trim() === 'miteshpipaliya2202@gmail.com' && isAdmin && (
            <div className="p-6 rounded-2xl bg-[#171426] border border-violet-500/30 shadow-[0_0_20px_-5px_rgba(139,92,246,0.2)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <Shield className="w-4 h-4" />
                  <span className="font-semibold uppercase tracking-wider">Credential B — Founder Only</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Admin Security Password
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your separate security password for accessing the NEXORA Management Console. Protected with salted PBKDF2 cryptography.
                </p>
              </div>

              <div className="pt-3 border-t border-violet-500/10 flex flex-wrap gap-2">
                <Link
                  to="/admin"
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm"
                >
                  Change Admin Password
                </Link>
                <Link
                  to="/admin"
                  className="px-3.5 py-2 text-xs text-slate-300 hover:text-white bg-white/5 rounded-lg border border-white/10 transition-colors"
                >
                  Forgot Admin Password?
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registered Competitions Dashboard */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              My Competition Entries
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Verified registrations on file: {registrations.length}
            </p>
          </div>
          <Link
            to="/competitions"
            className="text-xs font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <span>Browse More Competitions</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingRegs ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500">
            Loading registrations...
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#11101B] border border-violet-500/20 text-center space-y-4">
            <Layers className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">No registrations recorded yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven&apos;t enrolled in any NEXORA challenges yet. Explore our four proposed competitions to get started!
            </p>
            <Link
              to="/competitions"
              className="inline-block px-5 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500"
            >
              Explore Competitions
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className="p-6 rounded-2xl bg-[#171426] border border-violet-500/25 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-violet-400 font-semibold selectable-content">
                      {reg.competition_id || reg.reference_id || reg.id}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 rounded text-[10px]">
                      {reg.registration_status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">
                    {reg.event_title}
                  </h3>

                  {reg.team_name && (
                    <div className="text-xs text-slate-300 font-mono">
                      <span className="text-slate-500">Team:</span> {reg.team_name}
                      {reg.team_members && reg.team_members.length > 1 && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Members: {reg.team_members.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 text-xs font-mono text-slate-400 space-y-1">
                    <div>Registered: {new Date(reg.created_at).toLocaleDateString()}</div>
                    <div>Institution: {reg.college} · {reg.branch}</div>
                    <div>Proposed Fee: ₹{reg.calculated_fee} ({reg.payment_status})</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-violet-500/15 flex items-center justify-between">
                  <Link
                    to={`/competitions/${reg.event_slug}`}
                    className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <span>View Competition Guide</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Confirmed Record
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
