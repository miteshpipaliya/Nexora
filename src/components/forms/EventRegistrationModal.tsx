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
import { beginTestPayment } from '../../services/paymentCheckout';
import { CompetitionEvent, RegistrationRecord, TeamMemberDetail } from '../../types';
import { NexoraLogo } from '../ui/NexoraLogo';
import { RegistrationTicket } from '../common/RegistrationTicket';
import { IndianPhoneInput } from '../common/IndianPhoneInput';
import { validateIndianMobile, normalizeIndianMobile } from '../../shared/lib/phoneUtils';

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
  
  // Team states (e.g. BrainBattle requires 5 members; RoboRace 1–4; PathFinder 1–2; CTF 1–2)
  const maxTeamMembers = event.max_team_size ?? (
    event.slug === 'brainbattle' ? 5 :
    event.slug === 'roborace' ? 4 :
    event.slug === 'pathfinder' ? 2 :
    event.slug === 'ctf' ? 2 : 1
  );
  const minTeamMembers = event.min_team_size ?? (
    event.slug === 'brainbattle' ? 5 : 1
  );
  const isTeamEvent = maxTeamMembers > 1;
  const additionalSlotsCount = Math.max(0, maxTeamMembers - 1);

  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberDetail[]>([
    { name: '', college: 'BVM', branch: '', enrollment_number: '' },
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
  const [registrationCheckError, setRegistrationCheckError] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<RegistrationRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [existingRecord, setExistingRecord] = useState<RegistrationRecord | null>(null);

  // Pre-fill user data and check existing registration
  useEffect(() => {
    if (!isOpen) {
      setConfirmedRecord(null);
      setExistingRecord(null);
      setErrorMessage(null);
      setRegistrationCheckError(false);
      setCopiedId(false);
      return;
    }

    setAlreadyRegistered(false);
    setExistingRecord(null);
    setErrorMessage(null);
    setRegistrationCheckError(false);

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
      dataService.getUserRegistrations(user.id)
        .then((registrations) => {
          const found = registrations.find((record) => record.event_slug === event.slug && record.registration_status !== 'Cancelled') || null;
          setExistingRecord(found);
          setAlreadyRegistered(Boolean(found));
        })
        .catch((err) => {
          console.error('Could not verify prior competition registration:', err);
          setRegistrationCheckError(true);
          setErrorMessage('We could not verify your existing registration. Please retry before submitting.');
        })
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

  // Visual estimate only; backend always calculates the current fee from Firestore.
  const activeExtraMembers = teamMembers.filter((m) => m.name.trim().length > 0);
  const totalParticipants = isTeamEvent ? 1 + activeExtraMembers.length : 1;
  const calculatedTotalFee = totalParticipants * (Number(event.fee_per_participant) || 0);
  const requiresPayment = event.payment_enabled === true && calculatedTotalFee > 0;

  const payForRegistration = async (record: RegistrationRecord) => {
    if (paymentBusy) return;
    setPaymentBusy(true);
    setErrorMessage(null);
    try {
      const paid = await beginTestPayment(event.slug, record.full_name, record.email, record.phone_number);
      if (!paid.verified) throw new Error('Payment verification is incomplete.');
      const updated: RegistrationRecord = { ...record, payment_status: 'Verified', registration_status: 'Confirmed', fee_paid: record.calculated_fee, razorpay_order_id: paid.orderId, razorpay_payment_id: paid.paymentId };
      setConfirmedRecord(updated);
      setExistingRecord(updated);
      setAlreadyRegistered(true);
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Unable to verify payment. Please retry.'); }
    finally { setPaymentBusy(false); }
  };

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

    if (registrationCheckError) {
      setErrorMessage('We could not verify your existing registration. Please close and reopen this form to retry.');
      return;
    }

    if (event.isComingSoon) {
      return setErrorMessage('Registration is currently locked. This competition is Coming Soon.');
    }

    // Validation
    if (!fullName.trim()) return setErrorMessage('Full name is required.');
    if (!email.trim() || !email.includes('@')) return setErrorMessage('Valid email address is required.');
    const phoneValidation = validateIndianMobile(phone);
    if (!phoneValidation.valid) return setErrorMessage(phoneValidation.error || 'Valid 10-digit Indian mobile number is required.');
    if (college === 'Other' && !customCollege.trim()) return setErrorMessage('Please specify your institution name.');
    if (!branch.trim()) return setErrorMessage('Branch/department is required.');
    if (!enrollmentNo.trim()) return setErrorMessage('Enrollment number is required.');
    if (isTeamEvent && !teamName.trim()) return setErrorMessage('Team name is required for team competitions.');
    if (isTeamEvent && minTeamMembers > 1 && (1 + activeExtraMembers.length) < minTeamMembers) {
      return setErrorMessage(`${event.title} requires exactly ${minTeamMembers} team members (you must add ${minTeamMembers - 1} teammate${minTeamMembers - 1 > 1 ? 's' : ''}).`);
    }
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
        phone_number: normalizeIndianMobile(phone),
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
      setExistingRecord(record);
      setAlreadyRegistered(true);
      if (requiresPayment && record.payment_status !== 'Verified') {
        await payForRegistration(record);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full ${confirmedRecord ? "max-w-[870px]" : "max-w-2xl"} bg-[#08080D] border border-violet-500/35 rounded-2xl shadow-2xl my-6 overflow-hidden`}>
        
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
              {existingRecord && existingRecord.payment_status !== 'Verified' && event.payment_enabled === true && Number(event.fee_per_participant) > 0 && (
                <button type="button" disabled={paymentBusy} onClick={() => payForRegistration(existingRecord)}
                  className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold">
                  {paymentBusy ? 'Opening secure checkout...' : 'Complete Test Payment'}
                </button>
              )}
              {errorMessage && <p role="alert" className="text-xs text-red-300">{errorMessage}</p>}
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
            <div className="space-y-6 py-3 text-center">
              <div className="space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">{confirmedRecord.registration_status === 'Confirmed' ? 'Registration Confirmed!' : 'Registration Saved — Payment Pending'}</h3>
                <p className="text-xs text-slate-400">{confirmedRecord.payment_status === 'Verified' ? 'Test payment verified successfully. Your NEXORA entry is confirmed.' : 'Your entry is saved but is not confirmed until payment is verified.'}</p>
              </div>
              {confirmedRecord.registration_status === 'Confirmed' ? <RegistrationTicket registration={confirmedRecord} /> : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-5 py-4 text-sm text-amber-100">Your ticket will become available once test payment is captured and verified.</div>
              )}
              {requiresPayment && confirmedRecord.payment_status !== 'Verified' && (
                <button type="button" disabled={paymentBusy} onClick={() => payForRegistration(confirmedRecord)}
                  className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs">
                  {paymentBusy ? 'Processing test payment...' : 'Pay Securely (Test Mode)'}
                </button>
              )}
              {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
              <div className="flex justify-center flex-wrap gap-3">
                <Link to="/profile" onClick={onClose}
                  className="px-5 py-2.5 text-xs rounded-lg bg-violet-600 text-white font-semibold">
                  My Competition Entries
                </Link>
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 text-xs rounded-lg border border-violet-500/25 text-slate-300">
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
                    <IndianPhoneInput
                      id="event-reg-phone"
                      label="Mobile Number (WhatsApp)"
                      value={phone}
                      onChange={(canonical) => setPhone(canonical)}
                      required
                      placeholder="Enter 10-digit mobile number"
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
                      {isTeamEvent ? `Team (${minTeamMembers === maxTeamMembers ? `Exactly ${maxTeamMembers}` : `${minTeamMembers}–${maxTeamMembers}`} Members)` : 'Individual Challenge'}
                    </div>
                  </div>
                </div>

                {/* Team Details for Collaborative Competitions */}
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
                        {minTeamMembers > 1 ? `Additional Team Members (${minTeamMembers - 1} required):` : 'Additional Team Members (Leave blank if solo or smaller team):'}
                      </div>

                      {Array.from({ length: additionalSlotsCount }).map((_, idx) => (
                        <div key={idx} className="p-3 bg-[#08080D] rounded-lg border border-violet-500/15 space-y-2">
                          <div className="text-[11px] font-mono text-violet-400">
                            Member #{idx + 2} Details {idx < minTeamMembers - 1 ? '*' : '(Optional)'}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={teamMembers[idx]?.name || ''}
                              onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                              className="px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white select-text"
                            />
                            <input
                              type="text"
                              placeholder="College"
                              value={teamMembers[idx]?.college || ''}
                              onChange={(e) => handleMemberChange(idx, 'college', e.target.value)}
                              className="px-2.5 py-1.5 text-xs bg-[#11101B] border border-violet-500/20 rounded-md text-white select-text"
                            />
                            <input
                              type="text"
                              placeholder="Enrollment / Branch"
                              value={teamMembers[idx]?.enrollment_number || ''}
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
                    ₹{event.fee_per_participant} per participant · {totalParticipants} {totalParticipants > 1 ? 'participants' : 'participant'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-violet-300">₹{calculatedTotalFee}</div>
                  <span className="text-[10px] text-slate-500 block">{requiresPayment ? 'Razorpay Test Checkout' : 'No Online Payment'}</span>
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
                  {submitting ? 'Submitting Registration...' : `Save Registration (₹${calculatedTotalFee})`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
