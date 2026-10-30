import React, { useState } from 'react';
import { Terminal, Shield, Cpu, Code2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { CompetitionEvent } from '../../types';

interface CompetitionCardImageProps {
  event: CompetitionEvent;
  className?: string;
  isComingSoon?: boolean;
}

export const getCompetitionDefaultImage = (slug: string): string => {
  const cleanSlug = (slug || '').toLowerCase().trim();
  if (cleanSlug.includes('zerocode') || cleanSlug.includes('zero')) {
    return '/images/competitions/zerocode.jpg';
  }
  if (cleanSlug.includes('ctf') || cleanSlug.includes('flag') || cleanSlug.includes('cyber')) {
    return '/images/competitions/ctf.jpg';
  }
  if (cleanSlug.includes('hack') || cleanSlug.includes('hackathon')) {
    return '/images/competitions/hackathon.jpg';
  }
  if (cleanSlug.includes('code') || cleanSlug.includes('rush') || cleanSlug.includes('algorithm')) {
    return '/images/competitions/coderush.jpg';
  }
  return '/images/competitions/zerocode.jpg';
};

export const getCompetitionIcon = (slug: string) => {
  const clean = (slug || '').toLowerCase().trim();
  if (clean.includes('zerocode')) return Sparkles;
  if (clean.includes('ctf')) return Shield;
  if (clean.includes('hack')) return Cpu;
  if (clean.includes('rush') || clean.includes('code')) return Terminal;
  return Code2;
};

export const CompetitionCardImage: React.FC<CompetitionCardImageProps> = ({
  event,
  className = 'h-52 w-full',
  isComingSoon = false
}) => {
  const defaultFallback = getCompetitionDefaultImage(event.slug);
  const primarySrc = event.cover_image || event.banner_image || defaultFallback;
  
  const [currentSrc, setCurrentSrc] = useState<string>(primarySrc);
  const [hasTriedFallback, setHasTriedFallback] = useState<boolean>(false);
  const [isFailedCompletely, setIsFailedCompletely] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const handleError = () => {
    if (!hasTriedFallback && currentSrc !== defaultFallback) {
      setHasTriedFallback(true);
      setCurrentSrc(defaultFallback);
    } else {
      setIsFailedCompletely(true);
    }
  };

  const Icon = getCompetitionIcon(event.slug);

  return (
    <div className={`relative overflow-hidden bg-[#0d0c15] ${className}`}>
      {/* Loading Skeleton */}
      {!isLoaded && !isFailedCompletely && (
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/40 via-purple-900/30 to-violet-950/40 animate-pulse" />
      )}

      {/* Main Image */}
      {!isFailedCompletely ? (
        <img
          src={currentSrc}
          alt={event.title}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } ${isComingSoon ? 'filter blur-[3px] grayscale-[30%] opacity-60' : 'group-hover:scale-105'}`}
        />
      ) : (
        /* Stylized Branded Fallback */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1435] to-[#0d0c15] p-6 text-center border-b border-violet-500/20">
          <div className="w-14 h-14 rounded-2xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-2 shadow-inner">
            <Icon className="w-7 h-7" />
          </div>
          <span className="text-xs font-mono font-semibold text-violet-200">{event.title}</span>
          <span className="text-[10px] font-mono text-slate-400 mt-1">{event.category}</span>
        </div>
      )}

      {/* Subtle Bottom Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#171426] via-transparent to-transparent pointer-events-none" />

      {/* Category and Status Chips */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none z-10">
        <span className="text-slate-200 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[11px]">
          {event.category}
        </span>
        {isComingSoon ? (
          <span className="text-amber-300 bg-amber-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-500/40 text-[11px] font-semibold tracking-wider">
            COMING SOON
          </span>
        ) : (
          <span className="text-violet-300 bg-violet-950/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-violet-500/30 text-[11px]">
            {event.status}
          </span>
        )}
      </div>

      {/* Coming Soon Overlay */}
      {isComingSoon && (
        <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
          <div className="px-4 py-1.5 rounded-full bg-violet-950/90 border border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.6)] mb-2">
            <span className="text-sm sm:text-base font-extrabold tracking-widest text-violet-200 font-mono">
              COMING SOON
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-300 tracking-wide">
            Details &amp; Registration Opening Soon
          </span>
        </div>
      )}
    </div>
  );
};
