import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, Bell, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { useBroadcastPopups } from '../../hooks/useBroadcastPopups';
import { isSafeUrl, sanitizeUrl } from '../../shared/lib/safeUrl';

export const BroadcastPopup: React.FC = () => {
  const { activePopup, dismissPopup } = useBroadcastPopups();

  // Close on Escape key
  useEffect(() => {
    if (!activePopup) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissPopup(activePopup.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePopup, dismissPopup]);

  if (!activePopup) return null;

  const isUrgent = activePopup.priority === 'Urgent';
  const isHigh = activePopup.priority === 'High';
  const hasLink = Boolean(activePopup.link_url && isSafeUrl(activePopup.link_url));
  const safeActionUrl = hasLink ? sanitizeUrl(activePopup.link_url) : '';
  const isInternalLink = safeActionUrl.startsWith('/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="broadcast-popup-title"
        className="relative w-full max-w-lg bg-[#11101B] border border-violet-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Glow ambient background accent */}
        <div 
          className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 ${
            isUrgent ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-violet-600'
          }`}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => dismissPopup(activePopup.id)}
          aria-label="Dismiss broadcast announcement"
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Container */}
        <div className="space-y-4">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase bg-violet-950/80 text-violet-300 border border-violet-500/30">
              <Sparkles className="w-3 h-3" />
              {activePopup.category || 'Announcement'}
            </span>

            {isUrgent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-red-950/80 text-red-300 border border-red-500/40">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                Urgent
              </span>
            )}

            {isHigh && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-950/80 text-amber-300 border border-amber-500/40">
                <Info className="w-3 h-3 text-amber-400" />
                High Priority
              </span>
            )}
          </div>

          {/* Optional Banner Image */}
          {activePopup.image_url && isSafeUrl(activePopup.image_url) && (
            <div className="w-full h-44 rounded-2xl overflow-hidden border border-violet-500/20 bg-black/40">
              <img 
                src={activePopup.image_url} 
                alt={activePopup.title}
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {/* Title & Body */}
          <div className="space-y-2">
            <h2 id="broadcast-popup-title" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              {activePopup.title}
            </h2>
            <p className="text-sm text-slate-300 font-light leading-relaxed whitespace-pre-line">
              {activePopup.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-violet-500/15">
            <button
              type="button"
              onClick={() => dismissPopup(activePopup.id)}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-transparent hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              Dismiss
            </button>

            {hasLink && isInternalLink && (
              <Link
                to={safeActionUrl}
                onClick={() => dismissPopup(activePopup.id)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span>{activePopup.link_text || 'Learn More'}</span>
              </Link>
            )}

            {hasLink && !isInternalLink && (
              <a
                href={safeActionUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => dismissPopup(activePopup.id)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span>{activePopup.link_text || 'Open Link'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
