import React, { useState } from 'react';
import { BellRing } from 'lucide-react';
import { enableNexoraPush, disableNexoraPush } from '../../services/pushNotifications';
import { useAuth } from '../../context/AuthContext';

export const PushNotificationControl: React.FC = () => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!user) return null;
  const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  const toggle = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (permission === 'granted') {
        await disableNexoraPush();
        setMessage('Notifications disabled for this device.');
      } else {
        await enableNexoraPush();
        setMessage('Notifications enabled on this device.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to change notifications.');
    } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-1">
      <button type="button" disabled={busy || permission === 'unsupported'} onClick={toggle}
        className="flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/15 disabled:opacity-50">
        <BellRing size={15} />
        {busy ? 'Please wait…' : permission === 'granted' ? 'Disable Notifications' : 'Enable Notifications'}
      </button>
      {message && <span role="status" className="max-w-48 text-xs text-slate-300">{message}</span>}
    </div>
  );
};
