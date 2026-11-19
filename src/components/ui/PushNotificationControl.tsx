import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { BellRing, BellOff, LoaderCircle } from 'lucide-react';
import { auth } from '../../services/firebase';
import { enableNexoraPush, disableNexoraPush, getNexoraPushStatus } from '../../services/pushNotifications';
import { useAuth } from '../../context/AuthContext';

// The navbar has both mobile and desktop instances. Only one may open the prompt.
const promptedAccounts = new Set<string>();
type Choice = 'unset' | 'enabled' | 'declined';

async function preference(method: 'GET' | 'PUT', choice?: Choice): Promise<Choice> {
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in required');
  const response = await fetch('/api/push/preference', {
    method, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + await current.getIdToken(), 'Content-Type': 'application/json' },
    ...(method === 'PUT' ? { body: JSON.stringify({ choice }) } : {})
  });
  if (!response.ok) throw new Error('Could not save notification preference');
  return method === 'PUT' ? choice! : (await response.json()).choice as Choice;
}

export const PushNotificationControl: React.FC<{ profileMode?: boolean }> = ({ profileMode = false }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [choice, setChoice] = useState<Choice>('unset');
  const [busy, setBusy] = useState(false);
  const operationInProgress = useRef(false);
  const [checking, setChecking] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  const permission = supported ? Notification.permission : 'unsupported';

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let mounted = true;
    const refresh = async () => {
      try {
        const [accountChoice, active] = await Promise.all([preference('GET'), getNexoraPushStatus()]);
        if (!mounted) return;
        if (!operationInProgress.current) {
          setChoice(accountChoice);
          setEnabled(active);
        }
        if (!profileMode && location.pathname === '/' && accountChoice === 'unset' && supported && !promptedAccounts.has(user.id)) {
          promptedAccounts.add(user.id);
          setShowPrompt(true);
        }
      } catch (e) {
        if (mounted) setError('Notification settings are temporarily unavailable.');
      } finally { if (mounted) setChecking(false); }
    };
    void refresh();
    const onFocus = () => { if (!operationInProgress.current) void getNexoraPushStatus().then(v => { if (mounted && !operationInProgress.current) setEnabled(v); }).catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => { mounted = false; window.removeEventListener('focus', onFocus); };
  }, [user?.id, profileMode, location.pathname]);

  if (!user) return null;
  const update = async (allow: boolean) => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    const previousEnabled = enabled;
    const previousChoice = choice;
    // Optimistic UI: give instant feedback while the actual device registration
    // and account preference are persisted. Roll back on any failure.
    setEnabled(allow);
    setChoice(allow ? 'enabled' : 'declined');
    setBusy(true);
    setError('');
    try {
      if (allow) {
        await enableNexoraPush(); // Browser permission only after an explicit tap
        await preference('PUT', 'enabled');
        window.localStorage.setItem('nexora-push-enabled', 'yes');
      } else {
        if (previousEnabled) await disableNexoraPush();
        await preference('PUT', 'declined');
        window.localStorage.removeItem('nexora-push-enabled');
      }
      setShowPrompt(false);
    } catch (e) {
      setEnabled(previousEnabled);
      setChoice(previousChoice);
      setError(e instanceof Error ? e.message : 'Could not change notification settings');
      if (allow && Notification.permission === 'denied') {
        await preference('PUT', 'declined').catch(() => {});
        setChoice('declined');
        setEnabled(false);
        setShowPrompt(false);
      }
    } finally { operationInProgress.current = false; setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-1">
      <button type="button" disabled={checking || busy || !supported || (permission === 'denied' && !enabled)}
        onClick={() => void update(!enabled)}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60 ${enabled
          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
          : 'border-rose-500/60 bg-rose-500/15 text-rose-300'}`}>
        {enabled ? <BellRing size={15} /> : <BellOff size={15} />}
        {enabled ? 'Notifications On' : 'Notifications Off'}
      </button>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {choice === 'declined' && !enabled && profileMode &&
        <p className="text-sm text-rose-400">It is very important to get notifications for updates. You can enable them here anytime.</p>}
      {permission === 'denied' && profileMode &&
        <p className="text-sm text-rose-400">Notifications are blocked in browser settings. Allow them there first.</p>}
      {showPrompt && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-5" style={{ position: 'fixed', inset: 0 }}>
          <div role="dialog" aria-modal="true" aria-label="NEXORA notification preference"
            className="w-full max-w-sm space-y-4 rounded-2xl border border-violet-500/40 bg-[#171426] p-6 text-white shadow-2xl">
            <h2 className="text-lg font-bold">Get NEXORA updates?</h2>
            <p className="text-sm text-slate-300">Enable notifications for important competition announcements and broadcasts. Your choice is saved to your account. Each device still needs browser permission.</p>
            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => void update(true)} className="flex-1 rounded-lg bg-violet-600 p-3 font-semibold">Enable</button>
              <button type="button" disabled={busy} onClick={() => void update(false)} className="flex-1 rounded-lg border border-rose-500/50 p-3 text-rose-300">Not now</button>
            </div>
            {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
