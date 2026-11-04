import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Volume2, VolumeX, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import { InAppNotification } from '../../types';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { isValidSafeUrl } from '../../shared/lib/safeUrl';

const SEEN_BROADCASTS_KEY = 'nexora_seen_broadcasts';
const MUTED_STORAGE_KEY = 'nexora_toast_muted';
const MAX_SEEN_CACHE = 200;
const MAX_STACK = 3;
const AUTO_DISMISS_MS = 10000;
const MAX_TOAST_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function getSeenBroadcastIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_BROADCASTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markBroadcastSeenLocally(id: string) {
  try {
    const set = getSeenBroadcastIds();
    set.add(id);
    const arr = Array.from(set).slice(-MAX_SEEN_CACHE);
    localStorage.setItem(SEEN_BROADCASTS_KEY, JSON.stringify(arr));
  } catch {}
}

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'just now';
  const timestamp = new Date(dateString).getTime();
  if (isNaN(timestamp)) return 'just now';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Web Audio API gentle two-tone chime for incoming notifications
 */
export function playNotificationChime() {
  try {
    if (localStorage.getItem(MUTED_STORAGE_KEY) === 'true') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // First tone (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second tone (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.38);
  } catch {
    // Autoplay restrictions or audio unsupported - silently ignore
  }
}

interface ToastItem {
  notification: InAppNotification;
  remainingMs: number;
  isPaused: boolean;
  timerStart?: number;
}

