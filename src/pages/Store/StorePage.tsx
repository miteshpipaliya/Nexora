import React from 'react';
import { Sparkles } from 'lucide-react';

export const StorePage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient Cosmic Purple Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-violet-600/25 via-purple-900/20 to-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center space-y-6 max-w-xl mx-auto">
        {/* Sleek Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/70 border border-violet-500/30 shadow-[0_0_25px_rgba(139,92,246,0.3)]">
          <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold tracking-widest text-violet-300 uppercase">
            Official Merchandise
          </span>
        </div>

        {/* The Cool "Coming Soon" Text */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-violet-400/80 tracking-tight drop-shadow-[0_0_45px_rgba(139,92,246,0.4)] select-none">
          COMING SOON
        </h1>

        <p className="text-base sm:text-lg text-slate-300/90 font-light leading-relaxed max-w-md mx-auto">
          Something extraordinary is being crafted for NEXORA innovators.
        </p>

        {/* Ambient Pulsing Dot */}
        <div className="pt-4 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
          <span className="text-xs font-mono text-violet-400 tracking-wider">PREPARING LAUNCH</span>
        </div>
      </div>
    </div>
  );
};
