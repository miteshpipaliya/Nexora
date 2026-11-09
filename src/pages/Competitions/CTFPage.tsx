import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Terminal, 
  Key, 
  Lock, 
  Flag, 
  CheckCircle2, 
  ArrowLeft, 
  Check, 
  X,
  FileSearch,
  Binary,
  Trophy,
  Gift
} from 'lucide-react';
import { INITIAL_EVENTS } from '../../services/mockData';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';

export const CTFPage: React.FC = () => {
  const event = INITIAL_EVENTS.find((e) => e.slug === 'ctf')!;
  const [modalOpen, setModalOpen] = useState(false);

  // Interactive Non-Sensitive Demonstration Flag Challenge
  const [demoInput, setDemoInput] = useState('');
  const [demoSolved, setDemoSolved] = useState<boolean | null>(null);

  const handleTestFlag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = demoInput.trim();
    if (clean === 'NEXORA{cyber_defense_inauguration_2026}' || clean === 'NEXORA{bvm_security_first}') {
      setDemoSolved(true);
    } else {
      setDemoSolved(false);
    }
  };

  const categories = [
    { title: 'Web Security', desc: 'Inspect HTTP headers, cookie signatures, and client-side access control vulnerabilities.', icon: Lock },
    { title: 'Cryptography', desc: 'Deconstruct classic ciphers, modular arithmetic keys, and modern hash digests.', icon: Key },
    { title: 'Digital Forensics', desc: 'Carve metadata from packet captures (PCAP) and uncover stenographic hidden layers.', icon: FileSearch },
    { title: 'OSINT', desc: 'Conduct ethical open-source reconnaissance to piece together digital footprint timelines.', icon: Terminal },
    { title: 'Reverse Engineering', desc: 'Dissect compiled executable logic and trace binary instruction flows.', icon: Binary },
    { title: 'Logic Security Puzzles', desc: 'Solve cryptographic matrices and cybersecurity reasoning riddles.', icon: Flag }
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      {/* Back Link */}
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
            <span>Cybersecurity Challenge</span>
            <span>·</span>
            <span>ID Format: CTF-XXXX</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight user-select-none">
            CTF — THINK LIKE A HACKER. SOLVE LIKE AN ENGINEER.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2 user-select-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Terminal className="w-4 h-4 text-violet-400" />
              <span>Format: Jeopardy Style</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Flag className="w-4 h-4 text-violet-400" />
              <span>Flag Format: NEXORA&#123;...&#125;</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-[0_0_25px_-5px_rgba(139,92,246,0.6)] cursor-pointer"
            >
              Register for CTF
            </button>
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
                alt="Cybersecurity Network Shield"
                referrerPolicy="no-referrer"
                className="w-full h-72 sm:h-80 object-cover"
              />
            )}
            <div className="p-4 bg-[#11101B] border-t border-violet-500/15 text-xs text-slate-400 flex items-center justify-between font-mono user-select-none">
              <span>Domain: Defensive Security</span>
              <span className="text-violet-400">ID Prefix: CTF-</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 8: Premium Prize Pool Section */}
      <div className="p-8 md:p-10 rounded-2xl bg-gradient-to-br from-[#171426] to-[#11101B] border border-violet-500/30 shadow-xl space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-semibold">
            OFFICIAL AWARDS &amp; RECOGNITION
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            CTF Prize Structure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-[#11101B] border border-violet-500/30 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-amber-400 font-semibold uppercase user-select-none">
                1st Place Cyber Champion
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                ₹2,000
              </div>
              <p className="text-xs text-slate-400 font-light">
                Awarded to the top flag-capturing participant or duo with the highest validated point total.
              </p>
            </div>
          </div>

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
                NEXORA cybersecurity security badges and exclusive surprise kits for the top 7 leaderboard entries.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demonstration Flag Simulator */}
      <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/25 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-mono text-violet-400 uppercase tracking-widest user-select-none">
              INTERACTIVE DEMO (NON-SENSITIVE)
            </span>
            <h2 className="text-2xl font-bold text-white mt-1 user-select-none">
              How Flags Work in NEXORA CTF
            </h2>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-violet-950/80 text-violet-300 border border-violet-500/20 rounded user-select-none">
            Safe Educational Sandbox
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl font-light">
          In a Capture The Flag event, solving an algorithmic puzzle, uncovering an encrypted clue, or analyzing a memory snapshot reveals a cryptographic flag string. Try testing our demo flag submission below!
        </p>

        {/* Demo Challenge Clue */}
        <div className="p-4 bg-[#171426] border border-violet-500/20 rounded-xl space-y-3 font-mono text-xs">
          <div className="text-slate-400">Sample Clue (ROT13 Encoded):</div>
          <div className="p-3 bg-[#08080D] rounded-lg text-violet-300 select-all border border-violet-500/15">
            ARKBEN&#123;plore_qrsrafr_vanhthengvba_2026&#125;
          </div>
          <div className="text-[11px] text-slate-500">
            Hint: Decrypt ROT13 or submit: <code className="text-violet-400 select-all">NEXORA&#123;cyber_defense_inauguration_2026&#125;</code>
          </div>
        </div>

        <form onSubmit={handleTestFlag} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            placeholder="NEXORA{your_flag_here}"
            value={demoInput}
            onChange={(e) => setDemoInput(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs font-mono bg-[#171426] border border-violet-500/25 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-400 select-text"
          />
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors cursor-pointer"
          >
            Verify Flag
          </button>
        </form>

        {demoSolved === true && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Success! Valid flag format recognized (+100 demo points recorded).</span>
          </div>
        )}
        {demoSolved === false && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <X className="w-4 h-4 text-red-400 shrink-0" />
            <span>Incorrect flag string. Check your cipher decryption and try again.</span>
          </div>
        )}
      </div>

      {/* Six Proposed Categories */}
      <div className="space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            SKILL DOMAINS
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Challenge Categories
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="p-6 bg-[#171426] border border-violet-500/15 rounded-xl space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-500/25 flex items-center justify-center text-violet-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white user-select-none">{cat.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light select-text">{cat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strict Ethical Rules */}
      <div className="p-8 rounded-2xl bg-[#171426] border border-violet-500/25 space-y-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 user-select-none">
          <ShieldAlert className="w-5 h-5 text-violet-400" />
          <span>Strict Rules of Engagement</span>
        </h2>
        <div className="space-y-3 text-sm text-slate-300 select-text">
          {event.rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span>{rule}</span>
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
