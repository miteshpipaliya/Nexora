/**
 * src/hooks/useBroadcastPopups.ts
 * Real-time scheduled broadcast popup controller.
 * Listens for active scheduled broadcasts, respects server clock skew, enforces popup delay,
 * and maintains dismissal state in localStorage.
 */

import { useState, useEffect, useRef } from 'react';
import { InAppNotification } from '../types';
import { dataService } from '../services/dataService';
import { getServerNow } from '../shared/lib/serverClock';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'nexora_dismissed_popups';

export function useBroadcastPopups() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [activePopup, setActivePopup] = useState<InAppNotification | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const pendingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to live notifications collection
  useEffect(() => {
    const unsubscribe = dataService.subscribeNotifications((notifs: InAppNotification[]) => {
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, []);

  // Periodic evaluation of scheduled popups against server time
  useEffect(() => {
    const evaluatePopups = () => {
      if (activePopup) return; // Already showing a popup

      const now = getServerNow();

      // Find highest priority eligible popup
      const candidates = notifications.filter((notif) => {
        if (notif.status !== 'Published') return false;
        if (dismissedIds.has(notif.id)) return false;

        // Is explicitly a popup or has high/urgent priority
        const qualifiesAsPopup = notif.is_popup || notif.priority === 'Urgent' || notif.priority === 'High';
        if (!qualifiesAsPopup) return false;

        // Check scheduled display time
        const scheduleTime = notif.scheduled_for || notif.display_at || notif.publish_at || notif.created_at;
        const scheduleTimestamp = new Date(scheduleTime).getTime();
        if (isNaN(scheduleTimestamp) || scheduleTimestamp > now) {
          return false; // Scheduled in future
        }

        // Check expiration
        if (notif.expires_at) {
          const expireTimestamp = new Date(notif.expires_at).getTime();
          if (!isNaN(expireTimestamp) && now > expireTimestamp) {
            return false; // Expired
          }
        }

        return true;
      });

      if (candidates.length === 0) return;

      // Sort by priority (Urgent > High > Normal) then newest
      const priorityOrder: Record<string, number> = { Urgent: 3, High: 2, Normal: 1 };
      candidates.sort((a, b) => {
        const pDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        if (pDiff !== 0) return pDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const nextPopup = candidates[0];
      const delaySeconds = typeof nextPopup.popup_delay_seconds === 'number' ? nextPopup.popup_delay_seconds : 2;

      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);

      pendingTimerRef.current = setTimeout(() => {
        setActivePopup(nextPopup);
      }, delaySeconds * 1000);
    };

    evaluatePopups();
    const interval = setInterval(evaluatePopups, 5000); // Check every 5s for newly reached schedules

    return () => {
      clearInterval(interval);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [notifications, activePopup, dismissedIds]);

  const dismissPopup = (id: string) => {
    setActivePopup(null);
    setDismissedIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });

    if (user?.id) {
      dataService.markNotificationAsRead(user.id, id).catch(() => {});
    }
  };

  return {
    activePopup,
    dismissPopup
  };
}
