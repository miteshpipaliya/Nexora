import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code2, ShieldAlert, Cpu, Terminal, Users, Trophy } from 'lucide-react';
import { INITIAL_EVENTS } from '../../services/mockData';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';
import { CompetitionEvent } from '../../types';

export const CompetitionsHubPage: React.FC = () => {
  const [selectedEventForModal, setSelectedEventForModal] = useState<CompetitionEvent | null>(null);

  const getEventIcon = (slug: string) => {
    switch (slug) {
      case 'zerocode': return Code2;
      case 'ctf': return ShieldAlert;
      case 'hackathon': return Users;
      case 'coderush': return Terminal;
      default: return Cpu;
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full user-select-none">
          <span>Official Event Portfolio</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight user-select-none">
          NEXORA Competitions
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
          Four flagship technical challenges designed to test creativity, engineering rigor, cybersecurity instincts, and algorithmic endurance.
        </p>
      </div>

      {/* Grid of the 4 Primary Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {INITIAL_EVENTS.map((event) => {
          const Icon = getEventIcon(event.slug);
          return (
            <div
              key={event.id}
              className="rounded-2xl bg-[#171426] border border-violet-500/20 overflow-hidden flex flex-col justify-between group hover:border-violet-400/50 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.2)] transition-all duration-300"
            >
              {/* Event Image */}
              <div className="relative h-56 w-full overflow-hidden bg-violet-950/40">
                {event.banner_image ? (
                  <img
                    src={event.banner_image}
                    alt={event.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-violet-950/20">
                    <Icon className="w-16 h-16 text-violet-500/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#171426] via-transparent to-transparent" />

                <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono user-select-none">
                  <span className="text-slate-200 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10">
                    {event.category}
                  </span>
                  <span className="text-violet-300 bg-violet-950/90 backdrop-blur-md px-2.5 py-1 rounded border border-violet-500/30">
                    {event.status} Event
                  </span>
                </div>
              </div>

              {/* Event Body */}
              <div className="p-6 md:p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 user-select-none">
                    <span>Difficulty:</span>
                    <span className="text-violet-300 font-semibold">{event.difficulty}</span>
                    <span>·</span>
                    <span>Fee: ₹50</span>
                  </div>

                  <h2 className="text-2xl font-bold text-white group-hover:text-violet-300 transition-colors user-select-none">
                    {event.title}
                  </h2>

                  <p className="text-xs font-mono text-violet-400 user-select-none">
                    {event.tagline}
                  </p>

                  <p className="text-sm text-slate-300 leading-relaxed select-text">
                    {event.description}
                  </p>

                  {/* Prize Banner Preview */}
                  <div className="p-3 bg-[#11101B] border border-violet-500/20 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5 user-select-none">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>1st Place:</span>
                    </span>
                    <span className="text-amber-400 font-bold">{event.prizes.first_place}</span>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="pt-6 border-t border-violet-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs font-mono text-slate-400 user-select-none">
                    <div>Capacity: {event.capacity} seats</div>
                    <div className="text-violet-300 font-medium">Uniform Fee: ₹50 per participant</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/competitions/${event.slug}`}
                      className="px-4 py-2 text-xs font-medium text-slate-200 bg-[#11101B] border border-violet-500/25 rounded-lg hover:text-white hover:border-violet-400 transition-colors flex items-center gap-1.5"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setSelectedEventForModal(event)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors shadow-sm cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedEventForModal && (
        <EventRegistrationModal
          event={selectedEventForModal}
          isOpen={Boolean(selectedEventForModal)}
          onClose={() => setSelectedEventForModal(null)}
        />
      )}
    </div>
  );
};