export const BroadcastToast: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(MUTED_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Dismiss a specific toast and record seen everywhere
  const dismissToast = useCallback((id: string) => {
    // Remove from local toast stack
    setActiveToasts(prev => prev.filter(t => t.notification.id !== id));

    // Record in seen broadcasts (for toast suppression)
    markBroadcastSeenLocally(id);

    // Sync with read receipts for the notification bell
    const storageKey = `nexora_read_notifs_${user?.id || 'guest'}`;
    try {
      const raw = localStorage.getItem(storageKey);
      const readSet = new Set(raw ? JSON.parse(raw) : []);
      readSet.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...readSet]));
    } catch {}

    if (user?.id) {
      dataService.markNotificationAsRead(user.id, id).catch(() => {});
    }
  }, [user?.id]);

  // Subscribe to published notifications
  useEffect(() => {
    const unsubscribe = dataService.subscribeNotifications('all', (allNotifs: InAppNotification[]) => {
      const seen = getSeenBroadcastIds();
      const now = Date.now();

      // Filter: Published, not expired, not seen, and not older than 5 minutes
      const freshNotifs = allNotifs.filter((n: InAppNotification) => {
        if (n.status !== 'Published') return false;
        if (seen.has(n.id)) return false;

        // Check expiration
        if (n.expires_at) {
          const exp = new Date(n.expires_at).getTime();
          if (!isNaN(exp) && exp < now) return false;
        }

        // R3: "If live announcement was created > 5 mins ago while user was away, don't toast (bell only)"
        const createdMs = new Date(n.created_at).getTime();
        if (!isNaN(createdMs) && (now - createdMs) > MAX_TOAST_AGE_MS) {
          // Mark seen for toast so it doesn't pop up, but bell will still show unread
          markBroadcastSeenLocally(n.id);
          return false;
        }

        return true;
      });

      if (freshNotifs.length === 0) return;

      // Add to toasts if not already in activeToasts, up to MAX_STACK
      setActiveToasts(prev => {
        const existingIds = new Set(prev.map(t => t.notification.id));
        const toAdd = freshNotifs.filter(n => !existingIds.has(n.id));

        if (toAdd.length === 0) return prev;

        // Play chime once if new toasts arrived
        playNotificationChime();

        const newItems: ToastItem[] = toAdd.map(n => ({
          notification: n,
          remainingMs: AUTO_DISMISS_MS,
          isPaused: false,
          timerStart: Date.now()
        }));

        const merged = [...prev, ...newItems];
        // Keep max 3 toasts
        return merged.slice(-MAX_STACK);
      });
    });

    return () => unsubscribe();
  }, []);

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SEEN_BROADCASTS_KEY) {
        const seen = getSeenBroadcastIds();
        setActiveToasts(prev => prev.filter(t => !seen.has(t.notification.id)));
      }
      if (e.key === MUTED_STORAGE_KEY) {
        setIsMuted(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Tick timers for active toasts (pause on hover)
  useEffect(() => {
    if (activeToasts.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setActiveToasts(prev => {
        const updated: ToastItem[] = [];
        for (const item of prev) {
          if (item.isPaused) {
            updated.push(item);
            continue;
          }
          const elapsed = item.timerStart ? now - item.timerStart : 100;
          const remaining = item.remainingMs - elapsed;
          if (remaining <= 0) {
            // Auto-dismiss
            markBroadcastSeenLocally(item.notification.id);
          } else {
            updated.push({
              ...item,
              remainingMs: remaining,
              timerStart: now
            });
          }
        }
        return updated;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [activeToasts.length]);

  const handleMouseEnter = (id: string) => {
    setActiveToasts(prev =>
      prev.map(t => {
        if (t.notification.id === id) {
          return { ...t, isPaused: true };
        }
        return t;
      })
    );
  };

  const handleMouseLeave = (id: string) => {
    setActiveToasts(prev =>
      prev.map(t => {
        if (t.notification.id === id) {
          return { ...t, isPaused: false, timerStart: Date.now() };
        }
        return t;
      })
    );
  };

  const handleAction = (item: InAppNotification) => {
    if (!item.link_url || !isValidSafeUrl(item.link_url)) return;
    const url = item.link_url.trim();
    if (url.startsWith('/')) {
      navigate(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    dismissToast(item.id);
  };

  if (activeToasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Broadcast notifications"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0"
    >
      {activeToasts.map(({ notification, remainingMs, isPaused }) => {
        const isUrgent = notification.priority === 'Urgent';
        const isHigh = notification.priority === 'High';
        const progressPct = Math.max(0, Math.min(100, (remainingMs / AUTO_DISMISS_MS) * 100));

        return (
          <div
            key={notification.id}
            onMouseEnter={() => handleMouseEnter(notification.id)}
            onMouseLeave={() => handleMouseLeave(notification.id)}
            role="alert"
            className="pointer-events-auto relative overflow-hidden bg-[#131122]/95 border border-violet-500/35 backdrop-blur-md shadow-[0_15px_35px_rgba(0,0,0,0.8)] rounded-2xl p-4 transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-8"
          >
            {/* Top row: Avatar + Sender + Time + Actions */}
            <div className="flex items-start gap-3">
              {/* Circular Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-violet-950/80 border border-violet-500/40 p-1.5 flex items-center justify-center shadow-inner">
                  <img
                    src="/logo.png"
                    alt="NEXORA"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                {isUrgent ? (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#131122]" />
                ) : isHigh ? (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-[#131122]" />
                ) : (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#131122]" />
                )}
              </div>

              {/* Title and metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs sm:text-sm text-white truncate">
                    {notification.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>

                {/* Priority / Category badge */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300">
                    {notification.category || 'Announcement'}
                  </span>
                  {isUrgent && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-500/30 font-bold">
                      <AlertCircle className="w-2.5 h-2.5" /> URGENT
                    </span>
                  )}
                  {isHigh && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-2.5 h-2.5" /> HIGH
                    </span>
                  )}
                </div>
              </div>

              {/* Top-Right Mute & Close buttons */}
              <div className="flex items-center gap-1 shrink-0 -mr-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute notification chime' : 'Mute notification chime'}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute chime' : 'Mute chime'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-violet-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => dismissToast(notification.id)}
                  title="Dismiss notification"
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Message Clamp */}
            <div className="mt-2 text-xs text-slate-300 font-light leading-relaxed line-clamp-3">
              {notification.message}
            </div>

            {/* Action Button if link_url is provided */}
            {notification.link_url && isValidSafeUrl(notification.link_url) && (
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleAction(notification)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <span>{notification.link_text || 'View Details'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Auto-dismiss progress bar (pauses on hover) */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-950">
              <div
                className={`h-full transition-all duration-200 ${
                  isUrgent ? 'bg-red-500' : isHigh ? 'bg-amber-400' : 'bg-violet-500'
                } ${isPaused ? 'opacity-50' : 'opacity-100'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
