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
  Trophy,
  Megaphone,
  MessageSquare,
  Send,
  Archive,
  Trash2,
  ExternalLink,
  Sparkles,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { 
  RegistrationRecord, 
  CompetitionEvent, 
  TeamMemberProfile, 
  InAppNotification, 
  ContactMessage, 
  RealDashboardStats, 
  SiteContent, 
  UserProfile,
  TeamMember,
  TeamRole,
  AcademicBranch,
  TeamDivision,
  TeamDepartment,
  ImageLibraryItem
} from '../../types';
import { NexoraLogo } from '../../components/ui/NexoraLogo';
import { LocalImageUploader } from '../../components/admin/LocalImageUploader';
import { ImageSelector } from '../../components/admin/ImageSelector';
import { ImageLibraryModal } from '../../components/admin/ImageLibraryModal';
import { PrizePoolEditor } from '../../components/admin/PrizePoolEditor';
import { FOUNDING_TEAM, INITIAL_EVENTS } from '../../services/mockData';

export const STANDARD_TEAM_ROLES = [
  {
    key: 'founder',
    role_name: 'Founder & Lead Architect',
    default_name: 'Mitesh Pipaliya',
    department_name: 'Platform Engineering & Architecture',
    academic_branch_name: 'Electronics Engineering',
    division: 'Division A',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    enrollment_number: '23EL001',
    bio: 'Pioneering student-led engineering innovation at BVM. Architecting high-performance web systems, competitive platforms, and multidisciplinary student technology ecosystems.',
    avatar_url: '/images/team/mitesh_founder.jpg',
    is_founder: true,
    display_order: 1
  },
  {
    key: 'tech_ops',
    role_name: 'Technical Operations Head',
    default_name: 'Technical Operations Lead',
    department_name: 'Platform Infrastructure & Cloud Systems',
    academic_branch_name: 'Information Technology',
    division: 'Division A',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    enrollment_number: '23IT042',
    bio: 'Oversees infrastructure deployment, sandbox evaluation environments, serverless endpoints, and high-availability contest telemetry.',
    avatar_url: '',
    is_founder: false,
    display_order: 2
  },
  {
    key: 'fullstack_lead',
    role_name: 'Full-Stack Engineering Lead',
    default_name: 'Engineering Lead',
    department_name: 'Web & Applications Engineering',
    academic_branch_name: 'Computer Engineering',
    division: 'Division B',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    enrollment_number: '23CP088',
    bio: 'Drives client and server-side feature implementations, real-time Firestore listeners, automated test coverage, and responsive frontend performance.',
    avatar_url: '',
    is_founder: false,
    display_order: 3
  },
  {
    key: 'event_coordinator',
    role_name: 'Event Coordinator',
    default_name: 'Lead Event Coordinator',
    department_name: 'Competition Operations & Logistics',
    academic_branch_name: 'Electronics & Communication',
    division: 'Division A',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    enrollment_number: '23EC015',
    bio: 'Coordinates contest schedules, rule compliance, venue logistics, live scoring desks, and participant onboarding across departments.',
    avatar_url: '',
    is_founder: false,
    display_order: 4
  },
  {
    key: 'design_director',
    role_name: 'Design & Creative Director',
    default_name: 'Creative Director',
    department_name: 'Design & Media Communications',
    academic_branch_name: 'Information Technology',
    division: 'Division A',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    enrollment_number: '23IT071',
    bio: 'Shapes the NEXORA visual identity, motion graphics, cyber-minimalist typography, digital credentials, and interactive student badges.',
    avatar_url: '',
    is_founder: false,
    display_order: 5
  },
  {
    key: 'pr_outreach',
    role_name: 'Public Relations & Outreach Head',
    default_name: 'Outreach & Campus Relations Head',
    department_name: 'Campus Partnerships & External Relations',
    academic_branch_name: 'Computer Engineering',
    division: 'Division A',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    enrollment_number: '23CP023',
    bio: 'Fosters intercollegiate partnerships across GCET, ADIT, and leading Gujarat engineering institutes while driving student engagement.',
    avatar_url: '',
    is_founder: false,
    display_order: 6
  },
  {
    key: 'faculty_guide',
    role_name: 'Faculty Member & Guide',
    default_name: 'Faculty Advisor & Mentor',
    department_name: 'Department of Electronics Engineering',
    academic_branch_name: 'Faculty Mentor',
    division: 'Faculty Advisory Council',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    enrollment_number: 'FACULTY-BVM-01',
    bio: 'Providing academic guidance, pedagogical alignment, institutional mentorship, and ethical oversight for NEXORA student technological initiatives.',
    avatar_url: '',
    is_founder: false,
    display_order: 7,
    faculty_designation: 'Associate Professor & Advisor',
    faculty_cabin: 'BVM Room 204, Main Building',
    faculty_research: 'VLSI Systems, Embedded Intelligence, Cloud Computing',
    faculty_office_hours: 'Monday – Friday: 03:00 PM – 05:00 PM'
  }
];

