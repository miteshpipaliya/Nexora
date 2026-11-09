import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Code2, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  ShieldAlert, 
  FileCode, 
  ArrowLeft,
  Trophy,
  Gift
} from 'lucide-react';
import { INITIAL_EVENTS } from '../../services/mockData';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';

export const ZeroCodePage: React.FC = () => {
  const event = INITIAL_EVENTS.find((e) => e.slug === 'zerocode')!;
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      {/* Back button */}
      <div>
        <Link
          to="/competitions"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors user-select-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Competitions</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full user-select-none">
            <span>Proposed Flagship Challenge</span>
            <span>·</span>
            <span>ID Format: ZC-XXXX</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight user-select-none">
            ZEROCODE — BUILD WITH IDEAS, NOT JUST CODE.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2 user-select-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Duration: 70 Minutes</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Max AI Prompts: 5</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <FileCode className="w-4 h-4 text-violet-400" />
              <span>HTML / CSS / JS</span>
            </div>
          </div>

          {/* Action CTA & Fee */}
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {event.registration_open ? (
              <button
                onClick={() => setModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-[0_0_25px_-5px_rgba(139,92,246,0.6)] cursor-pointer"
              >
                Register for ZeroCode
              </button>
            ) : (
              <div className="px-6 py-3 text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg user-select-none">
                Registration opening soon.
              </div>
            )}
            <span className="text-xs text-slate-400 font-mono">
              Registration Fee: <strong className="text-violet-300">₹50</strong> per participant
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-2xl overflow-hidden border border-violet-500/25 bg-[#171426] shadow-2xl">
            {event.banner_image && (
              <img
                src={event.banner_image}
                alt="ZeroCode AI Interface"
                referrerPolicy="no-referrer"
                className="w-full h-72 sm:h-80 object-cover"
              />
            )}
            <div className="p-4 bg-[#11101B] border-t border-violet-500/15 text-xs text-slate-400 flex items-center justify-between font-mono user-select-none">
              <span>Category: AI &amp; Web Synthesis</span>
              <span className="text-violet-400">ID Prefix: ZC-</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 7: Premium Prize Pool Section */}
      <div className="p-8 md:p-10 rounded-2xl bg-gradient-to-br from-[#171426] to-[#11101B] border border-violet-500/30 shadow-xl space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-semibold">
            OFFICIAL AWARDS &amp; RECOGNITION
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            ZeroCode Prize Structure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1st Place Card */}
          <div className="p-6 rounded-xl bg-[#11101B] border border-violet-500/30 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-amber-400 font-semibold uppercase user-select-none">
                1st Place Champion
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                ₹2,000
              </div>
              <p className="text-xs text-slate-400 font-light">
                Awarded to the participant delivering the highest functioning, polished web experience adhering to the 5-prompt limit.
              </p>
            </div>
          </div>

          {/* Special Rewards Card */}
          <div className="p-6 rounded-xl bg-[#11101B] border border-violet-500/30 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
              <Gift className="w-6 h-6 text-violet-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-violet-400 font-semibold uppercase user-select-none">
                Top 7 Participants
              </div>
              <div className="text-xl font-bold text-white">
                Exclusive Surprise Gifts
              </div>
              <p className="text-xs text-slate-400 font-light">
                Custom commemorative NEXORA tech swag and surprise merchandise packages for the top 7 finalists.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Format & Rules Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Proposed Competition Format */}
        <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 user-select-none">
            <Code2 className="w-5 h-5 text-violet-400" />
            <span>Proposed Competition Format</span>
          </h2>
          <ul className="space-y-3 text-sm text-slate-300 select-text">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
              <span><strong>AI-Assisted Frontend Development:</strong> Rapid creation of a functional web application based on a live theme.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
              <span><strong>Problem Statement Reveal:</strong> Kept strictly confidential until the contest clock begins.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
              <span><strong>Constrained Prompt Limit:</strong> Exactly 5 prompt exchanges permitted with an approved AI model.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
              <span><strong>Submission &amp; Audit:</strong> Working single-page application files with full prompt history transcripts.</span>
            </li>
          </ul>
        </div>

        {/* Draft Regulations */}
        <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 user-select-none">
            <FileCode className="w-5 h-5 text-violet-400" />
            <span>Proposed Draft Rules</span>
          </h2>
          <div className="space-y-3 text-sm text-slate-300 select-text">
            {event.rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 p-3 bg-violet-950/30 border border-violet-500/20 rounded-lg text-xs text-slate-400 user-select-none">
            <ShieldAlert className="w-4 h-4 text-violet-400 inline mr-1.5" />
            <span>These are proposed NEXORA rules, not final approved regulations. Subject to faculty mentorship ratification.</span>
          </div>
        </div>
      </div>

      {/* Judging Criteria */}
      <div className="p-8 md:p-10 rounded-2xl bg-[#171426] border border-violet-500/25 space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            EVALUATION METRICS
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Judging Criteria
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {event.judging_criteria.map((item) => (
            <div
              key={item.label}
              className="p-5 bg-[#11101B] border border-violet-500/15 rounded-xl space-y-2"
            >
              <div className="text-3xl font-extrabold text-violet-400 font-mono">
                {item.percentage}%
              </div>
              <h3 className="text-base font-bold text-white user-select-none">
                {item.label}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 user-select-none">
          <HelpCircle className="w-5 h-5 text-violet-400" />
          <span>ZeroCode FAQs</span>
        </h2>
        <div className="space-y-4">
          {event.faq.map((item, i) => (
            <div key={i} className="p-5 bg-[#171426] border border-violet-500/15 rounded-xl space-y-1.5">
              <h4 className="text-sm font-semibold text-white user-select-none">{item.question}</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-light select-text">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <EventRegistrationModal
        event={event}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
