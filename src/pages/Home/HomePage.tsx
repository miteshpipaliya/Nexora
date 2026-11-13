import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  Cpu, 
  Terminal, 
  Code2, 
  Layers, 
  Rocket, 
  Users2, 
  AlertCircle,
  Trophy,
  Bell,
  Megaphone,
  X,
  ExternalLink,
  Radio,
  Users
} from 'lucide-react';
import { CosmicHeroObject } from '../../components/three/CosmicHeroObject';
import { dataService } from '../../services/dataService';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';
import { CompetitionEvent, SiteContent, InAppNotification } from '../../types';
import { CompetitionCardImage } from '../../components/ui/CompetitionCardImage';
import { RegistrationCounter } from '../../components/common/RegistrationCounter';

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});
  const [displayModes, setDisplayModes] = useState<Record<string, 'capacity' | 'count'>>({});
  const [selectedEventForModal, setSelectedEventForModal] = useState<CompetitionEvent | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Real-time events subscription
    const unsubEvents = dataService.subscribeEvents((allEvents: CompetitionEvent[]) => {
      const published = allEvents.filter(
        (e: CompetitionEvent) => e.status !== 'Draft' && e.status !== 'Archived'
      );
      setEvents(published);
    });

    // Real-time site content subscription
    const unsubContent = dataService.subscribeSiteContent((content: SiteContent) => {
      setSiteContent(content);
    });

    // Real-time notifications subscription
    const unsubNotifs = dataService.subscribeNotifications('all', (allNotifs: InAppNotification[]) => {
      const live = allNotifs.filter(n => n.status === 'Published');
      setNotifications(live);
    });

    return () => {
      unsubEvents();
      unsubContent();
      unsubNotifs();
    };
  }, []);

  const pillars = [
    {
      icon: Terminal,
      title: 'Learn',
      description: 'Acquire high-impact, industry-relevant engineering skills through hands-on technical workshops, toolkits, and mentor sessions.'
    },
    {
      icon: Cpu,
      title: 'Compete',
      description: 'Test your problem-solving abilities and algorithmic agility in collegiate programming sprints, CTFs, robotics arenas, and rapid AI development challenges.'
    },
    {
      icon: Users2,
      title: 'Collaborate',
      description: 'Break departmental silos by uniting Electronics, Computer, IT, Mechanical, and Civil students with peers across GCET, ADIT, and beyond.'
    },
    {
      icon: Rocket,
      title: 'Innovate',
      description: 'Transform classroom theoretical knowledge into functional working hardware, software prototypes, and real-world impact.'
    }
  ];

  const roadmapPhases = [
    {
      phase: 'Phase 01',
      title: 'Foundation & Mentorship',
      status: 'Proposed Goal',
      description: 'Establish the core student organizing body, secure formal faculty mentorship at BVM, and inaugurate the inaugural ZeroCode challenge.'
    },
    {
      phase: 'Phase 02',
      title: 'Intercollege Expansion',
      status: 'Planned Objective',
      description: 'Open competition rosters to fellow Vallabh Vidyanagar & CVMU institutions (GCET, ADIT) and leading Gujarat universities (CHARUSAT, DDU).'
    },
    {
      phase: 'Phase 03',
      title: 'Community Ecosystem',
      status: 'Planned Objective',
      description: 'Roll out specialized technical cohorts: cybersecurity forensics bootcamps, embedded robotics tracks, competitive programming sprints.'
    },
    {
      phase: 'Phase 04',
      title: 'NEXORA TechFest Flagship',
      status: 'Long-term Horizon',
      description: 'Scale into an annual marquee multidisciplinary technology festival celebrating central Gujarat’s finest student engineering talent.'
    }
  ];

  const urgentAlerts = notifications.filter(
    n => (n.priority === 'Urgent' || n.category === 'Emergency Notice' || n.category === 'Important') && !dismissedAlerts[n.id]
  );

  return (
    <div className="relative w-full overflow-hidden">
      {/* Top Urgent Broadcast Alert Banner if present */}
      {urgentAlerts.length > 0 && (
        <aside aria-label="Urgent Alerts" className="relative z-40 bg-gradient-to-r from-red-950/95 via-amber-950/90 to-purple-950/95 border-b border-red-500/40 text-white px-4 py-3 shadow-[0_4px_25px_rgba(239,68,68,0.25)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-mono truncate">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 border border-red-500/40 text-red-200 shrink-0">
                  {urgentAlerts[0].category}
                </span>
                <strong className="font-semibold text-white truncate">{urgentAlerts[0].title}:</strong>
                <span className="text-slate-200 truncate font-sans text-xs sm:text-sm">{urgentAlerts[0].message}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {urgentAlerts[0].link_url && (
                <a
                  href={urgentAlerts[0].link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-amber-300 hover:text-amber-200 underline"
                >
                  <span>{urgentAlerts[0].link_text || 'Details'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setDismissedAlerts(prev => ({ ...prev, [urgentAlerts[0].id]: true }))}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Hero Section */}
      <section className="nx-home-hero relative pt-16 pb-24 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-center">
          
          {/* Left Column: Typography & CTAs */}
          <div className="nx-home-hero-copy lg:col-span-7 space-y-7 text-center lg:text-left">
            
            {/* Status Kicker */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 text-[10px] sm:text-xs font-mono tracking-wide text-[#c8d8e6] bg-[#071522]/85 border border-[#345068]/50 rounded-full user-select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
              <span>Birla Vishvakarma Mahavidyalaya · Student Tech Community</span>
            </div>

            {/* Main Heading */}
            <h1 className="hero-heading text-[clamp(2.6rem,5vw,5.15rem)] font-extrabold tracking-[-0.04em] text-white leading-[1.08] user-select-none">
              NOT JUST A CLUB.{' '}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ffc78f] via-[#f2a764] to-[#a7c5d7]">
                {siteContent?.tagline || "THE BEGINNING OF BVM'S NEXT TECH ERA."}
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg text-[#bdccda] max-w-[640px] mx-auto lg:mx-0 leading-[1.8] font-light select-text">
              {siteContent?.description || "Where code meets creativity, curiosity becomes innovation, and students become builders of what's next. A student-led multidisciplinary technology community connecting creators across branches and colleges."}
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 user-select-none">
              <Link
                to="/competitions"
                className="nx-primary-cta w-full sm:w-auto px-8 py-4 text-sm font-bold text-[#140b07] bg-gradient-to-r from-[#ffd09c] via-[#eaa064] to-[#d58246] rounded-xl hover:brightness-110 transition-all shadow-[0_12px_36px_-12px_rgba(234,160,100,0.55)] flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
              >
                <span>Explore Competitions</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/about"
                className="w-full sm:w-auto px-7 py-4 text-sm font-medium text-[#d5e0e9] bg-[#0b1926]/80 border border-[#395268]/60 rounded-xl hover:border-[#88aac4] hover:bg-[#102337] hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
              >
                <Sparkles className="w-4 h-4 text-[#efae76]" />
                <span>Discover NEXORA</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-[#9bb3c5] user-select-none" aria-label="NEXORA values">
              <span>01 / Build</span>
              <span className="text-[#d78d55]" aria-hidden="true">✦</span>
              <span>02 / Compete</span>
              <span className="text-[#d78d55]" aria-hidden="true">✦</span>
              <span>03 / Innovate</span>
            </div>

            {/* Institutional Note / Platform Announcement */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400 user-select-none">
              <span className="text-[#e5a66d] font-mono">Announcement:</span>
              <span>{siteContent?.announcement || "Proposed platform pending formal faculty council ratification."}</span>
            </div>
          </div>

          {/* Right Column: Three.js Rotating Purple Orbital Sphere (Seamless blending into galaxy) */}
          <div className="nx-home-hero-art lg:col-span-5 relative flex items-center justify-center pointer-events-none w-full">
            <div className="relative w-full aspect-square max-w-[500px] lg:max-w-[580px] xl:max-w-[620px] flex items-center justify-center overflow-visible">
              <CosmicHeroObject />
            </div>
          </div>
        </div>
      </section>

      {/* Vision & 4 Pillars Section */}
      <section className="py-20 bg-[#11101B]/50 border-y border-violet-500/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="text-xs font-mono text-violet-400 tracking-widest uppercase user-select-none">
              The NEXORA Philosophy
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight user-select-none">
              WE ARE BUILDING SOMETHING BIGGER.
            </h2>
            <p className="text-base text-slate-300 leading-relaxed font-light">
              NEXORA begins with student-led competitions, but our ambition extends beyond individual events. We envision a collaborative platform connecting students across branches and colleges through technology, creativity, problem-solving, and shared experiences.
            </p>
          </div>

          {/* Four Interactive Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="p-6 rounded-2xl bg-[#171426]/75 border border-violet-500/15 hover:border-violet-400/50 hover:bg-[#1a172e]/90 transition-all duration-200 group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-950/70 border border-violet-500/25 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-slate-500 user-select-none">
                        0{idx + 1}
                      </div>
                      <h3 className="text-xl font-bold text-white mt-0.5 user-select-none">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-light">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Competitions Showcase Preview */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-mono text-violet-400 tracking-widest uppercase user-select-none">
              Inaugural Portfolio
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight user-select-none">
              Six Flagship Competitions
            </h2>
            <p className="text-sm text-slate-400 max-w-xl font-light">
              From prompt-driven rapid AI development and competitive algorithms to robotics arenas, cryptography, and technical trivia showdowns.
            </p>
          </div>
          <Link
            to="/competitions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors user-select-none"
          >
            <span>View All Competition Rules</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.length === 0 ? (
            <div className="col-span-2 py-12 text-center p-8 bg-[#171426]/60 border border-violet-500/20 rounded-2xl space-y-3">
              <Trophy className="w-8 h-8 text-violet-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Competitions Announcing Soon</h3>
              <p className="text-xs text-slate-400">
                Official competition schedules and challenges will appear here as soon as announced by the organizing desk.
              </p>
            </div>
          ) : (
            events.map((event, idx) => {
              const isComingSoon = Boolean(event.isComingSoon);
              return (
                <div
                  key={event.id}
                  className={`relative rounded-2xl bg-[#171426]/80 border overflow-hidden flex flex-col justify-between transition-all backdrop-blur-sm ${
                    isComingSoon
                      ? 'border-violet-500/15 cursor-default'
                      : 'border-violet-500/20 group hover:border-violet-400/40 hover:shadow-[0_0_25px_-5px_rgba(139,92,246,0.2)]'
                  }`}
                >
                  {/* Entire Card Content Wrapper (Blurred when Coming Soon) */}
                  <div className={`flex flex-col flex-1 justify-between transition-all duration-300 ${
                    isComingSoon ? 'filter blur-sm opacity-40 select-none pointer-events-none' : ''
                  }`}>
                    <CompetitionCardImage
                      event={event}
                      className="w-full aspect-[16/9]"
                      isComingSoon={false}
                      priority={idx < 2}
                      hideInnerOverlay={true}
                    />

                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white group-hover:text-violet-300 transition-colors user-select-none">
                          {event.title}
                        </h3>
                        <p className="text-xs font-mono text-violet-400 tracking-wide user-select-none">
                          {event.tagline}
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 select-text">
                          {event.description || event.short_description}
                        </p>

                        <div className="pt-2 flex items-center gap-2 text-xs font-mono text-amber-400">
                          <Trophy className="w-3.5 h-3.5 shrink-0" />
                          <span>1st Prize: {event.prizes?.first_place || '₹2,000 Cash Prize'}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-violet-500/15 flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-400 font-mono user-select-none">
                          <RegistrationCounter
                            registeredCount={event.registered_count || 0}
                            capacity={event.capacity}
                            showCapacity={event.show_capacity}
                          />
                          <div className="text-violet-300 font-semibold pt-0.5">
                            {event.fee_per_participant === 0 ? 'Free Entry' : `Fee: ₹${event.fee_per_participant}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isComingSoon ? (
                            <>
                              <button
                                type="button"
                                disabled
                                tabIndex={-1}
                                className="px-3.5 py-1.5 text-xs font-medium text-slate-500 bg-[#11101B]/50 border border-slate-700/30 rounded-lg cursor-not-allowed"
                              >
                                Details &amp; Rules
                              </button>
                              <button
                                type="button"
                                disabled
                                tabIndex={-1}
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-amber-300/60 bg-amber-950/30 border border-amber-500/20 cursor-not-allowed"
                              >
                                Coming Soon
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                to={`/competitions/${event.slug}`}
                                className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-[#11101B] border border-violet-500/25 rounded-lg hover:text-white hover:border-violet-400 transition-colors"
                              >
                                Details &amp; Rules
                              </Link>
                              <button
                                type="button"
                                disabled={!event.registration_open}
                                onClick={() => setSelectedEventForModal(event)}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                  event.registration_open
                                    ? 'text-white bg-violet-600 hover:bg-violet-500'
                                    : 'text-slate-500 bg-slate-800 cursor-not-allowed'
                                }`}
                              >
                                {event.registration_open ? 'Register' : 'Closed'}
                              </button>
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
                      <div className="px-4 py-1.5 rounded-full bg-violet-950/90 border border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.6)] mb-2">
                        <span className="text-sm sm:text-base font-extrabold tracking-widest text-violet-200 font-mono">
                          COMING SOON
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 tracking-wide max-w-xs">
                        Details &amp; Registration Opening Soon
                      </p>
                    </div>
                  )}
                </div>
              );
            })

          )}
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20 bg-[#11101B]/70 border-t border-violet-500/15 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-mono text-violet-400 tracking-widest uppercase user-select-none">
              Strategic Vision
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight user-select-none">
              The NEXORA Roadmap
            </h2>
            <p className="text-sm text-slate-400 font-light">
              Clear evolutionary phases designed to grow responsibly from our first event to an intercollege technology festival.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roadmapPhases.map((phase) => (
              <div
                key={phase.phase}
                className="p-6 bg-[#171426]/85 border border-violet-500/20 rounded-2xl space-y-4 relative"
              >
                <div className="flex items-center justify-between text-xs font-mono border-b border-violet-500/15 pb-2 user-select-none">
                  <span className="text-violet-400 font-bold">{phase.phase}</span>
                  <span className="text-slate-400">{phase.status}</span>
                </div>
                <h3 className="text-lg font-bold text-white user-select-none">
                  {phase.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-[#171426]/50 border border-violet-500/20 rounded-xl text-center text-xs text-slate-400 max-w-2xl mx-auto user-select-none">
            <AlertCircle className="w-4 h-4 text-violet-400 inline mr-2" />
            <span>
              All roadmap phases represent planned organizational milestones, subject to faculty mentor advice and BVM administrative authorization.
            </span>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-purple-600/10 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-300">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight user-select-none">
            BE PART OF BVM&apos;S NEXT CHAPTER.
          </h2>
          <p className="text-base text-slate-300 max-w-xl mx-auto font-light">
            Whether you code, build circuits, analyze security, design interfaces, or lead operations — NEXORA is built for students who want to build.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 user-select-none">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-all shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] cursor-pointer"
          >
            Create Student Profile
          </Link>
          <Link
            to="/team"
            className="w-full sm:w-auto px-6 py-3.5 text-sm font-medium text-slate-300 bg-[#171426] border border-violet-500/25 rounded-xl hover:text-white cursor-pointer"
          >
            Meet the Founding Team
          </Link>
        </div>
      </section>

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
