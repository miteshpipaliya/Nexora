import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Leaf, 
  Globe, 
  HelpCircle, 
  ArrowLeft,
  Trophy,
  Gift
} from 'lucide-react';
import { INITIAL_EVENTS } from '../../services/mockData';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';

export const HackathonPage: React.FC = () => {
  const event = INITIAL_EVENTS.find((e) => e.slug === 'hackathon')!;
  const [modalOpen, setModalOpen] = useState(false);

  const stages = [
    {
      stage: 'Phase 01',
      title: 'Problem Ideation & Architecture',
      duration: 'Opening Phase',
      desc: 'Form or confirm multidisciplinary teams, analyze real-world challenge domains, and draft system architecture specifications.'
    },
    {
      stage: 'Phase 02',
      title: 'Prototype Build Sprint',
      duration: 'Core Sprint Window',
      desc: 'Hands-on engineering sprint building working software services, IoT hardware circuitry, and AI model pipelines.'
    },
    {
      stage: 'Phase 03',
      title: 'Jury Demonstration & Defense',
      duration: 'Final Evaluation',
      desc: 'Live functional demonstration before faculty evaluators and invited technical jury members.'
    }
  ];

  const tracks = [
    { title: 'Artificial Intelligence & Machine Learning', icon: Sparkles, desc: 'Applied intelligence for real-world automation and decision intelligence.' },
    { title: 'Web & Mobile Next-Gen Platforms', icon: Globe, desc: 'Scalable cloud applications, progressive web systems, and student utility tools.' },
    { title: 'Electronics, Embedded Systems & IoT', icon: Cpu, desc: 'Microcontrollers, sensor telemetry, and smart connected campus hardware.' },
    { title: 'Robotics & Industrial Automation', icon: Layers, desc: 'Autonomous rovers, mechanical manipulators, and mechatronic feedback loops.' },
    { title: 'Sustainability & Green Campus Tech', icon: Leaf, desc: 'Energy harvesting, water management, and eco-friendly smart infrastructure.' },
    { title: 'Open Student Innovation', icon: Users, desc: 'Unconstrained bold student solutions addressing societal and engineering hurdles.' }
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
            <span>Collaborative Innovation Sprint</span>
            <span>·</span>
            <span>ID Format: HN-XXXX</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight user-select-none">
            HACKATHON — FROM IDEA TO IMPACT.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2 user-select-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span>Event duration and schedule will be announced.</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171426] border border-violet-500/20 rounded-lg">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Team: 1–4 Members</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-[0_0_25px_-5px_rgba(139,92,246,0.6)] cursor-pointer"
            >
              Register Team for Hackathon
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
                alt="Student Hardware and Software Hackathon"
                referrerPolicy="no-referrer"
                className="w-full h-72 sm:h-80 object-cover"
              />
            )}
            <div className="p-4 bg-[#11101B] border-t border-violet-500/15 text-xs text-slate-400 flex items-center justify-between font-mono user-select-none">
              <span>Cross-Departmental Teams</span>
              <span className="text-violet-400">ID Prefix: HN-</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 10: Hackathon Prize Structure */}
      <div className="p-8 md:p-10 rounded-2xl bg-gradient-to-br from-[#171426] to-[#11101B] border border-violet-500/30 shadow-xl space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-semibold">
            OFFICIAL AWARDS &amp; RECOGNITION
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Hackathon Prize Structure
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1st Team */}
          <div className="p-5 rounded-xl bg-[#11101B] border border-violet-500/30 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-amber-400 font-semibold uppercase user-select-none">
              1st Team Winner
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              ₹4,000
            </div>
            <p className="text-[11px] text-slate-400 font-light">
              Top overall multidisciplinary engineering prototype.
            </p>
          </div>

          {/* 2nd Team */}
          <div className="p-5 rounded-xl bg-[#11101B] border border-violet-500/30 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-slate-200">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-300 font-semibold uppercase user-select-none">
              2nd Team Runner-Up
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              ₹2,500
            </div>
            <p className="text-[11px] text-slate-400 font-light">
              Outstanding technical execution &amp; defense.
            </p>
          </div>

          {/* 3rd Team */}
          <div className="p-5 rounded-xl bg-[#11101B] border border-violet-500/30 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-amber-500 font-semibold uppercase user-select-none">
              3rd Team Place
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              ₹1,000
            </div>
            <p className="text-[11px] text-slate-400 font-light">
              Demonstrated viable community impact.
            </p>
          </div>

          {/* Special Rewards */}
          <div className="p-5 rounded-xl bg-[#11101B] border border-violet-500/30 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Gift className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-violet-400 font-semibold uppercase user-select-none">
              Top 4 Teams
            </div>
            <div className="text-lg font-bold text-white">
              Surprise Gifts
            </div>
            <p className="text-[11px] text-slate-400 font-light">
              Exclusive surprise gifts and hardware toolkits for all members.
            </p>
          </div>
        </div>
      </div>

      {/* Hackathon Stages */}
      <div className="space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            CHRONOLOGY
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Competition Stages
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stages.map((st) => (
            <div
              key={st.stage}
              className="p-6 bg-[#171426] border border-violet-500/20 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono border-b border-violet-500/15 pb-2 user-select-none">
                <span className="text-violet-400 font-bold">{st.stage}</span>
                <span className="text-slate-400">{st.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-white user-select-none">{st.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light select-text">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Six Proposed Tracks */}
      <div className="space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            CHALLENGE DOMAINS
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Six Innovation Tracks
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => {
            const Icon = track.icon;
            return (
              <div
                key={track.title}
                className="p-6 bg-[#11101B] border border-violet-500/15 rounded-xl space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-500/25 flex items-center justify-center text-violet-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white user-select-none">{track.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light select-text">{track.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Judging Criteria */}
      <div className="p-8 md:p-10 rounded-2xl bg-[#171426] border border-violet-500/25 space-y-6">
        <div className="user-select-none">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            JURY WEIGHTS
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Judging Criteria
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {event.judging_criteria.map((item) => (
            <div
              key={item.label}
              className="p-5 bg-[#11101B] border border-violet-500/15 rounded-xl space-y-2"
            >
              <div className="text-3xl font-extrabold text-violet-400 font-mono">
                {item.percentage}%
              </div>
              <h3 className="text-sm font-bold text-white user-select-none">
                {item.label}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-4">
        <h2 className="text-xl font-bold text-white user-select-none">Team Participation Regulations</h2>
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
