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
  Trophy
} from 'lucide-react';
import { CosmicHeroObject } from '../../components/three/CosmicHeroObject';
import { dataService } from '../../services/dataService';
import { EventRegistrationModal } from '../../components/forms/EventRegistrationModal';
import { CompetitionEvent, SiteContent } from '../../types';

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CompetitionEvent | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Real-time events subscription
    const unsubEvents = dataService.subscribeEvents((allEvents) => {
      const published = allEvents.filter(
        (e) => e.status !== 'Draft' && e.status !== 'Archived'
      );
      setEvents(published);
    });

    // Real-time site content subscription
    const unsubContent = dataService.subscribeSiteContent((content) => {
      setSiteContent(content);
    });

    return () => {
      unsubEvents();
      unsubContent();
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
      description: 'Test your problem-solving abilities and algorithmic agility in collegiate hackathons, CTFs, and rapid AI development challenges.'
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

  return (
    <div className="relative w-full overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Status Kicker */}
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426]/90 border border-violet-500/30 rounded-full user-select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>Birla Vishvakarma Mahavidyalaya · Student Tech Community</span>
            </div>

            {/* Main Heading */}
            <h1 className="hero-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] user-select-none">
              NOT JUST A CLUB.{' '}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300">
                {siteContent?.tagline || "THE BEGINNING OF BVM'S NEXT TECH ERA."}
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light select-text">
              {siteContent?.description || "Where code meets creativity, curiosity becomes innovation, and students become builders of what's next. A student-led multidisciplinary technology community connecting creators across branches and colleges."}
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 user-select-none">
              <Link
                to="/competitions"
                className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Explore Competitions</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/about"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-medium text-slate-200 bg-[#171426]/80 border border-violet-500/25 rounded-xl hover:border-violet-400 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>Discover NEXORA</span>
              </Link>
            </div>

            {/* Institutional Note / Platform Announcement */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400 user-select-none">
              <span className="text-violet-400 font-mono">Announcement:</span>
              <span>{siteContent?.announcement || "Proposed platform pending formal faculty council ratification."}</span>
            </div>
          </div>

          {/* Right Column: Three.js Rotating Purple Orbital Sphere (Seamless blending into galaxy) */}
          <div className="lg:col-span-5 relative flex items-center justify-center pointer-events-none w-full">
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
              Four High-Impact Competitions
            </h2>
            <p className="text-sm text-slate-400 max-w-xl font-light">
              From prompt-driven rapid AI development to collaborative engineering hackathons and cryptography challenges.
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
            events.map((event) => {
              const bannerSrc = event.cover_image || event.banner_image || '/images/competitions/zerocode.jpg';
              const isBroken = brokenImages[event.id];
              return (
                <div
                  key={event.id}
                  className="rounded-2xl bg-[#171426]/80 border border-violet-500/20 overflow-hidden flex flex-col justify-between group hover:border-violet-400/40 transition-all backdrop-blur-sm"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-violet-950/40">
                    {!isBroken ? (
                      <img
                        src={bannerSrc}
                        alt={event.title}
                        onError={() => setBrokenImages((prev) => ({ ...prev, [event.id]: true }))}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-violet-950/30">
                        <Code2 className="w-12 h-12 text-violet-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171426] via-transparent to-transparent" />
                    
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono user-select-none">
                      <span className="text-slate-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10">
                        {event.category}
                      </span>
                      <span className="text-violet-300 bg-violet-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-violet-500/30">
                        {event.status} Event
                      </span>
                    </div>
                  </div>

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
                        <div>Capacity: {event.capacity} seats</div>
                        <div className="text-violet-300 font-semibold">
                          {event.fee_per_participant === 0 ? 'Free Entry' : `Fee: ₹${event.fee_per_participant}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>
                  </div>
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
