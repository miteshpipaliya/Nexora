import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Terminal, 
  Clock, 
  Code2, 
  CheckCircle2, 
  Trophy, 
  AlertCircle, 
  ArrowLeft,
  Server,
  Gift
} from 'lucide-react';
import { INITIAL_EVENTS } from '../../services/mockData';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';

export const CodeRushPage: React.FC = () => {
  const event = INITIAL_EVENTS.find((e) => e.slug === 'coderush')!;
  const [modalOpen, setModalOpen] = useState(false);

  // Future Leaderboard Architecture Mock
  const leaderboardMock = [
    { rank: 1, handle: 'coder_bvm_01', solved: '10/10', penalty: '112 min', branch: 'Computer Eng.' },
    { rank: 2, handle: 'algo_matrix', solved: '9/10', penalty: '98 min', branch: 'Electronics Eng.' },
    { rank: 3, handle: 'syntax_rush', solved: '9/10', penalty: '144 min', branch: 'IT' },
    { rank: 4, handle: 'charusat_coder', solved: '8/10', penalty: '86 min', branch: 'Computer Science' },
    { rank: 5, handle: 'bvm_circuit', solved: '8/10', penalty: '110 min', branch: 'Electronics Eng.' }
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
            <span>Competitive Programming Challenge</span>
            <span>·</span>
            <span>ID Format: CR-XXXX</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight user-select-none">
            CODERUSH — TEN PROBLEMS. ONE LEADERBOARD.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2 user-select-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Contest Clock: 2.5 Hours</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Code2 className="w-4 h-4 text-violet-400" />
              <span>C · C++ · Python · Java</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-[0_0_25px_-5px_rgba(139,92,246,0.6)] cursor-pointer"
            >
              Register for CodeRush
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
                alt="CodeRush Algorithmic Arena"
                referrerPolicy="no-referrer"
                className="w-full h-72 sm:h-80 object-cover"
              />
            )}
            <div className="p-4 bg-[#11101B] border-t border-violet-500/15 text-xs text-slate-400 flex items-center justify-between font-mono user-select-none">
              <span>Independent Platform Event</span>
              <span className="text-violet-400">ID Prefix: CR-</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 9: Premium Prize Pool Section */}
      <div className="p-8 md:p-10 rounded-2xl bg-gradient-to-br from-[#171426] to-[#11101B] border border-violet-500/30 shadow-xl space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-semibold">
            OFFICIAL AWARDS &amp; RECOGNITION
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            CodeRush Prize Structure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-[#11101B] border border-violet-500/30 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-amber-400 font-semibold uppercase user-select-none">
                1st Place Algorithmic Champion
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                ₹2,000
              </div>
              <p className="text-xs text-slate-400 font-light">
                Awarded to the fastest participant solving all ten problems with minimum penalty minutes.
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
                Special NEXORA competitive programming merchandise packages for the top 7 scoreboard finishers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Architecture Disclosure */}
      <div className="p-6 bg-[#171426] border border-violet-500/25 rounded-2xl flex items-start gap-3">
        <Server className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-300">
          <strong className="text-white block text-sm user-select-none">Online Judge Architecture Notice</strong>
          <p className="leading-relaxed">
            In accordance with sound security engineering, NEXORA never runs untrusted user code on the primary application web server. Contest execution is architected to interface with an isolated, sandboxed judge cluster upon event activation.
          </p>
        </div>
      </div>

      {/* Ten Problems Structure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#11101B] border border-violet-500/20 rounded-xl space-y-3">
          <span className="text-xs font-mono text-emerald-400 font-semibold uppercase user-select-none">Tiers 1–3</span>
          <h3 className="text-lg font-bold text-white user-select-none">3 Easy Problems</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
            Basic data structures, array rotations, string manipulations, and simple arithmetic complexity.
          </p>
        </div>

        <div className="p-6 bg-[#11101B] border border-violet-500/20 rounded-xl space-y-3">
          <span className="text-xs font-mono text-amber-400 font-semibold uppercase user-select-none">Tiers 4–7</span>
          <h3 className="text-lg font-bold text-white user-select-none">4 Medium Problems</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
            Greedy algorithms, binary search variants, recursion, trees, hash map optimizations, and two-pointer passes.
          </p>
        </div>

        <div className="p-6 bg-[#11101B] border border-violet-500/20 rounded-xl space-y-3">
          <span className="text-xs font-mono text-red-400 font-semibold uppercase user-select-none">Tiers 8–10</span>
          <h3 className="text-lg font-bold text-white user-select-none">3 Hard Problems</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
            Dynamic programming over subsets, shortest path graph flows, segment trees, and modular inverse combinatorics.
          </p>
        </div>
      </div>

      {/* Leaderboard Showcase */}
      <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/25 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-mono text-violet-400 uppercase tracking-widest user-select-none">
              CONTEST INTERFACE PREVIEW
            </span>
            <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2 user-select-none">
              <Trophy className="w-5 h-5 text-violet-400" />
              <span>Live Leaderboard Prototype</span>
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 user-select-none">
            Automated Rank Calculation Engine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-violet-500/20 text-slate-400">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Handle</th>
                <th className="py-2.5 px-3">Solved</th>
                <th className="py-2.5 px-3">Time Penalty</th>
                <th className="py-2.5 px-3">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-slate-300">
              {leaderboardMock.map((entry) => (
                <tr key={entry.rank} className="hover:bg-violet-950/20 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-violet-400">#{entry.rank}</td>
                  <td className="py-2.5 px-3 font-semibold text-white select-text">{entry.handle}</td>
                  <td className="py-2.5 px-3 text-emerald-400 tabular-nums">{entry.solved}</td>
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums">{entry.penalty}</td>
                  <td className="py-2.5 px-3 text-slate-400">{entry.branch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules */}
      <div className="p-8 rounded-2xl bg-[#171426] border border-violet-500/20 space-y-4">
        <h2 className="text-xl font-bold text-white user-select-none">Contest Regulations</h2>
        <div className="space-y-2 text-sm text-slate-300 select-text">
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
