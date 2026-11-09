export type InstitutionalStatus = 'Proposed' | 'Under Review' | 'Approved';

export type EventStatus = 'Proposed' | 'Approved' | 'Open' | 'Closed' | 'Completed';

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
}

export interface CompetitionEvent {
  id: string;
  slug: 'zerocode' | 'ctf' | 'hackathon' | 'coderush';
  title: string;
  tagline: string;
  description: string;
  category: string;
  difficulty: 'Beginner to Intermediate' | 'Intermediate to Advanced' | 'All Skill Levels' | 'Competitive';
  status: EventStatus;
  registration_open: boolean;
  registration_deadline?: string;
  event_date?: string;
  duration?: string;
  team_size?: string;
  capacity: number;
  registered_count: number;
  fee_per_participant: number; // Uniform ₹50
  banner_image?: string;
  prizes: {
    first_place: string;
    second_place?: string;
    third_place?: string;
    special_rewards: string;
  };
  rules: string[];
  judging_criteria: { label: string; percentage: number; description: string }[];
  tracks_or_format?: string[];
  faq: { question: string; answer: string }[];
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
  event_slug: 'zerocode' | 'ctf' | 'hackathon' | 'coderush';
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

export interface ContactMessage {
  id: string;
  sender_name: string;
  sender_email: string;
  subject?: string;
  message: string;
  created_at: string;
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
