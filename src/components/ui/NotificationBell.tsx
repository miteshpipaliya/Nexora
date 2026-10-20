import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, Sparkles, X, Megaphone, Calendar, AlertTriangle, Info } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { InAppNotification } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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
      dataService.getReadNotificationIds(user.id).then((ids) => {
        if (ids.size > 0) {
          setReadIds((prev) => {
            const merged = new Set([...prev, ...ids]);
            try {
              localStorage.setItem(storageKey, JSON.stringify([...merged]));
            } catch {}
            return merged;
          });
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  // Subscribe to real-time published notifications
  useEffect(() => {
    const unsubscribe = dataService.subscribeNotifications('all', (allNotifs) => {
      // Filter only Published notifications that haven't expired
      const now = Date.now();
      const active = allNotifs.filter((n) => {
        if (n.status !== 'Published') return false;
        if (n.expires_at) {
          const exp = new Date(n.expires_at).getTime();
          if (!isNaN(exp) && exp < now) return false;
        }
        return true;
      });
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
      case 'Announcement': return Megaphone;
      case 'Competition Update': return Calendar;
      case 'Important': return AlertTriangle;
      default: return Info;
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
        <Bell className="w-4 h-4" />
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
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="flex-1 overflow-y-auto divide-y divide-violet-500/10 max-h-[60vh]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-violet-500/40 mx-auto" />
                <p className="text-xs font-medium text-slate-300">No Announcements Right Now</p>
                <p className="text-[11px] text-slate-500 font-light">
                  When the NEXORA team announces event schedules or competitions, they will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = readIds.has(notif.id);
                const Icon = getCategoryIcon(notif.category);
                return (
                  <div
                    key={notif.id}
                    onClick={() => !isRead && markAsRead(notif.id)}
                    className={`p-4 transition-colors relative cursor-pointer group ${
                      isRead ? 'bg-transparent opacity-75 hover:opacity-100 hover:bg-[#171426]/40' : 'bg-[#171426]/80 hover:bg-[#171426]'
                    }`}
                  >
                    {!isRead && (
                      <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                    )}

                    <div className="space-y-2 pl-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded bg-violet-950/80 text-violet-300 border border-violet-500/20">
                            <Icon className="w-3 h-3" />
                          </span>
                          <span className="text-[10px] font-mono text-violet-300 uppercase tracking-wider">
                            {notif.category}
                          </span>
                          {notif.priority === 'Urgent' && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase bg-red-950 text-red-300 border border-red-500/30 rounded">
                              Urgent
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {formatTimestamp(notif.created_at)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-violet-200 transition-colors">
                        {notif.title}
                      </h4>

                      <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
                        {notif.message}
                      </p>

                      {notif.image_url && (
                        <div className="relative h-28 rounded-lg overflow-hidden border border-violet-500/20 bg-black/40 mt-2">
                          <img
                            src={notif.image_url}
                            alt={notif.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {notif.link_url && (
                        <div className="pt-1">
                          <a
                            href={notif.link_url}
                            target={notif.link_url.startsWith('http') ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            <span>{notif.link_text || 'Learn More'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-[#0d0c17] border-t border-violet-500/15 text-center text-[10px] font-mono text-slate-500">
            NEXORA Official Student Broadcasts
          </div>
        </div>
      )}
    </div>
  );
};
