import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, ShieldAlert, Cpu, Terminal, Users, Trophy } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';
import { CompetitionEvent } from '../../types';

export const CompetitionsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CompetitionEvent | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Real-time Firestore subscription
    const unsubscribe = dataService.subscribeEvents((allEvents: CompetitionEvent[]) => {
      // Filter out Draft and Archived competitions from public view
      const published = allEvents.filter(
        (e: CompetitionEvent) => e.status !== 'Draft' && e.status !== 'Archived'
      );
      setEvents(published);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getEventIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'zerocode': return Code2;
      case 'ctf': return ShieldAlert;
      case 'hackathon': return Users;
      case 'coderush': return Terminal;
      default: return Cpu;
    }
  };

  const handleImageError = (id: string) => {
    setBrokenImages((prev) => ({ ...prev, [id]: true }));
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
          Flagship technical challenges designed to test creativity, engineering rigor, cybersecurity instincts, and algorithmic endurance.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-mono text-slate-400">Loading competition portfolio...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center p-8 bg-[#171426] border border-violet-500/20 rounded-2xl max-w-md mx-auto space-y-3">
          <Trophy className="w-10 h-10 text-violet-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Competitions Active</h3>
          <p className="text-xs text-slate-400">
            Competitions will appear here as soon as they are announced by the NEXORA team.
          </p>
        </div>
      ) : (
        /* Grid of Real-Time Events */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map((event) => {
            const Icon = getEventIcon(event.slug);
            const isBroken = Boolean(brokenImages[event.id]);
            const imageSrc = event.cover_image || event.banner_image || '/images/competitions/zerocode.jpg';

            return (
              <div
                key={event.id}
                role="link"
                tabIndex={0}
                aria-label={`Explore ${event.title}`}
                onClick={() => navigate(`/competitions/${event.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/competitions/${event.slug}`);
                  }
                }}
                className="rounded-2xl bg-[#171426] border border-violet-500/20 overflow-hidden flex flex-col justify-between group hover:border-violet-400/50 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.25)] transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                {/* Event Image */}
                <div className="relative h-56 w-full overflow-hidden bg-violet-950/40">
                  {imageSrc && !isBroken ? (
                    <img
                      src={imageSrc}
                      alt={event.title}
                      onError={() => handleImageError(event.id)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-950/60 to-purple-950/40 text-violet-400 p-6 text-center">
                      <Icon className="w-16 h-16 text-violet-400/70 mb-2" />
                      <span className="text-xs font-mono text-violet-300/80">{event.title}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171426] via-transparent to-transparent pointer-events-none" />

                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono user-select-none pointer-events-none">
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
                      <span>Fee: {event.fee_per_participant === 0 ? 'Free' : `₹${event.fee_per_participant}`}</span>
                    </div>

                    <h2 className="text-2xl font-bold text-white group-hover:text-violet-300 transition-colors user-select-none">
                      {event.title}
                    </h2>

                    <p className="text-xs font-mono text-violet-400 tracking-wide user-select-none">
                      {event.tagline}
                    </p>

                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 select-text">
                      {event.short_description || event.description}
                    </p>

                    <div className="pt-2 flex items-center gap-2 text-xs font-mono text-amber-400">
                      <Trophy className="w-4 h-4 shrink-0" />
                      <span>1st Prize: {event.prizes?.first_place || '₹2,000 Cash Prize'}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-violet-500/15 flex items-center justify-between gap-4">
                    <div className="text-xs font-mono text-slate-400 user-select-none">
                      <div>Capacity: {event.capacity} seats</div>
                      <div className="text-emerald-400">
                        {event.registration_open ? 'Registration Open' : 'Registration Closed'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        to={`/competitions/${event.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 text-xs font-medium text-slate-200 bg-[#11101B] border border-violet-500/25 rounded-xl hover:text-white hover:border-violet-400 transition-colors"
                      >
                        Details &amp; Rules
                      </Link>

                      {event.registration_open && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventForModal(event);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md cursor-pointer"
                        >
                          Register
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Modal */}
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
