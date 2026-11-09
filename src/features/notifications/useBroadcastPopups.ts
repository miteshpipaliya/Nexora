import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { InAppNotification } from '../../types';
import { serverNow, getSafeServerQueryTimeMs, getServerSkewMs } from '../../shared/lib/serverClock';

const SEEN_BROADCASTS_KEY = 'nexora_seen_broadcasts';
const MAX_SEEN_CACHE = 200;

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

const SUPPRESSED_PATHS = ['/admin', '/login', '/signup', '/forgot-password', '/reset-password'];

export function useBroadcastPopups() {
  const { user } = useAuth();
  const location = useLocation();
  const [queue, setQueue] = useState<InAppNotification[]>([]);
  const [activePopup, setActivePopup] = useState<InAppNotification | null>(null);
  const activeTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const retryTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Check if current route suppresses popups
  const isSuppressedRoute = SUPPRESSED_PATHS.some(path => location.pathname.startsWith(path));

  // Helper to sort queue: Urgent > High > Normal, then oldest first
  const sortQueue = useCallback((items: InAppNotification[]): InAppNotification[] => {
    const priorityWeight = (p: string) => (p === 'Urgent' ? 3 : p === 'High' ? 2 : 1);
    return [...items].sort((a, b) => {
      const pDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (pDiff !== 0) return pDiff;
      const timeA = typeof a.display_at === 'object' && a.display_at?.toMillis ? a.display_at.toMillis() : Date.parse(a.created_at || '0');
      const timeB = typeof b.display_at === 'object' && b.display_at?.toMillis ? b.display_at.toMillis() : Date.parse(b.created_at || '0');
      return timeA - timeB;
    });
  }, []);

  // Enqueue notification if not seen, not expired, and matches audience
  const enqueueNotification = useCallback((notif: InAppNotification) => {
    const seen = getSeenBroadcastIds();
    if (seen.has(notif.id)) return;
    if (notif.show_popup === false) return;

    // Check expiration
    if (notif.expires_at) {
      const expMs = Date.parse(notif.expires_at);
      if (!isNaN(expMs) && expMs < serverNow()) return;
    }

    setQueue(prev => {
      if (prev.some(item => item.id === notif.id)) return prev;
      return sortQueue([...prev, notif]);
    });
  }, [sortQueue]);

  // Fetch full notification document when scheduled timer fires
  const fetchAndEnqueue = useCallback(async (id: string, attempt = 1) => {
    if (getSeenBroadcastIds().has(id)) return;

    try {
      const docRef = doc(db, 'notifications', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as InAppNotification;
        enqueueNotification(data);
      }
    } catch (err: any) {
      // If permission denied due to clock skew, retry every 10s up to 3 minutes (18 attempts)
      if (attempt < 18) {
        const retryTimer = setTimeout(() => {
          fetchAndEnqueue(id, attempt + 1);
        }, 10000);
        retryTimersRef.current.set(id, retryTimer);
      }
    }
  }, [enqueueNotification]);

  // Schedule future broadcasts from schedule index
  const processScheduleItems = useCallback((items: Array<{ id: string; display_at_ms: number }>) => {
    const skew = getServerSkewMs();
    const now = serverNow();
    const seen = getSeenBroadcastIds();

    for (const item of items) {
      if (!item.id || seen.has(item.id)) continue;

      const fireTimeMs = item.display_at_ms;
      const delayMs = fireTimeMs - (Date.now() + skew);

      // If already clear to show
      if (delayMs <= 0) {
        fetchAndEnqueue(item.id);
        continue;
      }

      // If scheduled in the future, set timer if not already active
      if (!activeTimersRef.current.has(item.id)) {
        const timer = setTimeout(() => {
          activeTimersRef.current.delete(item.id);
          fetchAndEnqueue(item.id);
        }, Math.max(100, delayMs));
        activeTimersRef.current.set(item.id, timer);
      }
    }
  }, [fetchAndEnqueue]);

  // Initial missed-broadcasts query on mount
  useEffect(() => {
    const fetchMissed = async () => {
      try {
        const now = serverNow();
        const since24h = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);
        const safeNow = Timestamp.fromMillis(getSafeServerQueryTimeMs(30000));

        const q = query(
          collection(db, 'notifications'),
          where('status', '==', 'Published'),
          where('display_at', '>=', since24h),
          where('display_at', '<=', safeNow),
          orderBy('display_at', 'desc'),
          limit(10)
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(docSnap => {
          const data = { id: docSnap.id, ...docSnap.data() } as InAppNotification;
          enqueueNotification(data);
        });
      } catch {
        // Fallback or permission check - non-fatal
      }
    };

    fetchMissed();
  }, [enqueueNotification]);

  // Listen to siteMeta/broadcastSchedule
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      const scheduleRef = doc(db, 'siteMeta', 'broadcastSchedule');
      unsubscribe = onSnapshot(
        scheduleRef,
        snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data.items)) {
              processScheduleItems(data.items);
            }
          }
        },
        () => {
          // Fallback to polling every 60s on listener error
          const interval = setInterval(async () => {
            try {
              const snap = await getDoc(scheduleRef);
              if (snap.exists() && Array.isArray(snap.data()?.items)) {
                processScheduleItems(snap.data().items);
              }
            } catch {}
          }, 60000);
          return () => clearInterval(interval);
        }
      );
    } catch {
      // Non-fatal
    }

    return () => {
      if (unsubscribe) unsubscribe();
      activeTimersRef.current.forEach(t => clearTimeout(t));
      activeTimersRef.current.clear();
      retryTimersRef.current.forEach(t => clearTimeout(t));
      retryTimersRef.current.clear();
    };
  }, [processScheduleItems]);

  // Cross-tab synchronization via localStorage storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SEEN_BROADCASTS_KEY) {
        const seen = getSeenBroadcastIds();
        setQueue(prev => prev.filter(item => !seen.has(item.id)));
        if (activePopup && seen.has(activePopup.id)) {
          setActivePopup(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activePopup]);

  // Present next popup from queue when not on a suppressed route
  useEffect(() => {
    if (isSuppressedRoute) {
      if (activePopup) setActivePopup(null);
      return;
    }

    if (!activePopup && queue.length > 0) {
      const next = queue[0];
      const seen = getSeenBroadcastIds();
      if (seen.has(next.id)) {
        setQueue(prev => prev.slice(1));
      } else {
        setActivePopup(next);
      }
    }
  }, [isSuppressedRoute, activePopup, queue]);

  // Dismiss action
  const dismissPopup = useCallback(async () => {
    if (!activePopup) return;
    const currentId = activePopup.id;

    // 1. Mark seen locally immediately (and broadcast cross-tab)
    markBroadcastSeenLocally(currentId);

    // 2. If signed in, record user notification read receipt in Firestore
    const userId = user?.id || (user as any)?.uid;
    if (userId) {
      try {
        const receiptId = `${userId}_${currentId}`;
        await setDoc(doc(db, 'userNotificationReads', receiptId), {
          user_id: userId,
          notification_id: currentId,
          read_at: serverTimestamp()
        });
      } catch {}
    }

    // 3. Advance queue
    setActivePopup(null);
    setQueue(prev => prev.filter(item => item.id !== currentId));
  }, [activePopup, user?.id, (user as any)?.uid]);

  return {
    activePopup,
    dismissPopup,
    queueLength: queue.length
  };
}
