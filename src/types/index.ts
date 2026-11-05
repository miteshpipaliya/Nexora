export type InstitutionalStatus = 'Proposed' | 'Under Review' | 'Approved';

export type EventStatus = 'Draft' | 'Published' | 'Archived' | 'Proposed' | 'Approved' | 'Open' | 'Closed' | 'Completed';

export type RegistrationStatus = 'Pending Review' | 'Confirmed' | 'Waitlisted' | 'Cancelled';

export type PaymentStatus = 'Unpaid' | 'Pending Verification' | 'Verified' | 'Exempt';

export type CollegeOption = 'BVM' | 'GCET' | 'ADIT' | 'CHARUSAT' | 'Other';

export type AcademicYear = '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | 'Postgraduate';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  college: string;
  branch: string;
  academic_year: AcademicYear;
  enrollment_number: string;
  division?: string;
  phone_number?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  is_admin?: boolean;
  email_verified?: boolean;
  is_profile_complete?: boolean;
  last_active?: string | number;
}

export interface RankedPrize {
  rank: number;
  label: string;
  amount: string;
  description?: string;
  enabled: boolean;
}

export interface CompetitionEvent {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  short_description?: string;
  full_description?: string;
  category: string;
  difficulty: 'Beginner to Intermediate' | 'Intermediate to Advanced' | 'All Skill Levels' | 'Competitive' | string;
  status: EventStatus;
  registration_open: boolean;
  is_published?: boolean;
  isComingSoon?: boolean;
  registration_deadline?: string;
  event_date?: string;
  event_time?: string;
  duration?: string;
  venue?: string;
  format?: 'Individual' | 'Team' | 'Individual or Team';
  team_size?: string;
  min_team_size?: number;
  max_team_size?: number;
  eligibility?: string;
  capacity: number;
  registered_count: number;
  show_capacity?: boolean;
  registration_display_mode?: 'capacity' | 'count';
  fee_per_participant: number;
  banner_image?: string;
  cover_image?: string;
  additional_images?: string[];
  prizes: {
    first_place: string;
    second_place?: string;
    third_place?: string;
    special_rewards?: string;
    ranked_prizes?: RankedPrize[];
  };
  rules: string[];
  judging_criteria: { label: string; percentage: number; description: string }[];
  tracks_or_format?: string[];
  faq: { question: string; answer: string }[];
  contact_details?: { name?: string; email?: string; phone?: string };
  created_at?: string;
  updated_at?: string;
}

export interface TeamMemberDetail {
  name: string;
  email?: string;
  phone?: string;
  college?: string;
  branch?: string;
  enrollment_number?: string;
}

export interface RegistrationRecord {
  id: string;
  competition_id: string; // Permanent Unique Competition ID e.g. ZC-A7K2, CTF-B4M9, HN-M6R2, CR-K8P3
  reference_id?: string;
  user_id: string;
  event_slug: string;
  event_title: string;
  full_name: string;
  email: string;
  phone_number: string;
  college: string;
  branch: string;
  academic_year: AcademicYear;
  enrollment_number: string;
  division?: string;
  team_name?: string;
  team_members?: string[];
  team_member_details?: TeamMemberDetail[];
  participant_count: number;
  registration_status: RegistrationStatus;
  payment_status: PaymentStatus;
  calculated_fee: number;
  created_at: string;
  updated_at: string;
}

export interface MessageReply {
  id: string;
  sender_name: string;
  sender_email?: string;
  message: string;
  created_at: string;
  is_admin_reply: boolean;
  channel: 'in-app' | 'email';
}

export interface ContactMessage {
  id: string;
  sender_name: string;
  sender_email: string;
  subject?: string;
  message: string;
  competition_reference?: string;
  user_id?: string;
  status: 'unread' | 'read' | 'resolved' | 'archived';
  delivery_status?: 'sent' | 'email_failed' | 'pending';
  delivery_error?: string;
  replies?: MessageReply[];
  created_at: string;
  updated_at?: string;
}

export interface TeamMemberProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  institution: string;
  enrollment_number?: string;
  division?: string;
  avatar_url?: string;
  bio: string;
  is_founder?: boolean;
  is_placeholder?: boolean;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  category: 'Announcement' | 'Competition Update' | 'Important' | 'System' | 'General' | 'Registration Update' | 'Emergency Notice';
  priority: 'Normal' | 'High' | 'Urgent';
  image_url?: string;
  link_url?: string;
  link_text?: string;
  audience: 'all' | string; // 'all' or competition slug
  status: 'Draft' | 'Published' | 'Archived';
  show_popup?: boolean;
  scheduled_for?: string | number | any;
  popup_delay_seconds?: number;
  display_at?: string | number | any;
  publish_at?: string;
  is_popup?: boolean;
  expires_at?: string;
  created_at: string;
  created_by?: string;
}

export interface SiteContent {
  tagline: string;
  description: string;
  aboutHeading: string;
  aboutMission: string;
  aboutVision: string;
  announcement: string;
  contactEmail?: string;
  contactPhone?: string;
  featuredCompetitionSlugs?: string[];
  updated_at?: string;
  updated_by?: string;
}

export interface RealDashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalCompetitions: number;
  publishedCompetitions: number;
  totalRegistrations: number;
  confirmedRegistrations: number;
  actualTeamMembers: number;
  unreadVisitorMessages: number;
  publishedNotifications: number;
  upcomingEvents: number;
  totalRevenue: number;
}

export interface ImageLibraryItem {
  id: string;
  title: string;
  category: 'Vibe Coding / AI Hackathon' | 'CodeRush' | 'Mechanical / RoboRace' | 'Cybersecurity / CTF' | 'Civil / Engineering' | 'General Student Groups' | string;
  url: string;
  thumbnail_url?: string;
  file_name?: string;
  file_size?: number;
  dimensions?: string;
  uploaded_by?: string;
  created_at: string;
  is_system_preset?: boolean;
}

export interface TeamRole {
  id: string;
  name: string;
  display_order: number;
  enabled: boolean;
  description?: string;
}

export interface AcademicBranch {
  id: string;
  name: string;
  code: string;
  display_order: number;
  enabled: boolean;
}

export interface TeamDivision {
  id: string;
  name: string;
  display_order: number;
}

export interface TeamDepartment {
  id: string;
  name: string;
  display_order: number;
  enabled: boolean;
  description?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role_key?: 'founder' | 'tech_ops' | 'fullstack_lead' | 'event_coordinator' | 'design_director' | 'pr_outreach' | 'faculty_guide' | string;
  role_id?: string;
  role_name: string;
  academic_branch_id?: string;
  academic_branch_name: string;
  division?: string;
  department_id?: string;
  department_name: string;
  bio: string;
  avatar_url?: string;
  enrollment_number?: string;
  institution?: string;
  faculty_designation?: string;
  faculty_cabin?: string;
  faculty_research?: string;
  faculty_office_hours?: string;
  social_links?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    email?: string;
    instagram?: string;
  };
  display_order: number;
  is_featured: boolean;
  is_founder?: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
