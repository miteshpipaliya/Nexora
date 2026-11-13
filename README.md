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
- **State & Data Management:** Firebase Authentication, Firestore, Firebase Storage, and a typed React data-service layer.
- **Forms & Validation:** Controlled form state with robust client and server validation checks.
- **Database Architecture:** Cloud Firestore with Firestore Security Rules, Firebase Authentication, and server-authoritative Express endpoints.

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

## 4. Firebase and Server Configuration

NEXORA uses Firebase Authentication, Cloud Firestore (including a configured named database), and Firebase Storage. The active access policies are in `firestore.rules` and `storage.rules`. Deploy these rules separately with the Firebase CLI; pushing the rule files to Vercel does **not** activate them.

Set `FOUNDER_EMAIL`, `OTP_HMAC_SECRET` (at least 32 random characters), `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and Firebase Admin credentials in your server's secret environment, never in Git. Keep client Firebase configuration restricted by Firebase Auth, Security Rules, and Google Cloud API key restrictions; Firebase browser API keys are public identifiers rather than server secrets.

For isolated preview environments, define `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID`, and `VITE_FIRESTORE_DATABASE_ID` in Vercel Preview environment variables.

Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` before deploying.

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
