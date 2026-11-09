-- NEXORA Migration: Competition ID, Uniform Fees, and Prize Upgrades
-- Preserves existing tables, adds constraints, and updates event records

-- 1. Add competition_id column to registrations if not exists
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS competition_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS team_name TEXT,
ADD COLUMN IF NOT EXISTS team_member_details JSONB DEFAULT '[]'::jsonb;

-- 2. Add team competition_id to teams table
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS competition_id TEXT UNIQUE;

-- 3. Update events with uniform fee_per_participant = 50.00 and prize structures
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS fee_per_participant NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS first_prize TEXT,
ADD COLUMN IF NOT EXISTS second_prize TEXT,
ADD COLUMN IF NOT EXISTS third_prize TEXT,
ADD COLUMN IF NOT EXISTS special_rewards TEXT;

-- 4. Update seed events with V2 prize information and uniform fees
UPDATE public.events
SET 
  fee_per_participant = 50.00,
  bvm_fee = 50.00,
  external_fee = 50.00,
  first_prize = '₹2,000 Cash Prize',
  special_rewards = 'Top 7 Participants — Exclusive Surprise Gifts'
WHERE slug IN ('zerocode', 'ctf', 'coderush');

UPDATE public.events
SET 
  fee_per_participant = 50.00,
  bvm_fee = 50.00,
  external_fee = 50.00,
  first_prize = '₹4,000 — 1st Team',
  second_prize = '₹2,500 — 2nd Team',
  third_prize = '₹1,000 — 3rd Team',
  special_rewards = 'Top 4 Teams — Exclusive Surprise Gifts',
  duration = 'Event duration and schedule will be announced.'
WHERE slug = 'hackathon';

-- 5. Create index for lightning-fast competition_id queries
CREATE INDEX IF NOT EXISTS idx_registrations_competition_id ON public.registrations(competition_id);
CREATE INDEX IF NOT EXISTS idx_teams_competition_id ON public.teams(competition_id);
