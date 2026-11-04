import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Clock } from 'lucide-react';
import { CompetitionEvent } from '../../types';
import { CompetitionCardImage } from '../ui/CompetitionCardImage';

interface CompetitionCardProps {
  event: CompetitionEvent;
  priority?: boolean;
  onRegister?: (event: CompetitionEvent) => void;
}

export const CompetitionCard: React.FC<CompetitionCardProps> = ({
  event,
  priority = false,
  onRegister
}) => {
  const navigate = useNavigate();
  const isComingSoon = Boolean(event.isComingSoon);

  const handleCardClick = () => {
    if (!isComingSoon) {
      navigate(`/competitions/${event.slug}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isComingSoon && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      navigate(`/competitions/${event.slug}`);
    }
  };

  return (
    <div
      role={isComingSoon ? 'region' : 'link'}
      aria-label={isComingSoon ? `${event.title} (Coming Soon)` : `Explore ${event.title}`}
      tabIndex={isComingSoon ? -1 : 0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={`relative rounded-2xl bg-[#171426] border overflow-hidden transition-all duration-300 ${
        isComingSoon
          ? 'border-violet-500/15 shadow-none cursor-default'
          : 'border-violet-500/20 group hover:border-violet-400/50 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.25)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400'
      }`}
    >
      {/* LAYER 1: Full original competition card content wrapper (Blurred when Coming Soon is ON) */}
      <div
        className={`flex flex-col justify-between h-full transition-all duration-300 ${
          isComingSoon
            ? 'filter blur-[7px] opacity-40 pointer-events-none select-none'
            : ''
        }`}
        aria-hidden={isComingSoon}
      >
        {/* Top: 16:9 Aspect Ratio Image with performance optimizations */}
        <CompetitionCardImage
          event={event}
          className="aspect-video w-full"
          isComingSoon={isComingSoon}
          priority={priority}
        />

        {/* Bottom: Card Body Content */}
        <div className="p-6 md:p-8 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Difficulty:</span>
              <span className="text-violet-300 font-semibold">{event.difficulty}</span>
              <span>·</span>
              <span>Fee: {event.fee_per_participant === 0 ? 'Free' : `₹${event.fee_per_participant}`}</span>
            </div>

            <h2 className="text-2xl font-bold text-white group-hover:text-violet-300 transition-colors">
              {event.title}
            </h2>

            <p className="text-xs font-mono text-violet-400 tracking-wide">
              {event.tagline}
            </p>

            <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
              {event.short_description || event.description}
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-amber-400">
              <Trophy className="w-4 h-4 shrink-0" />
              <span>1st Prize: {event.prizes?.first_place || '₹2,000 Cash Prize'}</span>
            </div>
          </div>

          <div className="pt-6 border-t border-violet-500/15 flex items-center justify-between gap-4">
            <div className="text-xs font-mono text-slate-400">
              <div>Capacity: {event.capacity} seats</div>
              <div className={event.registration_open ? 'text-emerald-400' : 'text-slate-400'}>
                {event.registration_open ? 'Registration Open' : 'Registration Closed'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 text-xs font-medium text-slate-200 bg-[#11101B] border border-violet-500/25 rounded-xl group-hover:border-violet-400 transition-colors">
                Details &amp; Rules
              </span>

              {event.registration_open && (
                <button
                  type="button"
                  tabIndex={isComingSoon ? -1 : 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isComingSoon && onRegister) {
                      onRegister(event);
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-md cursor-pointer"
                >
                  Register Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LAYER 2: Separate sharp sibling Coming Soon overlay (Only active when isComingSoon is ON) */}
      {isComingSoon && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-[2px] transition-all duration-300 select-none pointer-events-auto"
          aria-live="polite"
        >
          {/* Glowing Purple/Black COMING SOON Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-violet-950/95 border border-violet-400/60 shadow-[0_0_30px_rgba(139,92,246,0.65)] mb-3">
            <Clock className="w-4 h-4 text-violet-300 animate-pulse" />
            <span className="text-sm sm:text-base font-extrabold tracking-widest text-violet-100 font-mono">
              COMING SOON
            </span>
          </div>

          {/* Sharp Secondary Information Text */}
          <p className="text-xs sm:text-sm font-mono text-slate-200 font-medium tracking-wide max-w-xs">
            Details &amp; Registration Opening Soon
          </p>
        </div>
      )}
    </div>
  );
};