export const AdminPage: React.FC = () => {
  const { user, isAdmin, elevatedAdminVerified, setElevatedAdminVerified, refreshAdminClaim } = useAuth();

  // WP4: Refresh ID token on Admin page mount to check claims
  useEffect(() => {
    refreshAdminClaim(true);
  }, []);
  
  // Dashboard Tabs
  type AdminTab = 'overview' | 'competitions' | 'registrations' | 'students' | 'notifications' | 'messages' | 'content' | 'team' | 'audit';
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Core Data States (All Real Firestore Backed)
  const [realStats, setRealStats] = useState<RealDashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMeta, setTeamMeta] = useState<{
    roles: TeamRole[];
    branches: AcademicBranch[];
    divisions: TeamDivision[];
    departments: TeamDepartment[];
  }>({ roles: [], branches: [], divisions: [], departments: [] });
  const [teamSubTab, setTeamSubTab] = useState<'members' | 'roles' | 'branches' | 'departments' | 'divisions'>('members');
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState<boolean>(false);
  const [newTeamMemberData, setNewTeamMemberData] = useState<Partial<TeamMember>>({
    name: '',
    role_name: 'Executive Member',
    academic_branch_name: 'Electronics Engineering',
    division: 'Division A',
    department_name: 'Technical Operations',
    bio: '',
    avatar_url: '/images/team/mitesh_founder.jpg',
    enrollment_number: '',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    display_order: 10,
    is_featured: false,
    is_founder: false,
    enabled: true
  });
  const [showImageLibraryDirectModal, setShowImageLibraryDirectModal] = useState<boolean>(false);
  const [newMetaInput, setNewMetaInput] = useState<{ name: string; code?: string; description?: string }>({ name: '', code: '', description: '' });
  const [showAddMetaModal, setShowAddMetaModal] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Status check for Password B
  const [adminStatus, setAdminStatus] = useState<{
    initialized: boolean;
    founderEmail: string;
    maskedEmail: string;
    founderPhone: string;
    maskedPhone: string;
  } | null>(null);

  // Flow states: 'check' | 'setup' | 'password' | 'otp' | 'forgot_otp' | 'forgot_reset'
  const [authStep, setAuthStep] = useState<'check' | 'setup' | 'password' | 'otp' | 'forgot_otp' | 'forgot_reset'>('check');

  // Step 3 Setup inputs
  const [setupOtp, setSetupOtp] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [setupOtpSent, setSetupOtpSent] = useState(false);

  // Step 3 Password input
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordToken, setPasswordToken] = useState<string | null>(null);

  // Forgot password inputs
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

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

  // Action status toast
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showSuccessToast = (msg: string) => {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const showErrorToast = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  // Search & Filters for Registrations
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  // Search for Students
  const [studentSearch, setStudentSearch] = useState('');

  // Modals & Editing States
  const [selectedRecord, setSelectedRecord] = useState<RegistrationRecord | null>(null);
  const [editingEvent, setEditingEvent] = useState<CompetitionEvent | null>(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventData, setNewEventData] = useState<Partial<CompetitionEvent>>({
    title: '',
    slug: '',
    tagline: '',
    short_description: '',
    full_description: '',
    category: 'AI-Assisted Development',
    difficulty: 'All Skill Levels',
    status: 'Published',
    registration_open: true,
    isComingSoon: false,
    capacity: 60,
    fee_per_participant: 50,
    banner_image: '/images/competitions/zerocode.jpg',
    cover_image: '/images/competitions/zerocode.jpg',
    event_date: '',
    registration_deadline: '',
    venue: 'BVM Engineering College, Vallabh Vidyanagar',
    duration: '6 Hours',
    team_size: '1–4 Participants',
    min_team_size: 1,
    max_team_size: 4,
    eligibility: 'Open to all recognized engineering and polytechnic students.',
    prizes: { first_place: '₹2,000 Cash Prize', second_place: '₹1,000 Cash Prize', special_rewards: 'Certificates of Merit' },
    rules: ['Standard ethical engineering competition rules apply.', 'Teams must adhere to all instructions by the judges.'],
    judging_criteria: [{ label: 'Technical Execution', percentage: 50, description: 'Code quality and architecture' }],
    faq: [{ question: 'Who is eligible to participate?', answer: 'All engineering students across recognized colleges.' }]
  });

  // Website Content Editor State
  const [siteContent, setSiteContent] = useState<SiteContent>({
    tagline: 'THE BEGINNING OF BVM’S NEXT TECH ERA.',
    description: 'Where code meets creativity, curiosity becomes innovation, and students become builders of what’s next.',
    aboutHeading: 'NOT JUST A CLUB. THE BEGINNING OF BVM’S NEXT TECH ERA.',
    aboutMission: 'Unite students across branches and colleges to transform theoretical engineering knowledge into working products.',
    aboutVision: 'Establish an open, interdisciplinary, student-led innovation ecosystem across Gujarat.',
    announcement: 'Proposed platform schedule pending formal faculty council ratification.',
    contactEmail: 'nexora.bvm@gmail.com',
    contactPhone: '+91 8200243606'
  });
  const [savingContent, setSavingContent] = useState(false);

  // Notification Creation Modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [newNotification, setNewNotification] = useState<Partial<InAppNotification>>({
    title: '',
    message: '',
    category: 'Announcement',
    priority: 'Normal',
    audience: 'all',
    status: 'Published',
    link_url: '',
    link_text: 'Learn More',
    image_url: '',
    expires_at: ''
  });

  // Message Reply State
  const [replyingMessage, setReplyingMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'in-app' | 'email'>('email');
  const [sendingReply, setSendingReply] = useState(false);

  // Delete Confirmation Modal
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CompetitionEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

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

  // Real-time Subscriptions when Elevated
  useEffect(() => {
    if (!elevatedAdminVerified) return;

    // 1. Subscribe to events
    const unsubEvents = dataService.subscribeEvents((allEvents: CompetitionEvent[]) => {
      setEvents(allEvents);
    });

    // 2. Subscribe to registrations
    const unsubRegs = dataService.subscribeRegistrations((allRegs: RegistrationRecord[]) => {
      setRegistrations(allRegs);
    });

    // 3. Subscribe to notifications
    const unsubNotifs = dataService.subscribeNotifications('all', (allNotifs: InAppNotification[]) => {
      setNotifications(allNotifs);
    });

    // 4. Subscribe to contact messages
    const unsubMsgs = dataService.subscribeContactMessages((allMsgs: ContactMessage[]) => {
      setMessages(allMsgs);
    });

    // 5. Subscribe to site content
    const unsubContent = dataService.subscribeSiteContent((content: SiteContent) => {
      setSiteContent(content);
    });

    return () => {
      unsubEvents();
      unsubRegs();
      unsubNotifs();
      unsubMsgs();
      unsubContent();
    };
  }, [elevatedAdminVerified]);

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
    setStatsError(null);
    try {
      const [stats, allRegs, allEvents, allStudents, notifs, msgs, logs, tMembers, tMeta] = await Promise.all([
        dataService.getRealDashboardStats().catch((err: any) => {
          setStatsError(err.message || 'Could not fetch database stats');
          return null;
        }),
        dataService.getAllRegistrations().catch(() => []),
        dataService.getEvents().catch(() => []),
        dataService.getAllStudents().catch(() => []),
        dataService.getNotifications().catch(() => []),
        dataService.getContactMessages().catch(() => []),
        dataService.getAuditLogs().catch(() => []),
        dataService.getTeamMembers().catch(() => []),
        dataService.getTeamMeta().catch(() => ({ roles: [], branches: [], divisions: [], departments: [] }))
      ]);

      if (stats) setRealStats(stats);
      setRegistrations(allRegs);
      setEvents(allEvents);
      setStudents(allStudents);
      setNotifications(notifs);
      setMessages(msgs);
      setAuditLogs(logs);
      if (tMembers && tMembers.length > 0) setTeamMembers(tMembers);
      if (tMeta) setTeamMeta(tMeta);
    } catch (err: any) {
      console.warn('Dashboard load error:', err);
      setStatsError(err.message || 'Error communicating with Firestore.');
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

  // STEP 3: Verify Admin Security Password (Normal Future Logins)
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
      if (res.sessionToken) {
        setElevatedAdminVerified(true);
        setAuthSuccess('Elevated Administrator session granted.');
        loadDashboardData();
        return;
      }
      if (res.passwordToken) {
        setPasswordToken(res.passwordToken);
        setOtpTimeLeft(res.expiresInSeconds || 180);
        setResendCooldown(res.resendCooldown || 30);
        setOtpDigits(['', '', '', '', '', '']);
        setAuthStep('otp');
        setAuthSuccess(`Admin Password accepted. A fresh 6-digit verification code was sent to ${res.maskedEmail}.`);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect Admin Security Password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // FORGOT PASSWORD HANDLERS (PHASE 5)
  const handleStartForgotPassword = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await dataService.requestAdminPasswordResetOtp();
      setOtpTimeLeft(res.expiresInSeconds || 300);
      setResendCooldown(res.resendCooldown || 60);
      setForgotOtp('');
      setAuthStep('forgot_otp');
      setAuthSuccess(`Password reset code dispatched to ${res.maskedEmail}. Please enter the 6-digit code below.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to dispatch reset code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setAuthError('Please enter the 6-digit recovery code.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await dataService.verifyAdminPasswordResetOtp(forgotOtp.trim());
      setForgotResetToken(res.resetToken);
      setAuthStep('forgot_reset');
      setAuthSuccess('Verification code confirmed! You can now set a new Admin Security Password.');
    } catch (err: any) {
      setAuthError(err.message || 'Invalid or expired recovery code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCompleteForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword.length < 16) {
      setAuthError('New Admin Security Password must be at least 16 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await dataService.resetAdminPassword(forgotResetToken, forgotNewPassword, forgotConfirmPassword);
      setAuthSuccess(res.message || 'Admin Security Password updated successfully! Please sign in with your new password.');
      setAuthStep('password');
      setEnteredPassword('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotResetToken('');
      setForgotOtp('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to update Admin Security Password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Toggle Coming Soon directly on a competition card (Phase 4)
  const handleToggleComingSoon = async (ev: CompetitionEvent) => {
    const nextVal = !ev.isComingSoon;
    try {
      await dataService.updateCompetition(ev.slug, { isComingSoon: nextVal });
      showSuccessToast(`Competition "${ev.title}" Coming Soon is now ${nextVal ? 'ON (Overlay shown, registration locked)' : 'OFF (Active & Registerable)'}.`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update Coming Soon status.');
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
  const handleExportRegistrationsCsv = () => {
    const headers = [
      'Registration ID',
      'Reference ID',
      'Competition Title',
      'Competition Slug',
      'Participant Name',
      'Email',
      'Phone',
      'College',
      'Branch',
      'Academic Year',
      'Enrollment Number',
      'Team Name',
      'Participant Count',
      'Registration Status',
      'Payment Status',
      'Calculated Fee (INR)',
      'Timestamp'
    ];
    
    const rows = filteredRegistrations.map((r) => [
      r.id,
      r.competition_id || r.reference_id || '',
      `"${(r.event_title || '').replace(/"/g, '""')}"`,
      r.event_slug,
      `"${(r.full_name || '').replace(/"/g, '""')}"`,
      r.email,
      `"${r.phone_number || ''}"`,
      `"${(r.college || '').replace(/"/g, '""')}"`,
      `"${(r.branch || '').replace(/"/g, '""')}"`,
      r.academic_year,
      `"${r.enrollment_number || ''}"`,
      `"${(r.team_name || '').replace(/"/g, '""')}"`,
      r.participant_count || 1,
      r.registration_status,
      r.payment_status,
      r.calculated_fee ?? 0,
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

  // Export students to CSV
  const handleExportStudentsCsv = () => {
    const headers = ['User ID', 'Full Name', 'Email', 'College', 'Branch', 'Year', 'Enrollment Number', 'Division', 'Phone', 'Created At'];
    const rows = filteredStudents.map((s) => [
      s.id,
      `"${(s.full_name || '').replace(/"/g, '""')}"`,
      s.email,
      `"${(s.college || '').replace(/"/g, '""')}"`,
      `"${(s.branch || '').replace(/"/g, '""')}"`,
      s.academic_year,
      `"${s.enrollment_number || ''}"`,
      `"${s.division || ''}"`,
      `"${s.phone_number || ''}"`,
      s.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXORA_Student_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
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

  // COMPETITION CRUD ACTIONS
  const handleCreateCompetition = async () => {
    if (!newEventData.title?.trim()) {
      showErrorToast('Competition title is required.');
      return;
    }
    setLoading(true);
    try {
      const created = await dataService.createCompetition(newEventData);
      showSuccessToast(`Competition "${created.title}" successfully created and saved to Firestore!`);
      setShowNewEventModal(false);
      setNewEventData({
        title: '',
        slug: '',
        tagline: '',
        category: 'AI-Assisted Development',
        difficulty: 'All Skill Levels',
        status: 'Published',
        registration_open: true,
        capacity: 60,
        fee_per_participant: 50,
        banner_image: '/images/competitions/zerocode.jpg'
      });
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to create competition in database.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompetition = async () => {
    if (!editingEvent) return;
    setLoading(true);
    try {
      await dataService.updateCompetition(editingEvent.slug, editingEvent);
      showSuccessToast(`Competition "${editingEvent.title}" updated successfully! Changes are live across the website.`);
      setEditingEvent(null);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update competition.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (ev: CompetitionEvent) => {
    const willPublish = ev.status === 'Draft' || ev.status === 'Archived';
    try {
      await dataService.publishCompetition(ev.slug, willPublish);
      showSuccessToast(`Competition "${ev.title}" is now ${willPublish ? 'Published & Live' : 'Unpublished (Draft)'}.`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update publication status.');
    }
  };

  const handleArchiveCompetition = async (ev: CompetitionEvent) => {
    try {
      await dataService.archiveCompetition(ev.slug);
      showSuccessToast(`Competition "${ev.title}" archived. Participant records are permanently preserved.`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to archive competition.');
    }
  };

  const handleDeleteCompetition = async (ev: CompetitionEvent) => {
    setDeletingEvent(true);
    try {
      await dataService.deleteCompetition(ev.slug);
      showSuccessToast(`Competition "${ev.title}" deleted.`);
      setDeleteConfirmEvent(null);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Could not delete competition.');
    } finally {
      setDeletingEvent(false);
    }
  };

  // Quick Toggle Registration Count Display Mode ('capacity' vs 'count')
  const handleToggleRegistrationDisplay = async (ev: CompetitionEvent) => {
    const newMode = ev.registration_display_mode === 'count' ? 'capacity' : 'count';
    try {
      await dataService.updateCompetition(ev.slug, { registration_display_mode: newMode });
      showSuccessToast(`Registration counter for "${ev.title}" switched to ${newMode === 'count' ? 'Simple Count ("78 registered")' : 'Capacity View ("78 / 120 registered")'}.`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update registration display.');
    }
  };

  // Quick 1-Click Publish Prebuilt Draft Template
  const handleQuickPublishDraftTemplate = async (template: CompetitionEvent) => {
    setLoading(true);
    try {
      const existing = events.find(e => e.slug === template.slug || e.id === template.id);
      if (existing) {
        await dataService.publishCompetition(existing.slug, true);
        showSuccessToast(`Competition "${existing.title}" is now PUBLISHED & LIVE!`);
      } else {
        await dataService.createCompetition({
          ...template,
          status: 'Published',
          is_published: true,
          registration_open: true,
          isComingSoon: false
        });
        showSuccessToast(`Draft template "${template.title}" has been Published LIVE to the website!`);
      }
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to publish draft competition template.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Publish Standard Leadership Role
  const handlePublishStandardRole = async (roleDef: typeof STANDARD_TEAM_ROLES[0]) => {
    setLoading(true);
    try {
      const existing = teamMembers.find(m => m.role_key === roleDef.key || m.role_name === roleDef.role_name);
      if (existing) {
        const nextEnabled = existing.enabled === false;
        await dataService.updateTeamMember(existing.id, { enabled: nextEnabled });
        showSuccessToast(`Role "${roleDef.role_name}" is now ${nextEnabled ? 'LIVE on /team page' : 'DRAFT / HIDDEN'}.`);
      } else {
        const newMember: Partial<TeamMember> = {
          name: roleDef.default_name,
          role_key: roleDef.key,
          role_name: roleDef.role_name,
          academic_branch_name: roleDef.academic_branch_name,
          division: roleDef.division,
          department_name: roleDef.department_name,
          bio: roleDef.bio,
          avatar_url: roleDef.avatar_url || '/images/team/mitesh_founder.jpg',
          enrollment_number: roleDef.enrollment_number,
          institution: roleDef.institution,
          display_order: roleDef.display_order,
          is_founder: roleDef.is_founder || false,
          is_featured: roleDef.is_founder || false,
          enabled: true,
          ...(roleDef.faculty_designation ? {
            faculty_designation: roleDef.faculty_designation,
            faculty_cabin: roleDef.faculty_cabin,
            faculty_research: roleDef.faculty_research,
            faculty_office_hours: roleDef.faculty_office_hours
          } : {})
        };
        await dataService.createTeamMember(newMember);
        showSuccessToast(`Published "${roleDef.role_name}" profile LIVE to website!`);
      }
      await loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to publish role.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTeamMemberPublish = async (member: TeamMember) => {
    const nextVal = member.enabled === false;
    try {
      await dataService.updateTeamMember(member.id, { enabled: nextVal });
      showSuccessToast(`Profile "${member.name}" is now ${nextVal ? 'LIVE on /team page' : 'DRAFT / HIDDEN'}.`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update publishing status.');
    }
  };

  // NOTIFICATION ACTIONS
  const handleCreateNotification = async () => {
    if (!newNotification.title?.trim() || !newNotification.message?.trim()) {
      showErrorToast('Title and message are required.');
      return;
    }
    setLoading(true);
    try {
      await dataService.createNotification(newNotification);
      showSuccessToast('Announcement published successfully! Students will receive it in real-time.');
      setShowNotificationModal(false);
      setNewNotification({
        title: '',
        message: '',
        category: 'Announcement',
        priority: 'Normal',
        audience: 'all',
        status: 'Published',
        link_url: '',
        link_text: 'Learn More',
        image_url: ''
      });
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to publish notification.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await dataService.deleteNotification(id);
      showSuccessToast('Notification removed.');
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to delete notification.');
    }
  };

  // VISITOR MESSAGE REPLY
  const handleSendReply = async () => {
    if (!replyingMessage || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await dataService.replyToContactMessage(replyingMessage.id, replyText.trim(), replyChannel);
      showSuccessToast(
        replyChannel === 'email'
          ? `Reply dispatched via Brevo to ${replyingMessage.sender_email} and recorded in database.`
          : 'Reply recorded in database.'
      );
      setReplyingMessage(null);
      setReplyText('');
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  // TEAM CRUD ACTIONS (PHASE 5)
  const handleSaveTeamMember = async () => {
    if (!newTeamMemberData.name?.trim()) {
      showErrorToast('Member name is required.');
      return;
    }
    setLoading(true);
    try {
      if (editingTeamMember) {
        await dataService.updateTeamMember(editingTeamMember.id, newTeamMemberData);
        showSuccessToast(`Updated team member "${newTeamMemberData.name}"!`);
      } else {
        await dataService.createTeamMember(newTeamMemberData);
        showSuccessToast(`Added team member "${newTeamMemberData.name}"!`);
      }
      setShowTeamMemberModal(false);
      setEditingTeamMember(null);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to save team member.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeamMember = async (id: string, name: string) => {
    if (!window.confirm(`Delete team member "${name}"?`)) return;
    setLoading(true);
    try {
      await dataService.deleteTeamMember(id);
      showSuccessToast(`Deleted team member "${name}".`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to delete team member.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetaItem = async (type: 'role' | 'branch' | 'department' | 'division', itemData: any) => {
    setLoading(true);
    try {
      const updated = {
        roles: [...(teamMeta.roles || [])],
        branches: [...(teamMeta.branches || [])],
        divisions: [...(teamMeta.divisions || [])],
        departments: [...(teamMeta.departments || [])]
      };

      if (type === 'role') {
        const id = itemData.id || `role-${Date.now()}`;
        const existingIdx = updated.roles.findIndex((r) => r.id === id);
        if (existingIdx >= 0) updated.roles[existingIdx] = { ...updated.roles[existingIdx], ...itemData };
        else updated.roles.push({ id, name: itemData.name, display_order: updated.roles.length + 1, enabled: true, ...itemData });
      } else if (type === 'branch') {
        const id = itemData.id || `branch-${Date.now()}`;
        const existingIdx = updated.branches.findIndex((b) => b.id === id);
        if (existingIdx >= 0) updated.branches[existingIdx] = { ...updated.branches[existingIdx], ...itemData };
        else updated.branches.push({ id, name: itemData.name, code: itemData.code || 'BVM', display_order: updated.branches.length + 1, enabled: true, ...itemData });
      } else if (type === 'department') {
        const id = itemData.id || `dept-${Date.now()}`;
        const existingIdx = updated.departments.findIndex((d) => d.id === id);
        if (existingIdx >= 0) updated.departments[existingIdx] = { ...updated.departments[existingIdx], ...itemData };
        else updated.departments.push({ id, name: itemData.name, display_order: updated.departments.length + 1, enabled: true, ...itemData });
      } else if (type === 'division') {
        const id = itemData.id || `div-${Date.now()}`;
        const existingIdx = updated.divisions.findIndex((d) => d.id === id);
        if (existingIdx >= 0) updated.divisions[existingIdx] = { ...updated.divisions[existingIdx], ...itemData };
        else updated.divisions.push({ id, name: itemData.name, display_order: updated.divisions.length + 1, ...itemData });
      }

      await dataService.updateTeamMeta(updated);
      setTeamMeta(updated);
      showSuccessToast(`Organizational metadata saved!`);
      setShowAddMetaModal(false);
      setNewMetaInput({ name: '', code: '', description: '' });
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update organizational metadata.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMetaItem = async (type: 'role' | 'branch' | 'department' | 'division', id: string) => {
    if (!window.confirm('Delete this organizational item?')) return;
    setLoading(true);
    try {
      const updated = {
        roles: [...(teamMeta.roles || [])],
        branches: [...(teamMeta.branches || [])],
        divisions: [...(teamMeta.divisions || [])],
        departments: [...(teamMeta.departments || [])]
      };

      if (type === 'role') updated.roles = updated.roles.filter((r) => r.id !== id);
      if (type === 'branch') updated.branches = updated.branches.filter((b) => b.id !== id);
      if (type === 'department') updated.departments = updated.departments.filter((d) => d.id !== id);
      if (type === 'division') updated.divisions = updated.divisions.filter((d) => d.id !== id);

      await dataService.updateTeamMeta(updated);
      setTeamMeta(updated);
      showSuccessToast('Item removed.');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to remove item.');
    } finally {
      setLoading(false);
    }
  };

  // SAVE WEBSITE CONTENT
  const handleSaveSiteContent = async () => {
    setSavingContent(true);
    try {
      await dataService.updateSiteContent(siteContent);
      showSuccessToast('Website copy published! Homepage, hero, and mission statements updated live.');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to save website content to database.');
    } finally {
      setSavingContent(false);
    }
  };

  // UPDATE REGISTRATION STATUS
  const handleUpdatePaymentStatus = async (regId: string, status: any) => {
    try {
      await dataService.updatePaymentStatus(regId, status);
      showSuccessToast(`Payment status updated to ${status}.`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update payment status.');
    }
  };

  const handleUpdateRegistrationStatus = async (regId: string, status: any) => {
    try {
      await dataService.updateRegistrationStatus(regId, status);
      showSuccessToast(`Registration status updated to ${status}.`);
      loadDashboardData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update registration status.');
    }
  };

  // Filtered registrations
  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch = 
      (r.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.competition_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEvent = filterEvent === 'all' || r.event_slug === filterEvent;
    const matchesPayment = filterPayment === 'all' || r.payment_status === filterPayment;

    return matchesSearch && matchesEvent && matchesPayment;
  });

  // Filtered students
  const filteredStudents = students.filter((s) => {
    return (
      (s.full_name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.enrollment_number || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.branch || '').toLowerCase().includes(studentSearch.toLowerCase())
    );
  });

  // Calculate computed stats if realStats not loaded yet
  const displayStats = realStats || {
    totalStudents: students.length,
    activeStudents: students.filter((s) => {
      const lastActive = typeof s.last_active === 'number' ? s.last_active : 0;
      return Date.now() - lastActive < 15 * 60 * 1000;
    }).length,
    totalCompetitions: events.length,
    publishedCompetitions: events.filter((e) => e.status !== 'Draft' && e.status !== 'Archived').length,
    totalRegistrations: registrations.length,
    confirmedRegistrations: registrations.filter((r) => r.registration_status === 'Confirmed').length,
    actualTeamMembers: teamMembers.length,
    unreadVisitorMessages: messages.filter((m) => m.status === 'unread').length,
    publishedNotifications: notifications.filter((n) => n.status === 'Published').length,
    upcomingEvents: events.filter((e) => e.registration_open).length,
    totalRevenue: registrations.reduce((acc, r) => acc + (r.calculated_fee || 0), 0)
  };

  // ==========================================
  // VIEW: GATED IF NOT AUTHENTICATED AS FOUNDER
  // ==========================================
  if (!user || !isAdmin) {
    return (
      <div className="py-20 px-4 max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Administrator Access Required</h1>
        <p className="text-sm text-slate-300 leading-relaxed font-light">
          {user ? (
            <>
              Your account has no admin permission yet. Run{' '}
              <code className="text-violet-300 bg-violet-950/80 px-1.5 py-0.5 rounded font-mono text-xs border border-violet-500/30">
                npm run admin:claim -- {user.email}
              </code>
              , then sign out and sign in again.
            </>
          ) : (
            'Please sign in with an authorized administrator account to access this console.'
          )}
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md"
        >
          {user ? 'Sign Out & Sign In' : 'Sign In as Administrator'}
        </Link>
      </div>
    );
  }

  // ==========================================
  // VIEW: SECURITY VERIFICATION GATE (STEP 3 & 4)
  // ==========================================
  if (!elevatedAdminVerified) {
    return (
      <div className="py-16 px-4 max-w-lg mx-auto space-y-8 select-none">
        
        {/* Header Badge */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#171426] border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Founder Security Gate</h1>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Multi-layer elevated verification protects institutional data, competition specifications, and student privacy.
          </p>
        </div>

        {/* Security Progress */}
        <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-mono">
            <span>Identity Protocol:</span>
            <span className="text-white font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-mono">
            <span>Layer 1: Identity Token:</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-mono">
            <span>Layer 2: Admin Password:</span>
            <span className={passwordToken ? 'text-emerald-400 flex items-center gap-1 font-semibold' : 'text-amber-400'}>
              {passwordToken ? 'Validated' : 'Pending Entry'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-mono">
            <span>Layer 3: Brevo OTP:</span>
            <span className="text-slate-500">Dual Authorization</span>
          </div>
        </div>

        {/* Alert Messages */}
        {authError && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}
        {authSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{authSuccess}</span>
          </div>
        )}

        {/* ========================================================
            STEP 3 SETUP: INITIALIZE ADMIN SECURITY PASSWORD
        ======================================================== */}
        {authStep === 'setup' && (
          <form onSubmit={handleSetupPasswordSubmit} className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">One-Time Security Setup</span>
              <h3 className="text-base font-bold text-white">Create Admin Security Password</h3>
              <p className="text-xs text-slate-400">
                To protect student data, initialize a high-entropy Admin Security Password (minimum 16 characters).
              </p>
            </div>

            {!setupOtpSent ? (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleRequestSetupOtp}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Send Setup Verification Code to Founder Gmail</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter code sent to your Gmail"
                    value={setupOtp}
                    onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white font-mono text-sm tracking-widest text-center focus:outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">New Admin Security Password (Min 16 chars)</label>
                  <input
                    type="password"
                    placeholder="Minimum 16 characters"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Confirm Admin Security Password</label>
                  <input
                    type="password"
                    placeholder="Repeat exactly"
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Password &amp; Proceed to Authentication</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* ========================================================
            STEP 3: ENTER ADMIN SECURITY PASSWORD (NORMAL LOGINS)
        ======================================================== */}
        {authStep === 'password' && (
          <form onSubmit={handleVerifyPassword} className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-violet-400 uppercase tracking-wider block">Security Layer 2</span>
              <h3 className="text-base font-bold text-white">Enter Admin Security Password</h3>
              <p className="text-xs text-slate-400">
                Enter your configured Admin Security Password to unlock the administrative console.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  placeholder="Enter Admin Security Password"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Unlock Admin Console</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-violet-500/15 text-[11px] font-mono">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleStartForgotPassword}
                  className="text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                >
                  Forgot Password? Reset via Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setAuthStep('setup')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  First-Time Setup →
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================
            FORGOT PASSWORD: STEP 1 — ENTER 6-DIGIT EMAIL OTP
        ======================================================== */}
        {authStep === 'forgot_otp' && (
          <form onSubmit={handleVerifyForgotOtp} className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">Password Recovery</span>
              <h3 className="text-base font-bold text-white">Enter Recovery Code</h3>
              <p className="text-xs text-slate-400">
                A 6-digit recovery code has been dispatched via Brevo to founder email.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 bg-[#08080D] border border-violet-500/30 rounded-xl text-white font-mono text-lg tracking-widest text-center focus:outline-none focus:border-violet-400"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || forgotOtp.length !== 6}
                className="w-full py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Verify Recovery Code</span>
              </button>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-violet-500/15">
                <button
                  type="button"
                  onClick={() => setAuthStep('password')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  &larr; Back to Login
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || authLoading}
                  onClick={handleStartForgotPassword}
                  className="text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================
            FORGOT PASSWORD: STEP 2 — SET NEW ADMIN PASSWORD
        ======================================================== */}
        {authStep === 'forgot_reset' && (
          <form onSubmit={handleCompleteForgotReset} className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Authorized Recovery</span>
              <h3 className="text-base font-bold text-white">Create New Admin Password</h3>
              <p className="text-xs text-slate-400">
                Enter your new Admin Security Password (minimum 16 characters).
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">New Password (Min 16 chars)</label>
                <input
                  type="password"
                  placeholder="Enter at least 16 characters"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Save New Password &amp; Unlock</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthStep('password')}
                  className="text-[11px] font-mono text-slate-400 hover:text-white"
                >
                  Cancel Recovery
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================
            STEP 4: ENTER 6-DIGIT GMAIL OTP
        ======================================================== */}
        {authStep === 'otp' && (
          <form onSubmit={handleVerifyAdminOtp} className="p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-5 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-violet-400 uppercase tracking-wider block">Security Layer 3</span>
              <h3 className="text-base font-bold text-white">Enter Gmail Verification Code</h3>
              <p className="text-xs text-slate-400">
                A 6-digit verification code was dispatched to founder Gmail.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-slate-400">Expires in:</span>
              <span className="text-violet-300 font-bold">{formatTimer(otpTimeLeft)}</span>
            </div>

            {/* 6 Individual Digit Boxes */}
            <div className="flex justify-center items-center gap-2 py-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && idx > 0) {
                      otpInputRefs.current[idx - 1]?.focus();
                    }
                  }}
                  className="w-10 h-12 text-center font-mono text-xl font-bold bg-[#08080D] border border-violet-500/30 rounded-xl text-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Authorize Administrator Session</span>
            </button>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-violet-500/15">
              <button
                type="button"
                onClick={() => setAuthStep('password')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Back to Password
              </button>
              <button
                type="button"
                disabled={resendCooldown > 0 || authLoading}
                onClick={handleResendAdminOtp}
                className="text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: ELEVATED ADMIN CONSOLE
  // ==========================================
  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Top Founder Navigation & Session Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#171426] border border-violet-500/25 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">NEXORA Founder Console</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Firestore Synced
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Signed in as Founder ({user.email}) · Session expires in: <span className="text-violet-300 font-bold">{formatTimer(sessionRemaining)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-mono text-slate-300 bg-[#11101B] border border-violet-500/20 rounded-xl hover:text-white hover:border-violet-400 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={handleLockPanel}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600/90 hover:bg-red-500 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toasts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-red-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Database Error Banner if Firestore uncontactable */}
      {statsError && (
        <div className="p-4 bg-amber-950/50 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Firestore Connectivity Note: {statsError}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-mono text-[11px]"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Navigation Tabs (All 9 Management Hubs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-violet-500/15">
        {[
          { id: 'overview', label: 'Metrics', icon: Activity },
          { id: 'competitions', label: `Competitions (${events.length})`, icon: Trophy },
          { id: 'registrations', label: `Registrations (${registrations.length})`, icon: FileText },
          { id: 'students', label: `Students (${students.length})`, icon: UserCheck },
          { id: 'notifications', label: `Broadcasts (${notifications.length})`, icon: Megaphone },
          { id: 'messages', label: `Visitor Inbox (${messages.filter(m => m.status === 'unread').length} unread)`, icon: MessageSquare },
          { id: 'content', label: 'Website CMS', icon: Globe },
          { id: 'team', label: `Team Roles (${teamMembers.length})`, icon: Users },
          { id: 'audit', label: 'Audit Log', icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-3.5 py-2.5 text-xs font-medium rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
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
          TAB 1: PRIORITY 1 — REAL DATABASE METRICS (ZERO WHEN ZERO)
      ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Authoritative Platform Metrics</h2>
            <p className="text-xs text-slate-400">Directly aggregated from Firestore collections. No hardcoded or fabricated statistics.</p>
          </div>

          {/* 10 Required Real Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* 1. Total Registered Students */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">1. Total Students</span>
              <div className="text-2xl font-extrabold text-white">
                {displayStats.totalStudents}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Firestore 'users' count</span>
            </div>

            {/* 2. Active Students */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">2. Active Students</span>
              <div className="text-2xl font-extrabold text-emerald-400 flex items-center gap-2">
                <span>{displayStats.activeStudents}</span>
                {displayStats.activeStudents > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono">Past 15m heartbeat</span>
            </div>

            {/* 3. Total Competitions */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">3. Total Events</span>
              <div className="text-2xl font-extrabold text-violet-300">
                {displayStats.totalCompetitions}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Events in catalog</span>
            </div>

            {/* 4. Published Competitions */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">4. Published</span>
              <div className="text-2xl font-extrabold text-purple-300">
                {displayStats.publishedCompetitions}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Live on public site</span>
            </div>

            {/* 5. Total Registrations */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">5. Registrations</span>
              <div className="text-2xl font-extrabold text-amber-300">
                {displayStats.totalRegistrations}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Actual participant records</span>
            </div>

            {/* 6. Confirmed Registrations */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">6. Confirmed</span>
              <div className="text-2xl font-extrabold text-emerald-300">
                {displayStats.confirmedRegistrations}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Verified seat allocations</span>
            </div>

            {/* 7. Actual Team Members */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">7. Team Members</span>
              <div className="text-2xl font-extrabold text-indigo-300">
                {displayStats.actualTeamMembers}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Leadership profiles</span>
            </div>

            {/* 8. Unread Visitor Messages */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">8. Unread Inquiries</span>
              <div className="text-2xl font-extrabold text-rose-300">
                {displayStats.unreadVisitorMessages}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Contact form submissions</span>
            </div>

            {/* 9. Published Notifications */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">9. Broadcasts</span>
              <div className="text-2xl font-extrabold text-sky-300">
                {displayStats.publishedNotifications}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Active announcements</span>
            </div>

            {/* 10. Upcoming Events */}
            <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">10. Open Events</span>
              <div className="text-2xl font-extrabold text-teal-300">
                {displayStats.upcomingEvents}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Registration active</span>
            </div>
          </div>

          {/* Quick Hub Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-violet-400" />
                <span>Competitions CRUD</span>
              </h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Create new flagship competitions, edit specifications, publish/unpublish, archive, or upload cover images from laptop.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('competitions')}
                className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-xl hover:text-white transition-colors cursor-pointer"
              >
                Manage Competitions &rarr;
              </button>
            </div>

            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-violet-400" />
                <span>Broadcast Center</span>
              </h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Publish platform updates, schedule changes, or competition announcements directly to student notification bells.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-xl hover:text-white transition-colors cursor-pointer"
              >
                Broadcast Center &rarr;
              </button>
            </div>

            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-400" />
                <span>Website Copy CMS</span>
              </h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Update homepage tagline, lead description, announcement banner, mission and vision statements dynamically.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className="px-4 py-2 text-xs font-medium text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-xl hover:text-white transition-colors cursor-pointer"
              >
                Edit Website CMS &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PRIORITY 2 & 3 — COMPLETE COMPETITION CRUD
      ======================================================== */}
      {activeTab === 'competitions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">Competitions Portfolio Management</h2>
                <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg border ${
                  events.length >= 15
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    : 'bg-violet-950/80 text-violet-300 border-violet-500/30'
                }`}>
                  {events.length} / 15 Competitions
                </span>
              </div>
              <p className="text-xs text-slate-400">All changes write directly to Firestore. Real-time updates propagate across NEXORA immediately.</p>
            </div>
            <button
              type="button"
              disabled={events.length >= 15}
              onClick={() => setShowNewEventModal(true)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors shadow-md flex items-center gap-1.5 shrink-0 ${
                events.length >= 15
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'text-white bg-violet-600 hover:bg-violet-500 cursor-pointer'
              }`}
              title={events.length >= 15 ? 'Maximum limit of 15 competitions reached.' : 'Create New Competition'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Competition</span>
            </button>
          </div>

          {/* Prebuilt Draft Competitions Quick Launch Tray */}
          <div className="p-5 bg-gradient-to-br from-[#1c1433] to-[#141026] border border-violet-500/40 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-violet-500/20 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                    Prebuilt Draft Competition Templates
                  </h3>
                </div>
                <p className="text-xs text-slate-300 font-light">
                  Pre-configured flagship technical challenges ready for 1-click publishing or custom edits.
                </p>
              </div>
              <span className="text-[11px] font-mono text-violet-300 bg-violet-950/80 px-2.5 py-1 rounded-md border border-violet-500/30">
                10 Official Templates Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {INITIAL_EVENTS.map((tpl) => {
                const existingInDb = events.find((e) => e.slug === tpl.slug || e.id === tpl.id);
                const isLive = existingInDb && (existingInDb.status === 'Published' || existingInDb.status === 'Open');

                return (
                  <div
                    key={tpl.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                      isLive
                        ? 'bg-emerald-950/20 border-emerald-500/30 shadow-sm'
                        : 'bg-[#11101B] border-violet-500/20 hover:border-violet-500/40'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate" title={tpl.title}>
                          {tpl.title}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-semibold ${
                          isLive
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isLive ? 'LIVE' : 'DRAFT'}
                        </span>
                      </div>
                      <div className="text-[10px] text-violet-400 font-mono truncate">{tpl.category}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Cap: {tpl.capacity} seats · ₹{tpl.fee_per_participant}</div>
                    </div>

                    <div className="pt-2 border-t border-violet-500/15 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickPublishDraftTemplate(tpl)}
                        className={`flex-1 py-1.5 px-2 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          isLive
                            ? 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        }`}
                        title={isLive ? 'Currently Live on public website' : 'Click to instantly publish this competition live'}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isLive ? 'Published' : 'Go Live'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(existingInDb || tpl);
                        }}
                        className="py-1.5 px-2 text-[10px] font-mono text-violet-300 hover:text-white bg-violet-950/70 border border-violet-500/30 rounded-lg cursor-pointer"
                        title="Edit competition information before publishing"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {events.length === 0 ? (
            <div className="p-12 bg-[#171426] border border-violet-500/20 rounded-2xl text-center space-y-3">
              <Trophy className="w-10 h-10 text-violet-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Competitions Created Yet</h3>
              <p className="text-xs text-slate-400">Click &quot;Go Live&quot; on any prebuilt template above to activate your first flagship challenge in Firestore.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((ev) => {
                const isPublished = ev.status === 'Published' || ev.status === 'Open';
                const isArchived = ev.status === 'Archived';
                const imageSrc = ev.cover_image || ev.banner_image || '/images/competitions/zerocode.jpg';
                const isSimpleCount = ev.registration_display_mode === 'count';

                return (
                  <div
                    key={ev.id}
                    className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isArchived
                        ? 'bg-[#11101B]/80 border-slate-800 opacity-70'
                        : isPublished
                        ? 'bg-[#171426] border-violet-500/25 shadow-lg'
                        : 'bg-[#171426]/70 border-amber-500/25'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <img
                          src={imageSrc}
                          alt={ev.title}
                          className="w-20 h-20 rounded-xl object-cover border border-violet-500/30 shrink-0 bg-black/40"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/competitions/zerocode.jpg';
                          }}
                        />
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-white truncate">{ev.title}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                              isPublished
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30 font-semibold'
                                : isArchived
                                ? 'bg-slate-900 text-slate-400 border-slate-700'
                                : 'bg-amber-950 text-amber-300 border-amber-500/30 font-semibold'
                            }`}>
                              {ev.status}
                            </span>
                            {ev.isComingSoon && (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded border bg-purple-950 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse">
                                COMING SOON
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-violet-400 truncate">{ev.tagline}</p>
                          <p className="text-[11px] font-mono text-slate-400">Slug: /competitions/{ev.slug}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {ev.description || ev.short_description}
                      </p>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-[#11101B] rounded-xl text-center font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Fee</span>
                          <span className="text-white font-bold">{ev.fee_per_participant === 0 ? 'Free' : `₹${ev.fee_per_participant}`}</span>
                        </div>

                        {/* Registration Display Toggle Card */}
                        <div
                          onClick={() => handleToggleRegistrationDisplay(ev)}
                          className="cursor-pointer group hover:bg-violet-950/40 rounded-lg p-1 transition-colors border border-transparent hover:border-violet-500/30"
                          title="Click to toggle between: Capacity View ('78 / 120 registered') vs Simple View ('78 registered')"
                        >
                          <span className="text-[10px] text-slate-500 uppercase flex items-center justify-center gap-1">
                            <span>Registered</span>
                            <span className="text-[9px] text-violet-400 font-bold group-hover:text-white">⇄ Toggle</span>
                          </span>
                          <span className="text-violet-300 font-bold block mt-0.5">
                            {isSimpleCount
                              ? `${ev.registered_count || 0} registered`
                              : `${ev.registered_count || 0} / ${ev.capacity}`}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Registration</span>
                          <span className={`font-bold ${ev.isComingSoon ? 'text-purple-400' : ev.registration_open ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {ev.isComingSoon ? 'Coming Soon' : ev.registration_open ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-violet-500/15 flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/competitions/${ev.slug}`}
                        className="text-xs text-violet-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <span>View Public Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      <div className="flex items-center gap-2">
                        {/* Coming Soon ON / OFF Quick Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleComingSoon(ev)}
                          title="Toggle Coming Soon overlay & registration lock"
                          className={`px-2.5 py-1.5 text-xs font-mono rounded-lg transition-colors border cursor-pointer ${
                            ev.isComingSoon
                              ? 'bg-purple-950 text-purple-300 border-purple-500/40 shadow-sm font-bold'
                              : 'bg-[#11101B] text-slate-400 hover:text-white border-violet-500/20'
                          }`}
                        >
                          {ev.isComingSoon ? 'Coming Soon: ON' : 'Coming Soon: OFF'}
                        </button>

                        {/* Publish / Go Live or Unpublish Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(ev)}
                          className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors border cursor-pointer ${
                            isPublished
                              ? 'bg-[#11101B] text-slate-300 hover:text-white border-violet-500/20'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm border-emerald-400'
                          }`}
                          title={isPublished ? 'Unpublish to Draft' : 'Publish & Make Live immediately'}
                        >
                          {isPublished ? 'Unpublish' : 'Publish / Go Live'}
                        </button>

                        {/* Archive button */}
                        {!isArchived && (
                          <button
                            type="button"
                            onClick={() => handleArchiveCompetition(ev)}
                            title="Preserve student registrations but hide from public listing"
                            className="px-2.5 py-1.5 text-xs font-mono rounded-lg transition-colors border bg-[#11101B] text-amber-300 hover:text-white border-amber-500/20 cursor-pointer"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        )}

                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={() => setEditingEvent(ev)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors shadow-sm cursor-pointer"
                        >
                          Edit
                        </button>

                        {/* Delete with verification */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmEvent(ev)}
                          className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/20 rounded-lg cursor-pointer"
                          title="Delete competition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: PRIORITY 10 — REGISTRATIONS MANAGEMENT WITH CSV EXPORT
      ======================================================== */}
      {activeTab === 'registrations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Participant Registrations</h2>
              <p className="text-xs text-slate-400">Total verified participant records in Firestore: <span className="text-white font-bold">{registrations.length}</span></p>
            </div>
            <button
              type="button"
              onClick={handleExportRegistrationsCsv}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All to CSV ({filteredRegistrations.length})</span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, email, or ID..."
                className="w-full pl-10 pr-4 py-2 bg-[#171426] border border-violet-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
              />
            </div>

            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="px-3.5 py-2 bg-[#171426] border border-violet-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400 cursor-pointer"
            >
              <option value="all">All Competitions</option>
              {events.map((ev) => (
                <option key={ev.slug} value={ev.slug}>{ev.title}</option>
              ))}
            </select>

            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-3.5 py-2 bg-[#171426] border border-violet-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400 cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Exempt">Exempt</option>
            </select>
          </div>

          {/* Registrations Table */}
          {filteredRegistrations.length === 0 ? (
            <div className="p-12 bg-[#171426] border border-violet-500/20 rounded-2xl text-center space-y-2">
              <FileText className="w-8 h-8 text-violet-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Registrations Matching Filters</h3>
              <p className="text-xs text-slate-400">Try adjusting your search criteria or clearing filters.</p>
            </div>
          ) : (
            <div className="bg-[#171426] border border-violet-500/20 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#11101B] border-b border-violet-500/20 font-mono text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Participant ID</th>
                      <th className="py-3 px-4">Student &amp; Email</th>
                      <th className="py-3 px-4">Competition</th>
                      <th className="py-3 px-4">Academic Details</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Registration</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-500/10 text-slate-300">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-violet-950/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-violet-300 font-semibold select-text">
                          {reg.competition_id || reg.reference_id || reg.id.slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 select-text">
                          <div className="font-semibold text-white">{reg.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{reg.email}</div>
                          {reg.phone_number && <div className="text-[10px] text-slate-500 font-mono">{reg.phone_number}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {reg.event_title || reg.event_slug}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white">{reg.college}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{reg.branch} · {reg.academic_year}</div>
                          {reg.enrollment_number && <div className="text-[10px] text-violet-400 font-mono">{reg.enrollment_number}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {reg.team_name ? (
                            <div>
                              <span className="text-amber-300 font-semibold">{reg.team_name}</span>
                              <span className="text-slate-500 block">{reg.participant_count || 1} members</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Individual</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={reg.registration_status}
                            onChange={(e) => handleUpdateRegistrationStatus(reg.id, e.target.value)}
                            className="bg-[#08080D] border border-violet-500/30 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-violet-400 cursor-pointer"
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="Pending Review">Pending Review</option>
                            <option value="Waitlisted">Waitlisted</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={reg.payment_status}
                            onChange={(e) => handleUpdatePaymentStatus(reg.id, e.target.value)}
                            className={`border rounded-lg px-2 py-1 text-[11px] focus:outline-none cursor-pointer ${
                              reg.payment_status === 'Verified'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                                : reg.payment_status === 'Pending Verification'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                                : 'bg-[#08080D] text-slate-300 border-violet-500/30'
                            }`}
                          >
                            <option value="Verified">Verified</option>
                            <option value="Pending Verification">Pending Verification</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Exempt">Exempt</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(reg)}
                            className="p-1.5 text-violet-300 hover:text-white bg-violet-950/60 border border-violet-500/30 rounded-lg cursor-pointer"
                            title="View Full Registration Record"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: PRIORITY 10 — REAL STUDENT DIRECTORY
      ======================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Verified Student Directory</h2>
              <p className="text-xs text-slate-400">Total registered student profiles in Firestore: <span className="text-white font-bold">{students.length}</span></p>
            </div>
            <button
              type="button"
              onClick={handleExportStudentsCsv}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Students to CSV ({filteredStudents.length})</span>
            </button>
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by student name, email, or enrollment no..."
              className="w-full pl-10 pr-4 py-2 bg-[#171426] border border-violet-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-12 bg-[#171426] border border-violet-500/20 rounded-2xl text-center space-y-2">
              <UserCheck className="w-8 h-8 text-violet-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Students Found</h3>
              <p className="text-xs text-slate-400">Students who sign up on NEXORA will appear in this directory automatically.</p>
            </div>
          ) : (
            <div className="bg-[#171426] border border-violet-500/20 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#11101B] border-b border-violet-500/20 font-mono text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Institution</th>
                      <th className="py-3 px-4">Branch &amp; Year</th>
                      <th className="py-3 px-4">Enrollment Number</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-500/10 text-slate-300">
                    {filteredStudents.map((s) => {
                      const lastActive = typeof s.last_active === 'number' ? s.last_active : 0;
                      const isOnline = Date.now() - lastActive < 15 * 60 * 1000;
                      return (
                        <tr key={s.id} className="hover:bg-violet-950/20 transition-colors">
                          <td className="py-3 px-4 select-text">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{s.full_name}</span>
                              {s.is_admin && <span className="px-1.5 py-0.2 text-[9px] font-mono bg-violet-950 text-violet-300 border border-violet-500/30 rounded">Admin</span>}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
                          </td>
                          <td className="py-3 px-4">{s.college}</td>
                          <td className="py-3 px-4 font-mono">{s.branch} · {s.academic_year}</td>
                          <td className="py-3 px-4 font-mono text-violet-300 select-text">{s.enrollment_number || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-full ${
                              isOnline
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-900 text-slate-400 border border-slate-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                              {isOnline ? 'Active' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: PRIORITY 6 — BROADCAST NOTIFICATIONS CENTER
      ======================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Notification &amp; Announcement Broadcast Center</h2>
              <p className="text-xs text-slate-400">Publish notices directly to all student browsers and navigation bells in real time.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNotificationModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Broadcast Announcement</span>
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="p-12 bg-[#171426] border border-violet-500/20 rounded-2xl text-center space-y-3">
              <Megaphone className="w-10 h-10 text-violet-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Announcements Published Yet</h3>
              <p className="text-xs text-slate-400">Click &quot;Broadcast Announcement&quot; to notify all students of schedules, venues, or deadlines.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-5 bg-[#171426] border border-violet-500/25 rounded-2xl space-y-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 select-text">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-violet-950 text-violet-300 border border-violet-500/30">
                        {n.category}
                      </span>
                      {n.priority === 'Urgent' && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono bg-red-950 text-red-300 border border-red-500/30 rounded font-bold">
                          Urgent
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{n.title}</h3>
                    <p className="text-xs text-slate-300 font-light leading-relaxed">{n.message}</p>
                    {n.link_url && (
                      <a href={n.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-mono text-violet-400 hover:text-violet-300">
                        <span>{n.link_text || 'Open Link'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteNotification(n.id)}
                      className="p-2 text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/20 rounded-lg cursor-pointer"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 6: PRIORITY 7 — VISITOR MESSAGES & CONTACT INBOX
      ======================================================== */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Visitor Inquiries &amp; Contact Inbox</h2>
            <p className="text-xs text-slate-400">Messages sent via the contact form. Reply directly via in-app storage or Brevo email.</p>
          </div>

          {messages.length === 0 ? (
            <div className="p-12 bg-[#171426] border border-violet-500/20 rounded-2xl text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-violet-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Inquiries Received</h3>
              <p className="text-xs text-slate-400">Visitor messages and student inquiries will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-5 rounded-2xl border transition-colors space-y-3 ${
                    m.status === 'unread'
                      ? 'bg-[#171426] border-violet-500/40 shadow-lg'
                      : 'bg-[#171426]/60 border-violet-500/15'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-text">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{m.sender_name}</span>
                      <span className="text-xs font-mono text-slate-400">({m.sender_email})</span>
                      <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                        m.status === 'unread'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{new Date(m.created_at).toLocaleString()}</span>
                  </div>

                  <div className="text-xs text-slate-300 bg-[#11101B] p-3 rounded-xl border border-violet-500/15 leading-relaxed select-text">
                    <div className="font-semibold text-white mb-1 font-mono">{m.subject || 'Inquiry'}</div>
                    <p className="font-light">{m.message}</p>
                  </div>

                  {m.replies && m.replies.length > 0 && (
                    <div className="pl-4 border-l-2 border-violet-500/30 space-y-2 pt-1">
                      {m.replies.map((r) => (
                        <div key={r.id} className="text-xs text-slate-300 bg-[#08080D] p-2.5 rounded-lg border border-violet-500/10 space-y-1 select-text">
                          <div className="flex items-center justify-between text-[10px] font-mono text-violet-400">
                            <span>{r.sender_name} ({r.channel})</span>
                            <span className="text-slate-500">{new Date(r.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p>{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingMessage(m);
                        setReplyText('');
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Send className="w-3 h-3" />
                      <span>Reply to Inquiry</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 7: PRIORITY 9 — WEBSITE CONTENT MANAGEMENT SYSTEM
      ======================================================== */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Website Content Management System (CMS)</h2>
            <p className="text-xs text-slate-400">Edits persist in Firestore &apos;siteContent/public&apos; document and propagate across all visitor sessions.</p>
          </div>

          <div className="p-6 bg-[#171426] border border-violet-500/25 rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Homepage Tagline (Hero Title)</label>
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
              <label className="block text-xs font-mono text-slate-300 mb-1">Public Platform Announcement Banner</label>
              <input
                type="text"
                value={siteContent.announcement}
                onChange={(e) => setSiteContent({ ...siteContent, announcement: e.target.value })}
                className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-xs font-mono text-slate-300 mb-1">Vision Statement</label>
                <textarea
                  rows={2}
                  value={siteContent.aboutVision}
                  onChange={(e) => setSiteContent({ ...siteContent, aboutVision: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Official Organizing Desk Email</label>
                <input
                  type="email"
                  value={siteContent.contactEmail || 'nexora.bvm@gmail.com'}
                  onChange={(e) => setSiteContent({ ...siteContent, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Official Organizing Desk Phone</label>
                <input
                  type="text"
                  value={siteContent.contactPhone || '+91 8200243606'}
                  onChange={(e) => setSiteContent({ ...siteContent, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end">
              <button
                type="button"
                disabled={savingContent}
                onClick={handleSaveSiteContent}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingContent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span>Publish Website Copy to Firestore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 8: FULL TEAM CMS & ROLES ARCHITECTURE (PHASE 5)
      ======================================================== */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Team &amp; Organizational Architecture CMS</h2>
              <p className="text-xs text-slate-400">Manage executive organizers, team roles, academic engineering branches, divisions, and functional departments.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowImageLibraryDirectModal(true)}
                className="px-4 py-2 text-xs font-semibold text-violet-300 bg-violet-950/80 border border-violet-500/30 rounded-xl hover:bg-violet-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span>Open Image Library</span>
              </button>

              {teamSubTab === 'members' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeamMember(null);
                    setNewTeamMemberData({
                      name: '',
                      role_name: teamMeta.roles?.[0]?.name || 'Executive Member',
                      academic_branch_name: teamMeta.branches?.[0]?.name || 'Electronics Engineering',
                      division: teamMeta.divisions?.[0]?.name || 'Division A',
                      department_name: teamMeta.departments?.[0]?.name || 'Platform Engineering & Architecture',
                      bio: '',
                      avatar_url: '/images/team/mitesh_founder.jpg',
                      enrollment_number: '',
                      institution: 'Birla Vishvakarma Mahavidyalaya',
                      display_order: (teamMembers.length + 1),
                      is_featured: false,
                      is_founder: false,
                      enabled: true
                    });
                    setShowTeamMemberModal(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Team Member</span>
                </button>
              )}

              {teamSubTab !== 'members' && (
                <button
                  type="button"
                  onClick={() => {
                    setNewMetaInput({ name: '', code: '', description: '' });
                    setShowAddMetaModal(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {teamSubTab.slice(0, -1)}</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center gap-2 border-b border-violet-500/20 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setTeamSubTab('members')}
              className={`px-4 py-2 text-xs font-mono rounded-xl transition-all whitespace-nowrap ${
                teamSubTab === 'members'
                  ? 'bg-violet-600 text-white font-bold shadow-md'
                  : 'bg-[#171426] text-slate-400 hover:text-white border border-violet-500/15'
              }`}
            >
              Team Members ({teamMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setTeamSubTab('roles')}
              className={`px-4 py-2 text-xs font-mono rounded-xl transition-all whitespace-nowrap ${
                teamSubTab === 'roles'
                  ? 'bg-violet-600 text-white font-bold shadow-md'
                  : 'bg-[#171426] text-slate-400 hover:text-white border border-violet-500/15'
              }`}
            >
              Roles ({teamMeta.roles?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setTeamSubTab('branches')}
              className={`px-4 py-2 text-xs font-mono rounded-xl transition-all whitespace-nowrap ${
                teamSubTab === 'branches'
                  ? 'bg-violet-600 text-white font-bold shadow-md'
                  : 'bg-[#171426] text-slate-400 hover:text-white border border-violet-500/15'
              }`}
            >
              Academic Branches ({teamMeta.branches?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setTeamSubTab('departments')}
              className={`px-4 py-2 text-xs font-mono rounded-xl transition-all whitespace-nowrap ${
                teamSubTab === 'departments'
                  ? 'bg-violet-600 text-white font-bold shadow-md'
                  : 'bg-[#171426] text-slate-400 hover:text-white border border-violet-500/15'
              }`}
            >
              Departments ({teamMeta.departments?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setTeamSubTab('divisions')}
              className={`px-4 py-2 text-xs font-mono rounded-xl transition-all whitespace-nowrap ${
                teamSubTab === 'divisions'
                  ? 'bg-violet-600 text-white font-bold shadow-md'
                  : 'bg-[#171426] text-slate-400 hover:text-white border border-violet-500/15'
              }`}
            >
              Divisions ({teamMeta.divisions?.length || 0})
            </button>
          </div>

          {/* Subtab 1: 7 Dedicated Leadership Profile Cards */}
          {teamSubTab === 'members' && (
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span>7 Core Leadership Roles (Live CMS Management)</span>
                    </h3>
                    <p className="text-xs text-slate-300 font-light mt-0.5">
                      Dedicated management cards for all seven primary organizational positions. Toggle &quot;Go Live&quot; independently for each profile.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-violet-300 bg-violet-950 px-2.5 py-1 rounded-md border border-violet-500/30">
                    7 Standard Roles
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  {STANDARD_TEAM_ROLES.map((roleDef, idx) => {
                    const existing = teamMembers.find(
                      (m) => m.role_key === roleDef.key || m.role_name === roleDef.role_name
                    );
                    const isPublished = existing ? existing.enabled !== false : false;
                    const avatarSrc = existing?.avatar_url || roleDef.avatar_url;

                    return (
                      <div
                        key={roleDef.key}
                        className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                          roleDef.is_founder
                            ? 'bg-gradient-to-br from-[#1c1433] to-[#141026] border-violet-500/40 shadow-xl'
                            : isPublished
                            ? 'bg-[#171426] border-violet-500/30 shadow-lg'
                            : 'bg-[#12101e] border-slate-800 opacity-80'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-violet-500/40 bg-[#0d0c15] shrink-0 shadow-md">
                                {avatarSrc ? (
                                  <img
                                    src={avatarSrc}
                                    alt={existing?.name || roleDef.default_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/images/team/mitesh_founder.jpg';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-violet-300 font-mono text-base bg-violet-950/60">
                                    {(existing?.name || roleDef.default_name).slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                                  <h3 className="text-base font-bold text-white">
                                    {existing?.name || roleDef.default_name}
                                  </h3>
                                  {roleDef.is_founder && (
                                    <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-950 text-violet-300 border border-violet-500/40 rounded font-semibold">
                                      Founder
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-semibold border ${
                                    isPublished
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                      : 'bg-amber-950 text-amber-300 border-amber-500/30'
                                  }`}>
                                    {isPublished ? 'LIVE ON /TEAM' : 'DRAFT'}
                                  </span>
                                </div>
                                <div className="text-xs font-mono text-violet-400 font-semibold">
                                  {roleDef.role_name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {existing?.department_name || roleDef.department_name} · {existing?.academic_branch_name || roleDef.academic_branch_name}
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed font-light">
                            {existing?.bio || roleDef.bio}
                          </p>

                          {/* Faculty Specific Fields Display */}
                          {roleDef.key === 'faculty_guide' && (
                            <div className="p-3 bg-[#11101B] border border-violet-500/20 rounded-xl space-y-1.5 font-mono text-[11px]">
                              <div className="flex justify-between text-slate-300">
                                <span className="text-slate-500">Designation:</span>
                                <span className="text-violet-300 font-semibold">{existing?.faculty_designation || roleDef.faculty_designation}</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span className="text-slate-500">Cabin / Office:</span>
                                <span className="text-white">{existing?.faculty_cabin || roleDef.faculty_cabin}</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span className="text-slate-500">Research Focus:</span>
                                <span className="text-violet-300 truncate max-w-[200px]">{existing?.faculty_research || roleDef.faculty_research}</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span className="text-slate-500">Office Hours:</span>
                                <span className="text-emerald-400">{existing?.faculty_office_hours || roleDef.faculty_office_hours}</span>
                              </div>
                            </div>
                          )}

                          {/* Student Academic Details Grid */}
                          {roleDef.key !== 'faculty_guide' && (
                            <div className="grid grid-cols-3 gap-2 p-3 bg-[#11101B] rounded-xl text-center font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase">Division</span>
                                <span className="text-white">{existing?.division || roleDef.division || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase">Enrollment</span>
                                <span className="text-violet-300">{existing?.enrollment_number || roleDef.enrollment_number || '—'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase">Order</span>
                                <span className="text-slate-300">{existing?.display_order || roleDef.display_order}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Actions: Dedicated Go Live / Publish Button & Edit Button */}
                        <div className="pt-3 border-t border-violet-500/15 flex items-center justify-between gap-3">
                          <span className="text-[11px] font-mono text-slate-400">
                            {isPublished ? '● Profile Visible' : '○ Profile Hidden'}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Independent Go Live / Publish Button */}
                            <button
                              type="button"
                              onClick={() => handlePublishStandardRole(roleDef)}
                              className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                                isPublished
                                  ? 'bg-[#11101B] text-slate-300 hover:text-white border border-violet-500/25 hover:border-violet-400'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                              }`}
                              title={isPublished ? 'Click to unpublish and hide profile' : 'Click to publish profile LIVE immediately'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isPublished ? 'Unpublish' : 'Go Live / Publish'}</span>
                            </button>

                            {/* Edit Details */}
                            <button
                              type="button"
                              onClick={() => {
                                if (existing) {
                                  setEditingTeamMember(existing);
                                  setNewTeamMemberData(existing);
                                } else {
                                  setEditingTeamMember(null);
                                  setNewTeamMemberData({
                                    name: roleDef.default_name,
                                    role_key: roleDef.key,
                                    role_name: roleDef.role_name,
                                    academic_branch_name: roleDef.academic_branch_name,
                                    division: roleDef.division,
                                    department_name: roleDef.department_name,
                                    bio: roleDef.bio,
                                    avatar_url: roleDef.avatar_url || '/images/team/mitesh_founder.jpg',
                                    enrollment_number: roleDef.enrollment_number,
                                    institution: roleDef.institution,
                                    display_order: roleDef.display_order,
                                    is_founder: roleDef.is_founder || false,
                                    is_featured: roleDef.is_founder || false,
                                    enabled: true,
                                    ...(roleDef.faculty_designation ? {
                                      faculty_designation: roleDef.faculty_designation,
                                      faculty_cabin: roleDef.faculty_cabin,
                                      faculty_research: roleDef.faculty_research,
                                      faculty_office_hours: roleDef.faculty_office_hours
                                    } : {})
                                  });
                                }
                                setShowTeamMemberModal(true);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Custom Members (Beyond the 7 standard roles) */}
              {teamMembers.filter(m => !STANDARD_TEAM_ROLES.some(r => r.key === m.role_key || r.role_name === m.role_name)).length > 0 && (
                <div className="space-y-4 pt-4 border-t border-violet-500/20">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    Additional Appointed Team Members
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {teamMembers
                      .filter(m => !STANDARD_TEAM_ROLES.some(r => r.key === m.role_key || r.role_name === m.role_name))
                      .map((member) => (
                        <div
                          key={member.id}
                          className="p-6 rounded-2xl border border-violet-500/20 bg-[#171426] flex flex-col justify-between space-y-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-violet-500/30 bg-[#0d0c15] shrink-0">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-violet-300 font-mono text-sm">
                                    {member.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white">{member.name}</h4>
                                <div className="text-xs text-violet-400 font-mono">{member.role_name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{member.department_name}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTeamMember(member);
                                  setNewTeamMemberData(member);
                                  setShowTeamMemberModal(true);
                                }}
                                className="p-2 text-violet-300 hover:text-white bg-violet-950/60 border border-violet-500/30 rounded-lg cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTeamMember(member.id, member.name)}
                                className="p-2 text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/20 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab 2: Roles CRUD */}
          {teamSubTab === 'roles' && (
            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-violet-500/15">
                <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Role Title &amp; Hierarchy</span>
                <span className="text-xs font-mono text-slate-400">Order &amp; Status</span>
              </div>
              <div className="divide-y divide-violet-500/10">
                {(teamMeta.roles || []).map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white">{r.name}</div>
                      {r.description && <div className="text-xs text-slate-400 font-light">{r.description}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-violet-400">Order: {r.display_order}</span>
                      <button
                        type="button"
                        onClick={() => handleSaveMetaItem('role', { ...r, enabled: !r.enabled })}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                          r.enabled !== false
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {r.enabled !== false ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMetaItem('role', r.id)}
                        className="p-1.5 text-red-400 hover:text-red-300"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 3: Academic Branches CRUD */}
          {teamSubTab === 'branches' && (
            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-violet-500/15">
                <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Engineering Academic Discipline</span>
                <span className="text-xs font-mono text-slate-400">Code &amp; Actions</span>
              </div>
              <div className="divide-y divide-violet-500/10">
                {(teamMeta.branches || []).map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-7 rounded bg-violet-950 text-violet-300 border border-violet-500/30 font-mono text-xs flex items-center justify-center font-bold">
                        {b.code}
                      </span>
                      <span className="text-sm font-bold text-white">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveMetaItem('branch', { ...b, enabled: !b.enabled })}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                          b.enabled !== false
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {b.enabled !== false ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMetaItem('branch', b.id)}
                        className="p-1.5 text-red-400 hover:text-red-300"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 4: Functional Departments CRUD */}
          {teamSubTab === 'departments' && (
            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-violet-500/15">
                <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Functional Department (Distinct from Branch)</span>
                <span className="text-xs font-mono text-slate-400">Actions</span>
              </div>
              <div className="divide-y divide-violet-500/10">
                {(teamMeta.departments || []).map((d) => (
                  <div key={d.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white">{d.name}</div>
                      {d.description && <div className="text-xs text-slate-400 font-light">{d.description}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveMetaItem('department', { ...d, enabled: !d.enabled })}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                          d.enabled !== false
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {d.enabled !== false ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMetaItem('department', d.id)}
                        className="p-1.5 text-red-400 hover:text-red-300"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 5: Divisions CRUD */}
          {teamSubTab === 'divisions' && (
            <div className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-violet-500/15">
                <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Classroom / Batch Division</span>
                <span className="text-xs font-mono text-slate-400">Actions</span>
              </div>
              <div className="divide-y divide-violet-500/10">
                {(teamMeta.divisions || []).map((div) => (
                  <div key={div.id} className="py-3 flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-white">{div.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMetaItem('division', div.id)}
                      className="p-1.5 text-red-400 hover:text-red-300"
                      title="Delete Division"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* ========================================================
          TAB 9: PRIORITY 8 — SECURITY AUDIT LOGS
      ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Administrative Security Audit Trail</h2>
            <p className="text-xs text-slate-400">Immutable record of administrator session elevations, parameter mutations, and public writes.</p>
          </div>

          <div className="bg-[#171426] border border-violet-500/20 rounded-2xl p-4 divide-y divide-violet-500/10 font-mono text-xs">
            {auditLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No recent security audit events recorded.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-slate-300">
                  <div className="space-y-1">
                    <span className="text-violet-400 font-bold block">{log.event_type}</span>
                    <p className="text-xs text-slate-300 font-sans">{log.details}</p>
                    <span className="text-[10px] text-slate-500">Admin UID: {log.admin_uid}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRIORITY 2 & 4 — CREATE NEW COMPETITION
      ======================================================== */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <div>
                <h3 className="text-base font-bold text-white">Create New Flagship Competition</h3>
                <p className="text-[11px] text-slate-400 font-mono">Will be written directly to Firestore &apos;events&apos; collection</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              
              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Competition Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI Innovation Sprint"
                    value={newEventData.title || ''}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      setNewEventData({ ...newEventData, title, slug: newEventData.slug || slug });
                    }}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Unique URL Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ai-innovation-sprint"
                    value={newEventData.slug || ''}
                    onChange={(e) => setNewEventData({ ...newEventData, slug: e.target.value.toLowerCase().trim() })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Tagline */}
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

              {/* Category, Difficulty & Status */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Category</label>
                  <select
                    value={newEventData.category || 'AI-Assisted Development'}
                    onChange={(e) => setNewEventData({ ...newEventData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="AI-Assisted Development">AI-Assisted Development</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Collegiate Hackathon">Collegiate Hackathon</option>
                    <option value="Competitive Programming">Competitive Programming</option>
                    <option value="Hardware & Robotics">Hardware & Robotics</option>
                    <option value="General Engineering">General Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Difficulty</label>
                  <select
                    value={newEventData.difficulty || 'All Skill Levels'}
                    onChange={(e) => setNewEventData({ ...newEventData, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="Beginner to Intermediate">Beginner to Intermediate</option>
                    <option value="Intermediate to Advanced">Intermediate to Advanced</option>
                    <option value="All Skill Levels">All Skill Levels</option>
                    <option value="Competitive">Competitive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Status</label>
                  <select
                    value={newEventData.status || 'Published'}
                    onChange={(e) => setNewEventData({ ...newEventData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="Published">Published (Public)</option>
                    <option value="Draft">Draft (Private)</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Coming Soon ON / OFF Toggle (Phase 4) */}
              <div className="p-4 bg-[#11101B] border border-violet-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Coming Soon Status</span>
                    <span className="text-[11px] text-slate-400 block">When ON, public card is blurred with &quot;COMING SOON&quot; overlay and registration is locked.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewEventData({ ...newEventData, isComingSoon: !newEventData.isComingSoon })}
                    className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      newEventData.isComingSoon 
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400' 
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {newEventData.isComingSoon ? 'Coming Soon: ON' : 'Coming Soon: OFF'}
                  </button>
                </div>
              </div>

              {/* Centralized Image Library Selector */}
              <ImageSelector
                label="Competition Cover Image"
                value={newEventData.cover_image || newEventData.banner_image}
                defaultCategory={newEventData.category || 'Vibe Coding / AI Hackathon'}
                onChange={(url) => setNewEventData({ ...newEventData, cover_image: url, banner_image: url })}
                helperText="Select high-resolution cover from NEXORA Image Library or upload new asset."
              />

              {/* Short & Full Description */}
              <div>
                <label className="block text-slate-300 font-mono mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary displayed on competition cards..."
                  value={newEventData.short_description || newEventData.description || ''}
                  onChange={(e) => setNewEventData({ ...newEventData, short_description: e.target.value, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              {/* Capacity, Fee & Team Size */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    min={1}
                    value={newEventData.capacity || 60}
                    onChange={(e) => setNewEventData({ ...newEventData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Fee (₹ per participant)</label>
                  <input
                    type="number"
                    min={0}
                    value={newEventData.fee_per_participant ?? 50}
                    onChange={(e) => setNewEventData({ ...newEventData, fee_per_participant: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Team Size Format</label>
                  <input
                    type="text"
                    placeholder="e.g. 1–4 Participants"
                    value={newEventData.team_size || '1–4 Participants'}
                    onChange={(e) => setNewEventData({ ...newEventData, team_size: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Event Date & Venue */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Event Date &amp; Time</label>
                  <input
                    type="text"
                    placeholder="e.g. Saturday, Nov 15, 2026 · 10:00 AM"
                    value={newEventData.event_date || ''}
                    onChange={(e) => setNewEventData({ ...newEventData, event_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Venue</label>
                  <input
                    type="text"
                    value={newEventData.venue || 'BVM Engineering College'}
                    onChange={(e) => setNewEventData({ ...newEventData, venue: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Configurable Multi-Rank Prize Pools (Phase 7) */}
              <div className="col-span-full">
                <PrizePoolEditor
                  prizes={newEventData.prizes}
                  onChange={(updatedPrizes) => setNewEventData({ 
                    ...newEventData, 
                    prizes: updatedPrizes 
                  })}
                />
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
                disabled={loading}
                onClick={handleCreateCompetition}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Save Competition to Firestore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRIORITY 2 & 4 — EDIT EXISTING COMPETITION
      ======================================================== */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <div>
                <h3 className="text-base font-bold text-white">Edit {editingEvent.title}</h3>
                <p className="text-[11px] text-slate-400 font-mono">Writing updates to Firestore /events/{editingEvent.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              
              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Competition Title</label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">URL Slug (Fixed)</label>
                  <input
                    type="text"
                    disabled
                    value={editingEvent.slug}
                    className="w-full px-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-slate-500 font-mono"
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-slate-300 font-mono mb-1">Tagline</label>
                <input
                  type="text"
                  value={editingEvent.tagline}
                  onChange={(e) => setEditingEvent({ ...editingEvent, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              {/* Category, Difficulty & Status */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Category</label>
                  <input
                    type="text"
                    value={editingEvent.category}
                    onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Difficulty</label>
                  <select
                    value={editingEvent.difficulty}
                    onChange={(e) => setEditingEvent({ ...editingEvent, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="Beginner to Intermediate">Beginner to Intermediate</option>
                    <option value="Intermediate to Advanced">Intermediate to Advanced</option>
                    <option value="All Skill Levels">All Skill Levels</option>
                    <option value="Competitive">Competitive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Publication Status</label>
                  <select
                    value={editingEvent.status}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Coming Soon ON / OFF Toggle (Phase 4) */}
              <div className="p-4 bg-[#11101B] border border-violet-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Coming Soon Status</span>
                    <span className="text-[11px] text-slate-400 block">Locks competition registration and displays glowing COMING SOON overlay to public.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingEvent({ ...editingEvent, isComingSoon: !editingEvent.isComingSoon })}
                    className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      editingEvent.isComingSoon 
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400' 
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {editingEvent.isComingSoon ? 'Coming Soon: ON' : 'Coming Soon: OFF'}
                  </button>
                </div>
              </div>

              {/* Centralized Image Library Selector */}
              <ImageSelector
                label="Competition Cover Image"
                value={editingEvent.cover_image || editingEvent.banner_image}
                defaultCategory={editingEvent.category || 'Vibe Coding / AI Hackathon'}
                onChange={(url) => setEditingEvent({ ...editingEvent, cover_image: url, banner_image: url })}
                helperText="Select high-resolution cover from NEXORA Image Library or upload new asset."
              />

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-mono mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={editingEvent.description || editingEvent.short_description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value, short_description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              {/* Capacity, Fee & Registration Toggle */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={editingEvent.capacity}
                    onChange={(e) => setEditingEvent({ ...editingEvent, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingEvent.fee_per_participant}
                    onChange={(e) => setEditingEvent({ ...editingEvent, fee_per_participant: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Registration Open</label>
                  <select
                    value={editingEvent.registration_open ? 'open' : 'closed'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, registration_open: e.target.value === 'open' })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="open">Open for Registration</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Event Date, Venue & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Event Date &amp; Time</label>
                  <input
                    type="text"
                    value={editingEvent.event_date || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Registration Deadline</label>
                  <input
                    type="text"
                    value={editingEvent.registration_deadline || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, registration_deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Configurable Multi-Rank Prize Pools (Phase 7) */}
              <div className="col-span-full">
                <PrizePoolEditor
                  prizes={editingEvent.prizes}
                  onChange={(updatedPrizes) => setEditingEvent({
                    ...editingEvent,
                    prizes: updatedPrizes
                  })}
                />
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
                disabled={loading}
                onClick={handleUpdateCompetition}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Save Live to Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DELETE CONFIRMATION & REGISTRATION GUARD
      ======================================================== */}
      {deleteConfirmEvent && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#171426] border border-red-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-white">Delete {deleteConfirmEvent.title}?</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                If student participant registrations exist for this competition, deletion is strictly blocked to protect student records. To remove the challenge from public listings safely, please <strong className="text-amber-300">Archive</strong> it instead.
              </p>
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmEvent(null)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleArchiveCompetition(deleteConfirmEvent);
                    setDeleteConfirmEvent(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-300 bg-amber-950/70 border border-amber-500/30 rounded-xl hover:bg-amber-900 transition-colors"
                >
                  Archive Instead
                </button>
                <button
                  type="button"
                  disabled={deletingEvent}
                  onClick={() => handleDeleteCompetition(deleteConfirmEvent)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-500 transition-colors shadow-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {deletingEvent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRIORITY 6 — BROADCAST NOTIFICATION MODAL
      ======================================================== */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <h3 className="text-base font-bold text-white">Broadcast Public Announcement</h3>
              <button type="button" onClick={() => setShowNotificationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ZeroCode Problem Statements Released"
                  value={newNotification.title || ''}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Category</label>
                  <select
                    value={newNotification.category || 'Announcement'}
                    onChange={(e) => setNewNotification({ ...newNotification, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="Announcement">Announcement</option>
                    <option value="Competition Update">Competition Update</option>
                    <option value="Important">Important</option>
                    <option value="System">System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Priority</label>
                  <select
                    value={newNotification.priority || 'Normal'}
                    onChange={(e) => setNewNotification({ ...newNotification, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Message Body *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Type the message that will be broadcast to all students..."
                  value={newNotification.message || ''}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Action Link (Optional)</label>
                  <input
                    type="text"
                    placeholder="/competitions/zerocode"
                    value={newNotification.link_url || ''}
                    onChange={(e) => setNewNotification({ ...newNotification, link_url: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Button Text</label>
                  <input
                    type="text"
                    placeholder="Learn More"
                    value={newNotification.link_text || ''}
                    onChange={(e) => setNewNotification({ ...newNotification, link_text: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Optional Expiry Date & Time (Phase 2) */}
              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  Expiration Date &amp; Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={newNotification.expires_at || ''}
                  onChange={(e) => setNewNotification({ ...newNotification, expires_at: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  Leave empty for announcements that do not automatically expire.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateNotification}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                <span>Publish Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRIORITY 7 — REPLY TO INQUIRY
      ======================================================== */}
      {replyingMessage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <div>
                <h3 className="text-base font-bold text-white">Reply to {replyingMessage.sender_name}</h3>
                <p className="text-[11px] text-slate-400 font-mono">{replyingMessage.sender_email}</p>
              </div>
              <button type="button" onClick={() => setReplyingMessage(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#11101B] rounded-xl border border-violet-500/15 text-slate-300">
                <span className="text-[10px] text-slate-500 font-mono block uppercase">Original Message:</span>
                <p className="font-light mt-1 select-text">{replyingMessage.message}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Reply Channel</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="channel"
                      checked={replyChannel === 'email'}
                      onChange={() => setReplyChannel('email')}
                      className="accent-violet-500"
                    />
                    <span>Email dispatch via Brevo (Sends real email)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="channel"
                      checked={replyChannel === 'in-app'}
                      onChange={() => setReplyChannel('in-app')}
                      className="accent-violet-500"
                    />
                    <span>In-app record only</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Reply Body *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your response to the student or visitor..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReplyingMessage(null)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingReply || !replyText.trim()}
                onClick={handleSendReply}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {sendingReply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Reply</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REGISTRATION RECORD DETAIL
      ======================================================== */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <div>
                <h3 className="text-base font-bold text-white">Registration Specification</h3>
                <span className="font-mono text-xs text-violet-300">{selectedRecord.competition_id || selectedRecord.reference_id}</span>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs select-text">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#11101B] rounded-xl border border-violet-500/15">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Participant</span>
                  <span className="text-white font-semibold">{selectedRecord.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Verified Email</span>
                  <span className="text-violet-300 font-mono">{selectedRecord.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">College</span>
                  <span className="text-slate-300">{selectedRecord.college}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Branch &amp; Year</span>
                  <span className="text-slate-300">{selectedRecord.branch} · {selectedRecord.academic_year}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Enrollment Number</span>
                  <span className="text-white font-mono">{selectedRecord.enrollment_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Phone</span>
                  <span className="text-white font-mono">{selectedRecord.phone_number || 'N/A'}</span>
                </div>
              </div>

              {selectedRecord.team_name && (
                <div className="p-3 bg-[#11101B] rounded-xl border border-violet-500/15 space-y-1.5">
                  <span className="text-[10px] text-amber-400 font-mono uppercase block font-semibold">Team Specifications</span>
                  <div className="text-white font-bold">{selectedRecord.team_name}</div>
                  {selectedRecord.team_member_details && selectedRecord.team_member_details.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-violet-500/10">
                      {selectedRecord.team_member_details.map((m, i) => (
                        <div key={i} className="flex justify-between text-slate-300 text-[11px] font-mono">
                          <span>{m.name}</span>
                          <span className="text-slate-500">{m.branch || m.college}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center p-3 bg-[#11101B] rounded-xl border border-violet-500/15">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Fee Allocated</span>
                  <span className="text-white font-bold text-sm">₹{selectedRecord.calculated_fee ?? 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Registered Timestamp</span>
                  <span className="text-slate-400 font-mono text-[11px]">{new Date(selectedRecord.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TEAM MEMBER (CREATE & EDIT CMS)
      ======================================================== */}
      {showTeamMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingTeamMember ? `Edit Member: ${editingTeamMember.name}` : 'Add New Team Member'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Managed directly in Firestore CMS. Syncs immediately to /team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTeamMemberModal(false);
                  setEditingTeamMember(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Photo Selector using Image Library */}
              <div>
                <ImageSelector
                  label="Profile Picture / Avatar"
                  value={newTeamMemberData.avatar_url || ''}
                  onChange={(url) => setNewTeamMemberData({ ...newTeamMemberData, avatar_url: url })}
                  defaultCategory="Team"
                />
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mitesh Pipaliya"
                    value={newTeamMemberData.name || ''}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Team Role *</label>
                  <select
                    value={newTeamMemberData.role_name || ''}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, role_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    {(teamMeta.roles || []).map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Functional Department & Academic Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Functional Department (Team Unit) *</label>
                  <select
                    value={newTeamMemberData.department_name || ''}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, department_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    {(teamMeta.departments || []).map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Academic Engineering Branch *</label>
                  <select
                    value={newTeamMemberData.academic_branch_name || ''}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, academic_branch_name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    {(teamMeta.branches || []).map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Division & Enrollment Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Classroom Division</label>
                  <select
                    value={newTeamMemberData.division || ''}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, division: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  >
                    {(teamMeta.divisions || []).map((div) => (
                      <option key={div.id} value={div.name}>
                        {div.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Enrollment Number</label>
                  <input
                    type="text"
                    placeholder="e.g., 23EL001"
                    value={newTeamMemberData.enrollment_number || ''}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, enrollment_number: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={newTeamMemberData.display_order ?? 10}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, display_order: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Institution */}
              <div>
                <label className="block text-slate-300 font-mono mb-1">Institution</label>
                <input
                  type="text"
                  placeholder="Birla Vishvakarma Mahavidyalaya"
                  value={newTeamMemberData.institution || 'Birla Vishvakarma Mahavidyalaya'}
                  onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, institution: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-slate-300 font-mono mb-1">Biography / Contributions</label>
                <textarea
                  rows={3}
                  placeholder="Describe member focus, technical specialties, and platform responsibilities..."
                  value={newTeamMemberData.bio || ''}
                  onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              {/* Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#11101B] border border-violet-500/20 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={newTeamMemberData.is_founder || false}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, is_founder: e.target.checked })}
                    className="accent-violet-500 rounded"
                  />
                  <span>Founder Badge</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={newTeamMemberData.is_featured || false}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, is_featured: e.target.checked })}
                    className="accent-violet-500 rounded"
                  />
                  <span>Featured Member</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={newTeamMemberData.enabled !== false}
                    onChange={(e) => setNewTeamMemberData({ ...newTeamMemberData, enabled: e.target.checked })}
                    className="accent-violet-500 rounded"
                  />
                  <span>Published on /team</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTeamMemberModal(false);
                  setEditingTeamMember(null);
                }}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveTeamMember}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{editingTeamMember ? 'Save Changes' : 'Create Member'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD ORGANIZATIONAL META (ROLES, BRANCHES, ETC.)
      ======================================================== */}
      {showAddMetaModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#171426] border border-violet-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
              <div>
                <h3 className="text-base font-bold text-white capitalize">
                  Add {teamSubTab === 'branches' ? 'Academic Branch' : teamSubTab.slice(0, -1)}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Expands selectable options across the team management directory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMetaModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">
                  {teamSubTab === 'branches' ? 'Branch Discipline Name *' : 'Title / Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    teamSubTab === 'branches'
                      ? 'e.g., Artificial Intelligence & Data Science'
                      : teamSubTab === 'departments'
                      ? 'e.g., Autonomous Robotics & Embedded Lab'
                      : teamSubTab === 'roles'
                      ? 'e.g., Technical Lead'
                      : 'e.g., Division C'
                  }
                  value={newMetaInput.name}
                  onChange={(e) => setNewMetaInput({ ...newMetaInput, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                />
              </div>

              {teamSubTab === 'branches' && (
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Discipline Code (Short) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., AIDS, ME, EC, CP"
                    value={newMetaInput.code || ''}
                    onChange={(e) => setNewMetaInput({ ...newMetaInput, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white font-mono"
                  />
                </div>
              )}

              {(teamSubTab === 'roles' || teamSubTab === 'departments') && (
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Brief description of responsibilities or scope"
                    value={newMetaInput.description || ''}
                    onChange={(e) => setNewMetaInput({ ...newMetaInput, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08080D] border border-violet-500/30 rounded-xl text-white"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-violet-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddMetaModal(false)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !newMetaInput.name.trim()}
                onClick={() => {
                  const type = teamSubTab === 'branches' ? 'branch' : (teamSubTab.slice(0, -1) as any);
                  handleSaveMetaItem(type, newMetaInput);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DIRECT IMAGE LIBRARY BROWSER
      ======================================================== */}
      {showImageLibraryDirectModal && (
        <ImageLibraryModal
          isOpen={showImageLibraryDirectModal}
          onClose={() => setShowImageLibraryDirectModal(false)}
          onSelectImage={() => setShowImageLibraryDirectModal(false)}
        />
      )}
    </div>
  );
};
