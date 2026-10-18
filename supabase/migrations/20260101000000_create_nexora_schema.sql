-- NEXORA Database Schema Migration
-- Student Technology & Innovation Community at BVM

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    college TEXT NOT NULL DEFAULT 'BVM',
    branch TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    enrollment_number TEXT NOT NULL,
    division TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Proposed', -- 'Proposed', 'Approved', 'Open', 'Closed', 'Completed'
    registration_open BOOLEAN NOT NULL DEFAULT FALSE,
    registration_deadline TIMESTAMPTZ,
    event_date TIMESTAMPTZ,
    capacity INTEGER NOT NULL DEFAULT 100,
    bvm_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    external_fee NUMERIC(10, 2) NOT NULL DEFAULT 70.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    membership_status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Declined'
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(team_id, user_id)
);

-- 5. Registrations Table
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    college TEXT NOT NULL,
    branch TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    enrollment_number TEXT NOT NULL,
    division TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    registration_status TEXT NOT NULL DEFAULT 'Pending Review', -- 'Confirmed', 'Pending Review', 'Waitlisted', 'Cancelled'
    payment_status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Pending Verification', 'Verified', 'Exempt'
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT unique_user_event_registration UNIQUE (user_id, event_id)
);

-- 6. Contact Submissions Table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. Admin Roles Table
CREATE TABLE IF NOT EXISTS public.admin_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'administrator', -- 'administrator', 'super_admin', 'faculty_advisor'
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- INDEXES for high query performance
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_teams_event_id ON public.teams(event_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles can be viewed by profile owner or admin"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Events Policies
CREATE POLICY "Anyone can view events"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Admins can manage events"
ON public.events FOR ALL
USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

-- Registrations Policies
CREATE POLICY "Users can view their own registrations"
ON public.registrations FOR SELECT
USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Authenticated users can create their own registration"
ON public.registrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update registrations"
ON public.registrations FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

-- Teams Policies
CREATE POLICY "Team members and leaders can view team"
ON public.teams FOR SELECT
USING (
    leader_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (leader_id = auth.uid());

CREATE POLICY "Team leader can update team"
ON public.teams FOR UPDATE
USING (leader_id = auth.uid());

-- Team Members Policies
CREATE POLICY "Team members can view membership"
ON public.team_members FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND leader_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Team leaders can add members"
ON public.team_members FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND leader_id = auth.uid()));

-- Contact Submissions Policies
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view contact submissions"
ON public.contact_submissions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

-- Admin Roles Policies
CREATE POLICY "Admins can view admin roles"
ON public.admin_roles FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

-- SEED INITIAL 4 PROPOSED EVENTS
INSERT INTO public.events (slug, title, description, category, status, registration_open, capacity, bvm_fee, external_fee)
VALUES
(
    'zerocode',
    'ZeroCode — AI-Assisted Frontend Development',
    'Transform ideas into functional digital experiences using AI-assisted development under constraints of time and prompt limits.',
    'AI & Frontend',
    'Proposed',
    true,
    80,
    50.00,
    70.00
),
(
    'ctf',
    'Capture The Flag (CTF) Cybersecurity Challenge',
    'Solve carefully designed security puzzles, investigate digital forensics, inspect cryptography, and capture hidden flags.',
    'Cybersecurity',
    'Proposed',
    true,
    60,
    50.00,
    70.00
),
(
    'hackathon',
    'NEXORA Hackathon — From Idea to Impact',
    'Form multidisciplinary teams, identify real-world challenges, and engineer working prototypes across software, hardware, and AI.',
    'Innovation & Prototype',
    'Proposed',
    true,
    120,
    50.00,
    70.00
),
(
    'coderush',
    'CodeRush — Competitive Coding Challenge',
    'Ten problems across algorithmic difficulty tiers. Race against the clock and peers on the live competitive programming leaderboard.',
    'Competitive Programming',
    'Proposed',
    true,
    100,
    50.00,
    70.00
)
ON CONFLICT (slug) DO NOTHING;
