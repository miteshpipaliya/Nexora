import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Target, 
  Lightbulb, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const faqs = [
    {
      q: 'What is the current official status of NEXORA at BVM?',
      a: 'NEXORA is a student-initiated proposal conceptualized by students at Birla Vishvakarma Mahavidyalaya (BVM). It is currently being prepared for formal review and mentorship under distinguished faculty guidance before seeking official college ratification.'
    },
    {
      q: 'How does NEXORA differ from standard college departmental clubs?',
      a: 'Most clubs operate within single engineering disciplines. NEXORA is built from the ground up as a cross-disciplinary innovation platform connecting Electronics, Computer, IT, Mechanical, and Civil students with intercollege peers.'
    },
    {
      q: 'Can students from other engineering colleges participate?',
      a: 'Yes. Beginning with our intercollege expansion phase, students from GCET, ADIT, CHARUSAT, DDU, and other regional institutions are welcome in open competitions.'
    },
    {
      q: 'How are competition fees handled?',
      a: 'All fee schedules shown on the platform are proposed draft rates (₹50 for BVM students, ₹70 for external participants). No financial transactions occur until institutional approval is granted.'
    }
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full">
          <span>Vision &amp; Institutional Proposal</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Beyond a Club. The Beginning of a New Tech Era.
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
          NEXORA is envisioned as an autonomous, student-driven technology and innovation platform at Birla Vishvakarma Mahavidyalaya (BVM), Vallabh Vidyanagar.
        </p>
      </div>

      {/* Institutional Transparency Box */}
      <div className="max-w-4xl mx-auto p-6 bg-[#171426] border border-violet-500/30 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <span>Institutional Status Disclosure</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          NEXORA is currently a <strong>proposed student-led initiative</strong> designed to demonstrate this vision to faculty mentors, department heads, and college authorities. We do not represent ourselves as an already ratified or official entity until authorized through established institutional channels.
        </p>
      </div>

      {/* The Core Purpose */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Our Mission</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            To provide every engineering student at BVM with the platform, peers, and competitive arena needed to turn classroom theoretical knowledge into working prototypes and software.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Cross-Disciplinary DNA</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Modern breakthroughs happen at intersections. Electronics hardware needs software; AI requires infrastructure; mechanical systems require cyber-physical intelligence.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">BVM Heritage</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Rooted in Birla Vishvakarma Mahavidyalaya&apos;s celebrated 75+ year legacy as Gujarat&apos;s premier engineering institution, striving to set a modern benchmark for student innovation.
          </p>
        </div>
      </div>

      {/* The Five Pillars of Operation */}
      <div className="p-8 md:p-12 bg-[#11101B] border border-violet-500/20 rounded-3xl space-y-8">
        <div>
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            OPERATIONAL FRAMEWORK
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            How NEXORA Will Function
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Hands-On Technical Competitions</strong>
              Regularly scheduled technical challenges starting with ZeroCode, CTF, Hackathons, and CodeRush.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Faculty Guidance &amp; Academic Integrity</strong>
              Structured mentorship ensuring all activities align with BVM academic standards and university codes of conduct.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Merit-Based Student Portfolios</strong>
              Every registration and competition achievement is documented on the student&apos;s NEXORA digital profile for career portfolios.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Transparent Governance</strong>
              Open communication, clear financial reporting, and zero tolerance for plagiarism or unauthorized access.
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-400">
            Clarifying questions for students, faculty mentors, and academic administrators.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="p-6 bg-[#171426] border border-violet-500/20 rounded-xl space-y-2"
            >
              <h4 className="text-base font-semibold text-white">
                {faq.q}
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-8">
        <Link
          to="/competitions"
          className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-lg"
        >
          <span>Explore Proposed Competitions</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
