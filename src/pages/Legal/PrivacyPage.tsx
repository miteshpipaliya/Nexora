import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowLeft, Lock } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
          <span>Student Data Protection Statement</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-400 font-mono">
          Last revised: October 2026 · NEXORA Student Initiative at BVM
        </p>
      </div>

      <div className="prose-rules space-y-8 text-sm text-slate-300 leading-relaxed selectable-content">
        
        <section className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-400" />
            <span>1. Information We Collect</span>
          </h2>
          <p>
            When registering on NEXORA or enrolling in technical competitions (ZeroCode, CTF, Hackathon, CodeRush), we collect only the necessary details to organize the event and maintain student academic integrity:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Full Name</li>
            <li>College / University Email &amp; Contact Number (WhatsApp for coordination)</li>
            <li>Institution (e.g. BVM, GCET, ADIT, CHARUSAT)</li>
            <li>Engineering Branch &amp; Academic Year</li>
            <li>College Enrollment Number / Student ID</li>
            <li>Class Division (if applicable)</li>
            <li>Team specifications (for collaborative events)</li>
          </ul>
        </section>

        <section className="p-6 bg-[#11101B] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white">
            2. Purpose of Collection
          </h2>
          <p>
            Your information is used strictly for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Verifying student eligibility and calculating the applicable fee tier (BVM vs. External).</li>
            <li>Issuing official competition reference credentials and entry vouchers.</li>
            <li>Communicating problem statements, stage timelines, and jury evaluation schedules.</li>
            <li>Documenting verified participation certificates post-competition.</li>
          </ul>
        </section>

        <section className="p-6 bg-[#11101B] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white">
            3. Data Access &amp; Protection
          </h2>
          <p>
            Student enrollment numbers, telephone numbers, and private profiles are never sold, rented, or exposed publicly. Only authorized student organizers and designated BVM faculty advisors retain administrative review rights.
          </p>
        </section>

        <section className="p-6 bg-[#11101B] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white">
            4. Correction or Deletion Requests
          </h2>
          <p>
            Any participant may review, edit, or request complete purge of their registration record by navigating to their Student Profile dashboard or reaching out directly to the organizer.
          </p>
        </section>

        <section className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-violet-400" />
            <span>5. Contact Organizers</span>
          </h2>
          <p>
            For privacy inquiries or institutional validation:
          </p>
          <div className="text-xs font-mono text-violet-300">
            Organizer: NEXORA Organizing Desk<br />
            Email: <a href="mailto:nexora.bvm@gmail.com" className="underline">nexora.bvm@gmail.com</a><br />
            Institution: Birla Vishvakarma Mahavidyalaya (BVM), Vallabh Vidyanagar, Gujarat, India
          </div>
        </section>

      </div>
    </div>
  );
};
