import React from 'react';
import { Link } from 'react-router-dom';

interface NexoraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  to?: string;
}

export const NexoraLogo: React.FC<NexoraLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
  to
}) => {
  // Height configurations
  const heightMap = {
    sm: 'h-6',
    md: 'h-8 sm:h-9',
    lg: 'h-11 sm:h-12',
    xl: 'h-14 sm:h-16'
  };

  const content = (
    <div className={`inline-flex flex-col items-start select-none user-select-none ${className}`}>
      <svg
        viewBox="0 0 340 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${heightMap[size]} w-auto max-w-full drop-shadow-[0_0_24px_rgba(168,85,247,0.4)]`}
        aria-label="NEXORA Logo"
        role="img"
      >
        <defs>
          {/* Luminous purple glow filter matching the master reference */}
          <filter id="star-flare-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Electric violet luminous gradient */}
          <linearGradient id="nexora-star-grad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="35%" stopColor="#A855F7" />
            <stop offset="65%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#7E22CE" />
          </linearGradient>

          {/* Subtle horizontal star core */}
          <radialGradient id="star-core-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#E9D5FF" />
            <stop offset="75%" stopColor="#A855F7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7E22CE" stopOpacity="0" />
          </radialGradient>

          {/* Silver-white letters gradient */}
          <linearGradient id="silver-letters" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>

        {/* Thin geometric uppercase lettering with elegant wide spacing */}
        <g stroke="url(#silver-letters)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="miter">
          {/* N */}
          <path d="M 24 50 L 24 14 L 56 50 L 56 14" fill="none" />

          {/* E */}
          <path d="M 102 14 L 76 14 L 76 50 L 104 50 M 76 32 L 98 32" fill="none" />

          {/* X */}
          <path d="M 124 14 L 160 50 M 160 14 L 124 50" fill="none" />

          {/* O (Outer circular ring with wide diameter) */}
          <circle cx="204" cy="32" r="19" fill="none" strokeWidth="2.2" />

          {/* R */}
          <path d="M 244 50 L 244 14 L 264 14 C 275 14 275 29 264 29 L 244 29 M 260 29 L 275 50" fill="none" />

          {/* A */}
          <path d="M 294 50 L 314 14 L 334 50 M 300 37 L 328 37" fill="none" />
        </g>

        {/* Master Logo Star — Centered inside the O with subtle vertical lens flare/needle */}
        <g filter="url(#star-flare-glow)">
          {/* Vertical Lens Flare Streak piercing slightly above and below the O */}
          <path
            d="M 204 4 Q 205.5 24 216 32 Q 205.5 40 204 60 Q 202.5 40 192 32 Q 202.5 24 204 4 Z"
            fill="url(#nexora-star-grad)"
          />
          {/* Horizontal Diamond Flare */}
          <path
            d="M 188 32 Q 199.5 30.5 204 22 Q 208.5 30.5 220 32 Q 208.5 33.5 204 42 Q 199.5 33.5 188 32 Z"
            fill="url(#nexora-star-grad)"
          />
          {/* Soft violet aura glow */}
          <circle cx="204" cy="32" r="7" fill="url(#star-core-radial)" opacity="0.6" />
          {/* Brilliant Central Pinpoint Sparkle */}
          <circle cx="204" cy="32" r="2.0" fill="#FFFFFF" />
        </g>
      </svg>

      {showSubtitle && (
        <span className="text-[10px] font-mono tracking-widest text-violet-400 mt-1 uppercase select-none">
          Beyond a Club. The Beginning of a New Tech Era.
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
};
