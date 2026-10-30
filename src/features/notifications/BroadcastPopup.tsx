import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { InAppNotification } from '../../types';
import { isValidSafeUrl } from '../../shared/lib/safeUrl';

interface BroadcastPopupProps {
  notification: InAppNotification;
  onDismiss: () => void;
  isPreview?: boolean;
}

export const BroadcastPopup: React.FC<BroadcastPopupProps> = ({
  notification,
  onDismiss,
  isPreview = false
}) => {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and ESC key handling
  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Esc closes Normal and High. Urgent requires explicit action or dismiss button
        if (notification.priority !== 'Urgent') {
          onDismiss();
        }
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notification.priority, onDismiss]);

  const handleActionClick = () => {
    if (!notification.link_url || !isValidSafeUrl(notification.link_url)) return;
    const url = notification.link_url.trim();
    if (url.startsWith('/')) {
      navigate(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    if (!isPreview) {
      onDismiss();
    }
  };

  const isUrgent = notification.priority === 'Urgent';
  const isHigh = notification.priority === 'High';

  const priorityBadge = isUrgent
    ? { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Urgent Announcement', icon: AlertCircle }
    : isHigh
    ? { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'High Priority', icon: AlertTriangle }
    : { bg: 'bg-violet-500/20 text-violet-300 border-violet-500/30', label: 'Announcement', icon: Info };

  const PriorityIcon = priorityBadge.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-popup-title"
      ref={modalRef}
    >
      <div
        className={`relative w-full max-w-lg bg-[#0e0c18] border rounded-2xl shadow-2xl overflow-hidden transition-all motion-reduce:transition-none ${
          isUrgent
            ? 'border-red-500/50 shadow-red-950/40'
            : isHigh
            ? 'border-amber-500/40 shadow-amber-950/30'
            : 'border-violet-500/40 shadow-violet-950/40'
        }`}
      >
        {/* Glowing Top Banner Accent */}
        <div
          className={`h-1.5 w-full ${
            isUrgent
              ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600'
              : isHigh
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
              : 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600'
          }`}
        />

        <div className="p-6 md:p-8">
          {/* Header Row: Badge & Dismiss */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${priorityBadge.bg}`}
              >
                <PriorityIcon className="w-3.5 h-3.5" />
                {priorityBadge.label}
              </span>
              {notification.category && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                  {notification.category}
                </span>
              )}
            </div>

            <button
              ref={closeButtonRef}
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Close announcement"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title */}
          <h2
            id="broadcast-popup-title"
            className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight"
          >
            {notification.title}
          </h2>

          {/* Message Body */}
          <div className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 whitespace-pre-wrap max-h-60 overflow-y-auto pr-1">
            {notification.message}
          </div>

          {/* Optional Action Button and Dismiss */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onDismiss}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-center"
            >
              Dismiss
            </button>

            {notification.link_url && isValidSafeUrl(notification.link_url) && (
              <button
                onClick={handleActionClick}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-transform active:scale-95 motion-reduce:transform-none ${
                  isUrgent
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40'
                    : isHigh
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'
                    : 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/40'
                }`}
              >
                <span>{notification.link_text || 'Learn More'}</span>
                {notification.link_url.startsWith('/') ? null : <ExternalLink className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
