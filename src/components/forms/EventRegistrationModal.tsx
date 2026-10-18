import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Users, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { CompetitionEvent, RegistrationRecord, TeamMemberDetail } from '../../types';
import { NexoraLogo } from '../ui/NexoraLogo';

interface EventRegistrationModalProps {
  event: CompetitionEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const EventRegistrationModal: React.FC<EventRegistrationModalProps> = ({
  event,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alreadyRegistered, setAlreadyRegistered] = useState<boolean>(false);
  const [checkingExisting, setCheckingExisting] = useState<boolean>(true);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('BVM');
  const [customCollege, setCustomCollege] = useState('');
  const [branch, setBranch] = useState('Electronics Engineering');
  const [academicYear, setAcademicYear] = useState('1st Year');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [division, setDivision] = useState('11');
  
  // Team states (for Hackathon or CTF)
  const isTeamEvent = event.slug === 'hackathon';
  const [participationType, setParticipationType] = useState<'Individual' | 'Team'>(
    event.slug === 'hackathon' ? 'Team' : 'Individual'
  );
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberDetail[]>([
    { name: '', college: 'BVM', branch: '', enrollment_number: '' },
    { name: '', college: 'BVM', branch: '', enrollment_number: '' },
    { name: '', college: 'BVM', branch: '', enrollment_number: '' }
  ]);

  // Consents
  const [agreeRules, setAgreeRules] = useState(false);
  const [agreeDataConsent, setAgreeDataConsent] = useState(false);

  // Submission Statuses
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedRecord, setConfirmedRecord] = useState<RegistrationRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Pre-fill user data and check existing registration
  useEffect(() => {
    if (!isOpen) {
      setConfirmedRecord(null);
      setErrorMessage(null);
      setCopiedId(false);
      return;
    }

    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhone(user.phone_number || '');
      setCollege(user.college || 'BVM');
      setBranch(user.branch || 'Electronics Engineering');
      setAcademicYear(user.academic_year || '1st Year');
      setEnrollmentNo(user.enrollment_number || '');
      setDivision(user.division || '11');

      setCheckingExisting(true);
      dataService.isUserRegisteredForEvent(user.id, event.slug)
        .then((exists) => {
          setAlreadyRegistered(exists);
        })
        .catch((err) => console.error(err))
        .finally(() => setCheckingExisting(false));
    } else {
      setCheckingExisting(false);
    }
  }, [isOpen, user, event.slug]);

  if (!isOpen) return null;

  // If user is not logged in, prompt to log in or register account first
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="w-full max-w-md bg-[#11101B] border border-violet-500/25 rounded-2xl p-6 text-center shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="mb-4 flex justify-center">
            <NexoraLogo size="sm" />
          </div>
          <div className="w-12 h-12 rounded-full bg-violet-950/80 border border-violet-500/30 flex items-center justify-center mx-auto mb-4 text-violet-300">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 user-select-none">Authentication Required</h3>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Please log in or create your student profile to register for <span className="text-violet-300 font-semibold">{event.title}</span>. Your registration and competition ID will be linked to your student record.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                onClose();
                navigate(`/login?redirect=/competitions/${event.slug}`);
              }}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors"
            >
              Sign In to Continue
            </button>
            <button
              onClick={() => {
                onClose();
                navigate(`/signup?redirect=/competitions/${event.slug}`);
              }}
              className="flex-1 py-2.5 px-4 text-xs font-medium text-slate-200 bg-[#171426] border border-violet-500/20 rounded-lg hover:border-violet-400 hover:text-white transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active college
  const activeCollege = college === 'Other' ? customCollege : college;

  // Active member count calculation (Uniform ₹50 per participant)
  const activeExtraMembers = teamMembers.filter((m) => m.name.trim().length > 0);
  const totalParticipants = isTeamEvent ? 1 + activeExtraMembers.length : 1;
  const calculatedTotalFee = totalParticipants * 50;

  const handleCopyId = (idToCopy: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(idToCopy).then(() => {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 3000);
      });
    }
  };

  const handleMemberChange = (index: number, field: keyof TeamMemberDetail, value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) return setErrorMessage('Full name is required.');
    if (!email.trim() || !email.includes('@')) return setErrorMessage('Valid email address is required.');
    if (!phone.trim() || phone.length < 8) return setErrorMessage('Valid mobile phone number is required.');
    if (college === 'Other' && !customCollege.trim()) return setErrorMessage('Please specify your institution name.');
    if (!branch.trim()) return setErrorMessage('Branch/department is required.');
    if (!enrollmentNo.trim()) return setErrorMessage('Enrollment number is required.');
    if (isTeamEvent && !teamName.trim()) return setErrorMessage('Team name is required for collaborative competitions.');
    if (!agreeRules) return setErrorMessage('You must review and agree to the competition rules.');
    if (!agreeDataConsent) return setErrorMessage('Consent to the registration data processing is required.');

    const teamNamesList = [fullName.trim(), ...activeExtraMembers.map((m) => m.name.trim())];
    const fullTeamDetailsList: TeamMemberDetail[] = [
      { name: fullName.trim(), college: activeCollege, branch: branch.trim(), enrollment_number: enrollmentNo.trim() },
      ...activeExtraMembers
    ];

    setSubmitting(true);
    try {
      const record = await dataService.createRegistration({
        event_slug: event.slug,
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phone.trim(),
        college: activeCollege,
        branch: branch.trim(),
        academic_year: academicYear as any,
        enrollment_number: enrollmentNo.trim().toUpperCase(),
        division: division.trim(),
        team_name: isTeamEvent ? teamName.trim() : undefined,
        team_members: isTeamEvent ? teamNamesList : undefined,
        team_member_details: isTeamEvent ? fullTeamDetailsList : undefined
      });
      setConfirmedRecord(record);
      setAlreadyRegistered(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#08080D] border border-violet-500/35 rounded-2xl shadow-2xl my-6 overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="p-6 border-b border-violet-500/20 bg-[#11101B]/90 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <NexoraLogo size="sm" />
              <span className="text-[11px] font-mono text-violet-400 bg-violet-950/80 px-2 py-0.5 rounded border border-violet-500/30">
                {event.category}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white user-select-none">
              Competition Registration
            </h2>
            <p className="text-xs text-slate-400 user-select-none">
              Complete your participant details to register for <strong className="text-violet-300 font-semibold">{event.title}</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-violet-950/40 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {checkingExisting ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400">
              Verifying student credentials...
            </div>
          ) : alreadyRegistered && !confirmedRecord ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-violet-900/40 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white user-select-none">
                You are already registered for this competition.
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Your entry for <span className="text-violet-300 font-semibold">{event.title}</span> has been saved. View your permanent Competition ID on your profile dashboard.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  to="/profile"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors"
                >
                  View My Registration
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-slate-300 bg-[#171426] border border-violet-500/20 rounded-lg hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          ) : confirmedRecord ? (
            /* Part 11: Official Registration Success Screen */
            <div className="py-4 space-y-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <div className="space-y-1">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold user-select-none">
                  REGISTRATION SUBMITTED SUCCESSFULLY
                </span>
                <h3 className="text-2xl font-bold text-white user-select-none">
                  {event.title}
                </h3>
              </div>

              {/* Prominent Generated Competition ID Card */}
              <div className="p-6 bg-[#11101B] border-2 border-violet-500/40 rounded-2xl max-w-md mx-auto space-y-4 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider user-select-none">
                  Your NEXORA Competition ID
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <div className="text-3xl font-extrabold tracking-widest text-violet-300 font-mono select-text selectable-content">
                    {confirmedRecord.competition_id}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyId(confirmedRecord.competition_id)}
                    className="p-2 rounded-lg bg-violet-950/80 text-violet-300 hover:text-white border border-violet-500/30 transition-colors"
                    title="Copy Competition ID"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copiedId && (
                  <div className="text-[11px] text-emerald-400 font-mono">
                    Copied Competition ID to clipboard!
                  </div>
                )}

                {/* Summary Metadata */}
                <div className="border-t border-violet-500/15 pt-3 space-y-2 text-left font-mono text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Participant:</span>
                    <span className="text-white font-medium select-text">{confirmedRecord.full_name}</span>
                  </div>
                  {confirmedRecord.team_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Team:</span>
                      <span className="text-violet-300 font-medium select-text">{confirmedRecord.team_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Institution:</span>
                    <span className="text-slate-200">{confirmedRecord.college}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registration Status:</span>
                    <span className="text-emerald-400 font-semibold">{confirmedRecord.registration_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registration Fee:</span>
                    <span className="text-violet-300 font-bold">₹{confirmedRecord.calculated_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Status:</span>
                    <span className="text-amber-400 font-medium">Unpaid (Awaiting Ratification)</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-sm mx-auto font-light leading-relaxed">
                Save your Competition ID for event entry verification. You can review all registrations at any time on your student dashboard.
              </p>

              <div className="flex justify-center gap-3">
                <Link
                  to="/profile"
                  onClick={onClose}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors shadow-md"
                >
                  View My Registrations
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-slate-300 bg-[#171426] border border-violet-500/20 rounded-lg hover:text-white"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Part 5: Compact, Organized Two-Column Registration Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Personal Information Group */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-violet-400 uppercase tracking-wider user-select-none font-semibold border-b border-violet-500/15 pb-1">
                  1. Personal Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Mitesh Pipaliya"
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="student@bvmengineering.ac.in"
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mobile Number (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information Group */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-violet-400 uppercase tracking-wider user-select-none font-semibold border-b border-violet-500/15 pb-1">
                  2. Academic Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      College Name *
                    </label>
                    <select
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400"
                    >
                      <option value="BVM">BVM (Birla Vishvakarma Mahavidyalaya)</option>
                      <option value="GCET">GCET (G H Patel College of Eng. &amp; Tech.)</option>
                      <option value="ADIT">ADIT (A D Patel Institute of Technology)</option>
                      <option value="CHARUSAT">CHARUSAT</option>
                      <option value="Other">Other Institution</option>
                    </select>
                  </div>

                  {college === 'Other' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Specify College Name *
                      </label>
                      <input
                        type="text"
                        value={customCollege}
                        onChange={(e) => setCustomCollege(e.target.value)}
                        required
                        placeholder="e.g. DDU Nadiad, MSU Baroda"
                        className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400 select-text"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Branch / Department *
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      required
                      placeholder="e.g. Electronics Engineering"
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Academic Year *
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400"
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
                      Enrollment Number *
                    </label>
                    <input
                      type="text"
                      value={enrollmentNo}
                      onChange={(e) => setEnrollmentNo(e.target.value)}
                      required
                      placeholder="e.g. 26EL309"
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white uppercase focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Division (Optional)
                    </label>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="e.g. 11"
                      className="w-full px-3 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-lg text-white focus:outline-none focus:border-violet-400 select-text"
                    />
                  </div>
                </div>
              </div>

              {/* Competition & Team Information Group */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-violet-400 uppercase tracking-wider user-select-none font-semibold border-b border-violet-500/15 pb-1">
                  3. Competition Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-medium text-slate-400 mb-1">Selected Challenge</span>
                    <div className="p-2.5 bg-[#11101B] border border-violet-500/20 rounded-lg text-xs font-bold text-white">
                      {event.title}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-slate-400 mb-1">Participation Type</span>
                    <div className="p-2.5 bg-[#11101B] border border-violet-500/20 rounded-lg text-xs text-slate-300">
                      {isTeamEvent ? 'Team (1–4 Members)' : 'Individual Challenge'}
                    </div>
                  </div>
                </div>

                {/* Team Details for Hackathon */}
                {isTeamEvent && (
                  <div className="p-4 bg-[#11101B] border border-violet-500/25 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                      <Users className="w-4 h-4" />
                      <span>Team Specifications (Leader: {fullName || 'You'})</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Team Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Quantum Innovators"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-[#08080D] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400 select-text"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] font-mono text-slate-400">
                        Additional Team Members (Leave blank if solo or smaller team):
                      </div>

                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="p-3 bg-[#08080D] rounded-lg border border-violet-500/15 space-y-2">
                          <div className="text-[11px] font-mono text-violet-400">
                            Member #{idx + 2} Details
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={teamMembers[idx].name}
                              onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                              className="px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white select-text"
                            />
                            <input
                              type="text"
                              placeholder="College"
                              value={teamMembers[idx].college}
                              onChange={(e) => handleMemberChange(idx, 'college', e.target.value)}
                              className="px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white select-text"
                            />
                            <input
                              type="text"
                              placeholder="Enrollment / Branch"
                              value={teamMembers[idx].enrollment_number}
                              onChange={(e) => handleMemberChange(idx, 'enrollment_number', e.target.value)}
                              className="px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white select-text"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Part 6: Uniform Fee Breakdown (₹50 per participant everywhere) */}
              <div className="p-4 bg-[#11101B] border border-violet-500/25 rounded-xl flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-slate-300 font-semibold block">Registration Fee Structure</span>
                  <span className="text-[11px] text-slate-400">
                    ₹50 per participant · {totalParticipants} {totalParticipants > 1 ? 'participants' : 'participant'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-violet-300">₹{calculatedTotalFee}</div>
                  <span className="text-[10px] text-slate-500 block">Unpaid (Pay Later)</span>
                </div>
              </div>

              {/* Confirmation Consents */}
              <div className="space-y-2 pt-2 border-t border-violet-500/15">
                <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeRules}
                    onChange={(e) => setAgreeRules(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-violet-500/30 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    I agree to the competition rules, academic integrity standards, and college conduct guidelines.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeDataConsent}
                    onChange={(e) => setAgreeDataConsent(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-violet-500/30 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    I consent to registration data processing solely for event administration in accordance with the{' '}
                    <Link to="/privacy" target="_blank" className="text-violet-400 underline inline-flex items-center gap-0.5">
                      Privacy Policy <ExternalLink className="w-2.5 h-2.5" />
                    </Link>.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-500 hover:to-purple-500 transition-all shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] disabled:opacity-50"
                >
                  {submitting ? 'Submitting Registration...' : `Complete Registration (₹${calculatedTotalFee})`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
