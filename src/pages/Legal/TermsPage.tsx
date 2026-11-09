import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
          <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
          <span>Rules of Engagement</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Terms &amp; Participation Guidelines
        </h1>
        <p className="text-sm text-slate-400 font-mono">
          Proposed Student Community Charter · Birla Vishvakarma Mahavidyalaya (BVM)
        </p>
      </div>

      <div className="prose-rules space-y-8 text-sm text-slate-300 leading-relaxed selectable-content">
        
        <section className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white">
            1. Institutional Proposal Status
          </h2>
          <p>
            NEXORA is a student-initiated vision designed to foster multidisciplinary engineering collaboration. By creating an account or submitting an event registration, you acknowledge that all events, dates, prize structures, and fees are currently <strong>proposed</strong>, subject to formal faculty council and BVM college administrative review.
          </p>
        </section>

        <section className="p-6 bg-[#11101B] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white">
            2. Academic Integrity &amp; Ethical Conduct
          </h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span><strong>Zero Plagiarism:</strong> In ZeroCode, Hackathon, and CodeRush, all submissions must reflect authentic student work. Submitting pre-built external code as original work is strictly prohibited.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span><strong>Cybersecurity Ethics:</strong> For CTF participants, attacks against live campus infrastructure, denial of service, or unauthorized network intrusions are illegal and will result in immediate disqualification and academic reporting.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span><strong>Respectful Collaboration:</strong> Harassment, discriminatory language, or unsportsmanlike behavior across branches or colleges is not tolerated.</span>
            </li>
          </ul>
        </section>

        <section className="p-6 bg-[#11101B] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white">
            3. Fee &amp; Payment Safeguards
          </h2>
          <p>
            The proposed pricing tiers (₹50 for BVM students, ₹70 for students from other institutions) reflect anticipated administrative cost recoveries. No actual monetary payments are collected or authorized on this web portal until official banking and institutional permissions are ratified.
          </p>
        </section>

        <section className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-white">
            4. Changes to Terms
          </h2>
          <p>
            As NEXORA progresses through formal faculty review and CVM/BVM university channels, updated guidelines will be posted on this website with clear revision timestamps.
          </p>
        </section>

      </div>
    </div>
  );
};
