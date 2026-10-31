import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, ShieldAlert, Cpu, Terminal, Users, Trophy } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';
import { CompetitionCardImage } from '../../components/ui/CompetitionCardImage';
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
      case 'coderush': return Terminal;
      case 'pathfinder': return Cpu;
      case 'ctf': return ShieldAlert;
      case 'roborace': return Cpu;
      case 'brainbattle': return Trophy;
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
          {events.map((event, idx) => {
            const isComingSoon = Boolean(event.isComingSoon);

            return (
              <div
                key={event.id}
                role={isComingSoon ? 'article' : 'link'}
                tabIndex={isComingSoon ? -1 : 0}
                aria-label={isComingSoon ? `${event.title} (Coming Soon)` : `Explore ${event.title}`}
                onClick={() => {
                  if (!isComingSoon) {
                    navigate(`/competitions/${event.slug}`);
                  }
                }}
                onKeyDown={(e) => {
                  if (!isComingSoon && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    navigate(`/competitions/${event.slug}`);
                  }
                }}
                className={`relative rounded-2xl bg-[#171426] border overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                  isComingSoon
                    ? 'border-violet-500/15 cursor-default shadow-none'
                    : 'border-violet-500/20 group hover:border-violet-400/50 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.25)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400'
                }`}
              >
                {/* Entire Card Content Wrapper (Blurred when Coming Soon) */}
                <div className={`flex flex-col flex-1 justify-between transition-all duration-300 ${
                  isComingSoon ? 'filter blur-sm opacity-40 select-none pointer-events-none' : ''
                }`}>
                  {/* Event Image */}
                  <CompetitionCardImage
                    event={event}
                    className="w-full aspect-[16/9]"
                    isComingSoon={false}
                    priority={idx < 4}
                    hideInnerOverlay={true}
                  />

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
                        <div className={isComingSoon ? 'text-amber-400' : event.registration_open ? 'text-emerald-400' : 'text-slate-400'}>
                          {isComingSoon ? 'Coming Soon' : event.registration_open ? 'Registration Open' : 'Registration Closed'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isComingSoon ? (
                          <>
                            <button
                              type="button"
                              disabled
                              tabIndex={-1}
                              className="px-4 py-2 text-xs font-medium text-slate-500 bg-[#11101B]/50 border border-slate-700/30 rounded-xl cursor-not-allowed"
                            >
                              Details &amp; Rules
                            </button>
                            <button
                              type="button"
                              disabled
                              tabIndex={-1}
                              className="px-4 py-2 text-xs font-semibold text-amber-300/60 bg-amber-950/30 border border-amber-500/20 rounded-xl cursor-not-allowed"
                            >
                              Coming Soon
                            </button>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sharp Overlay Sibling on Top */}
                {isComingSoon && (
                  <div
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-[2px] text-center select-none"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    aria-hidden="true"
                  >
                    <div className="px-5 py-2 rounded-full bg-violet-950/90 border border-violet-400/50 shadow-[0_0_25px_rgba(139,92,246,0.6)] mb-3">
                      <span className="text-base sm:text-lg font-black tracking-widest text-violet-200 font-mono">
                        COMING SOON
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-mono text-slate-300 tracking-wide max-w-xs">
                      Details &amp; Registration Opening Soon
                    </p>
                  </div>
                )}
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
