# NEXORA — Student Technology & Innovation Community

> **"Beyond a Club. The Beginning of a New Tech Era."**  
> Proposed Student-Led Platform at Birla Vishvakarma Mahavidyalaya (BVM), Vallabh Vidyanagar, Gujarat, India.

---

## 1. Project Vision & Institutional Disclosure

NEXORA is envisioned as more than a conventional college club: it is a multidisciplinary student innovation community engineered to connect creators, developers, innovators, and problem-solvers across engineering departments (Electronics, Computer, IT, Mechanical, Civil) and regional institutions (BVM, GCET, ADIT, CHARUSAT).

**Current Institutional Status:**
NEXORA is a **proposed student-led initiative** at BVM. Its first objective is to demonstrate this vision to faculty mentors, department heads, and college authorities. Following official institutional review and authorization, NEXORA will serve as the functional platform for event registrations, student credentials, and technology festivals.

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router DOM, Lucide Icons.
- **3D Graphics & Spatial Web:** Three.js procedural orbital cosmic scene & 3D T-shirt viewer with real-time student name personalization.
- **State & Data Management:** Reactive unified data service supporting both **Supabase PostgreSQL** and persistent local **Demo Mode**.
- **Forms & Validation:** Controlled form state with robust client and server validation checks.
- **Database Architecture:** Supabase PostgreSQL with Row Level Security (RLS) policies, indexes, and automated timestamps.

---

## 3. Core Features & Routes

- `/` — **Homepage:** Cosmic 3D hero animation, institutional proposal status, Four Pillars of NEXORA (Learn, Compete, Collaborate, Innovate), Roadmap (Phases 01–04), and featured competitions preview.
- `/about` — **About Platform:** Detailed philosophy, multidisciplinary alignment, academic integrity guidelines, and institutional FAQs.
- `/competitions` — **Competitions Hub:** Portfolio of 4 primary technical challenges:
  1. `/competitions/zerocode` — *ZeroCode: AI-Assisted Frontend Development* (70 min, 5 AI prompts, HTML/CSS/JS, 70/15/15 judging criteria).
  2. `/competitions/ctf` — *Capture The Flag: Cybersecurity & Forensics* (interactive flag demo decoder, web security, cryptography, OSINT, ethical rules).
  3. `/competitions/hackathon` — *NEXORA Hackathon: From Idea to Impact* (24-hour sprint, 6 innovation tracks, team leader & member registration).
  4. `/competitions/coderush` — *CodeRush: Algorithmic Programming* (10 tiered problems, C/C++/Python/Java, scoring penalty rules, isolated judge disclosure).
- `/team` — **Founding Team:** 3D holographic tilt digital ID card for student founder **Mitesh Pipaliya** (Electronics Engineering, BVM, Enrollment: 26EL309, Div: 11), with prospective team roles.
- `/store` — **NEXORA Wear:** Interactive 3D T-shirt viewer with 360° spin, colorway switcher (*Founders Black* vs. *ZeroCode White*), and real-time name & jersey number personalization.
- `/profile` — **Student Dashboard:** View verified competition registrations, unique reference IDs (`NXR-2026-XXXX`), and editable student profile details.
- `/login`, `/signup`, `/forgot-password` — **Authentication:** Secure student account creation with enrollment number, division, institution, and branch tracking.
- `/admin` — **Organizer Console:** Protected administrative dashboard with live participant roster, college breakdown stats, registration toggle switches, fee/capacity configuration, and CSV export.
- `/privacy`, `/terms` — **Legal & Compliance:** Transparent data governance, academic ethics charter, and institutional fee safeguards.

---

## 4. Database Setup & Supabase Migrations

The complete SQL migration is located in:
```
supabase/migrations/20260101000000_create_nexora_schema.sql
```

It provisions:
1. `public.profiles` — Linked to `auth.users(id)` with RLS policies ensuring users only read/edit their own data.
2. `public.events` — Competition event records with capacity limits and fee tiers.
3. `public.registrations` — Unique constraint on `(user_id, event_id)` preventing duplicate registrations.
4. `public.teams` & `public.team_members` — Team management for hackathons and CTFs.
5. `public.contact_submissions` — Messages submitted to the organizing body.
6. `public.admin_roles` — Privileged organizer permissions.

### Connecting to Live Supabase:
1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL script from `supabase/migrations/20260101000000_create_nexora_schema.sql` in the Supabase SQL Editor.
3. Add your Supabase credentials to `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. If credentials are not supplied, the app automatically runs in **Demo Mode**, maintaining full local state persistence for review.

---

## 5. Development Scripts

```bash
# Run local development server
npm run dev

# Compile TypeScript and build production bundle
npm run build

# Run TypeScript static type check
npm run lint

# Preview production build locally
npm run preview
```

---

## 6. Organizer Contact

- **Student Founder:** Mitesh Pipaliya
- **Email:** miteshpipaliya2202@gmail.com
- **Institution:** Birla Vishvakarma Mahavidyalaya (BVM), Vallabh Vidyanagar, Gujarat, India.
