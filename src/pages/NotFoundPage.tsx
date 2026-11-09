import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
        <Compass className="w-10 h-10 animate-spin-slow" />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-mono text-violet-400 uppercase tracking-widest">
          ERROR 404 · ORBIT NOT FOUND
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Lost in Deep Space
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-light">
          The requested coordinate does not exist in the NEXORA constellation. It may have moved or remains under development.
        </p>
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors shadow-sm"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/competitions"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-slate-300 bg-[#171426] border border-violet-500/20 rounded-lg hover:text-white"
        >
          <span>Explore Events</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
