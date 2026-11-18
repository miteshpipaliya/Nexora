import React, { useEffect, useState } from 'react';
import { BellRing, BellOff, LoaderCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { enableNexoraPush, disableNexoraPush, getNexoraPushStatus } from '../../services/pushNotifications';
import { useAuth } from '../../context/AuthContext';

type Feedback = { kind: 'error'; text: string } | null;

export const PushNotificationControl: React.FC = () => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  const permission = supported ? Notification.permission : 'unsupported';

  useEffect(() => {
    let active = true;
    setChecking(true);
    setFeedback(null);
    setEnabled(false);
    if (!user) { setChecking(false); return; }
    const refresh = async () => {
      try {
        const current = await getNexoraPushStatus();
        if (active) setEnabled(current);
      } catch { if (active) setEnabled(false); }
      finally { if (active) setChecking(false); }
    };
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user?.uid]);

  if (!user) return null;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (enabled) {
        await disableNexoraPush();
        window.localStorage.removeItem('nexora-push-enabled');
        setEnabled(false);

      } else {
        await enableNexoraPush();
        window.localStorage.setItem('nexora-push-enabled', 'yes');
        setEnabled(true);

      }
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Could not update notifications.' });
      try { setEnabled(await getNexoraPushStatus()); } catch { setEnabled(false); }
    } finally { setBusy(false); }
  };
  const blocked = permission === 'denied' && !enabled;
  const unavailable = !supported;
  const label = checking ? 'Checking Notifications…' : busy ? 'Updating Notifications…'
    : enabled ? 'Notifications On' : blocked ? 'Notifications Blocked'
    : unavailable ? 'Notifications Unavailable' : 'Enable Notifications';

  return (
    <div className="flex max-w-56 flex-col gap-1.5" aria-live="polite">
      <button type="button" disabled={busy || checking || blocked || unavailable} onClick={toggle}
        aria-pressed={enabled}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          enabled ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
          : 'border-rose-500/60 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
        }`}>
        {busy || checking ? <LoaderCircle size={15} className="animate-spin" /> :
          enabled ? <CheckCircle2 size={15} /> : blocked || unavailable ? <BellOff size={15} /> : <BellRing size={15} />}
        <span>{label}</span>
      </button>
      {feedback && (
        <p role={'alert'}
          className={`break-words text-xs leading-snug ${'text-rose-300'}`}>
          <AlertCircle size={12} className="mr-1 inline" />
          {feedback.text}
        </p>
      )}

    </div>
  );
};
