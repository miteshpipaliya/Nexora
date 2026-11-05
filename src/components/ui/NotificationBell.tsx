import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  ExternalLink,
  Sparkles,
  X,
  Megaphone,
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { InAppNotification } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { isValidSafeUrl } from '../../shared/lib/safeUrl';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : 'NEXORA');

  // Load read notification IDs from localStorage and Firestore
  useEffect(() => {
    const storageKey = `nexora_read_notifs_${user?.id || 'guest'}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {}

    if (user?.id) {
      dataService
        .getReadNotificationIds(user.id)
        .then((ids: Set<string>) => {
          if (ids.size > 0) {
            setReadIds((prev) => {
              const merged = new Set([...prev, ...ids]);
              try {
                localStorage.setItem(storageKey, JSON.stringify([...merged]));
              } catch {}
              return merged;
            });
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  // Subscribe to real-time published notifications
  useEffect(() => {
    const unsubscribe = dataService.subscribeNotifications('all', (allNotifs: InAppNotification[]) => {
      const now = Date.now();
      const active = allNotifs.filter((n: InAppNotification) => {
        if (n.status !== 'Published') return false;
        if (n.display_at) {
          const displayMs = new Date(n.display_at).getTime();
          if (!isNaN(displayMs) && displayMs > now) return false;
        }
        if (n.expires_at) {
          const exp = new Date(n.expires_at).getTime();
          if (!isNaN(exp) && exp < now) return false;
        }
        return true;
      });

      // Sort newest on top
      active.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(active);
    });

    return () => unsubscribe();
  }, []);


  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Dynamic tab title sync when tab is hidden per Package D
  useEffect(() => {
    const updateTitle = () => {
      if (document.hidden && unreadCount > 0) {
        document.title = `(${unreadCount}) NEXORA`;
      } else {
        document.title = originalTitleRef.current || 'NEXORA - Student Technology & Innovation Community';
      }
    };

    updateTitle();
    document.addEventListener('visibilitychange', updateTitle);
    return () => {
      document.removeEventListener('visibilitychange', updateTitle);
      document.title = originalTitleRef.current || 'NEXORA - Student Technology & Innovation Community';
    };
  }, [unreadCount]);


  const markAsRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    const storageKey = `nexora_read_notifs_${user?.id || 'guest'}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
    if (user?.id) {
      dataService.markNotificationAsRead(user.id, id).catch(() => {});
    }
  };

  const markAllAsRead = () => {
    const next = new Set([...readIds, ...notifications.map((n) => n.id)]);
    setReadIds(next);
    const storageKey = `nexora_read_notifs_${user?.id || 'guest'}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
    if (user?.id) {
      notifications.forEach((n) => {
        dataService.markNotificationAsRead(user.id, n.id).catch(() => {});
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Announcement':
        return Megaphone;
      case 'Competition Update':
        return Calendar;
      case 'Important':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View Broadcast Notifications"
        className="relative p-2 text-slate-300 hover:text-white bg-[#171426]/70 border border-violet-500/25 rounded-xl hover:border-violet-400 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-bounce text-violet-300' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[85vh] flex flex-col bg-[#11101B] border border-violet-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-violet-500/20 bg-[#171426]/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Announcements</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-950 text-violet-300 border border-violet-500/30 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-mono text-violet-300 hover:text-white transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close notification panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>


          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-violet-500/10 flex-1 max-h-[60vh]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active announcements right now.
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = readIds.has(item.id);
                const IconComponent = getCategoryIcon(item.category);
                const isUrgent = item.priority === 'Urgent';

                return (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`p-4 transition-colors cursor-pointer ${
                      isRead ? 'bg-transparent hover:bg-white/[0.02]' : 'bg-violet-950/20 hover:bg-violet-950/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isUrgent
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-violet-900/30 text-violet-400 border border-violet-500/20'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isRead ? 'text-slate-300' : 'text-white'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {formatTimestamp(item.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        {item.link_url && isValidSafeUrl(item.link_url) && (
                          <div className="pt-1 flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">
                            <span>{item.link_text || 'Learn more'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {!isRead && (
                        <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
