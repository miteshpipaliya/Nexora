import React, { useState } from 'react';
import { Check, Copy, Ticket, Clock3, Users, Wallet } from 'lucide-react';
import type { RegistrationRecord } from '../../types';

interface RegistrationTicketProps {
  registration: RegistrationRecord;
  onClose?: () => void;
}

// This ticket displays backend-issued registration facts. Pending is a payment
// UI state only; no payment success is implied before a verified gateway callback.
export const RegistrationTicket: React.FC<RegistrationTicketProps> = ({ registration, onClose }) => {
  const [copied, setCopied] = useState(false);
  const id = registration.competition_id || registration.reference_id || registration.id;
  const registeredAt = new Date(registration.created_at);
  const validDate = !Number.isNaN(registeredAt.getTime());
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
    } catch { setCopied(false); }
  };

  return (
    <div className="mx-auto w-full max-w-md" role="group" aria-label="NEXORA competition registration ticket">
      <div className="nexora-registration-ticket relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#221536] via-[#1b1430] to-[#0c0b15] border border-violet-400/40 shadow-[0_24px_80px_-35px_rgba(155,95,255,0.55)]">
        <div aria-hidden="true" className="nexora-ticket-sheen pointer-events-none absolute inset-0 z-[1] opacity-40" />
        <div className="relative z-[2] px-6 pt-6 pb-5 bg-gradient-to-r from-violet-700/30 to-fuchsia-800/10">
          <div className="flex justify-between items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-[.24em] text-violet-200">NEXORA · REGISTRATION PASS</span>
            <Ticket className="h-6 w-6 text-violet-300" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-4 leading-tight">{registration.event_title}</h2>
          <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300 mt-3">
            Registration {registration.registration_status || 'Recorded'}
          </span>
        </div>
        <div className="relative z-[2] px-6 py-6 border-y border-dashed border-violet-400/30">
          <span className="absolute h-6 w-6 -left-3 -top-3 rounded-full bg-[#08070e] border-r border-b border-violet-500/30" />
          <span className="absolute h-6 w-6 -right-3 -top-3 rounded-full bg-[#08070e] border-l border-b border-violet-500/30" />
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Unique Registration ID</div>
          <div className="flex items-center justify-between gap-3 mt-2">
            <strong className="text-2xl sm:text-3xl text-white font-mono break-all tracking-widest">{id}</strong>
            <button type="button" onClick={() => void copyId()} aria-label="Copy registration ID"
              className="p-2 rounded-lg text-violet-200 bg-violet-500/15 border border-violet-500/25">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 text-xs">
            <div className="col-span-2">
              <div className="text-slate-500 font-mono text-[10px] uppercase">Participant</div>
              <div className="text-white font-semibold mt-1">{registration.full_name}</div>
            </div>
            {registration.team_name && (
              <div className="col-span-2">
                <div className="text-slate-500 font-mono text-[10px] uppercase flex gap-1 items-center"><Users className="h-3 w-3"/> Team</div>
                <div className="text-violet-200 font-semibold mt-1">{registration.team_name}</div>
              </div>
            )}
            <div>
              <div className="text-slate-500 font-mono text-[10px] uppercase flex items-center gap-1"><Clock3 className="h-3 w-3"/> Registered</div>
              <div className="text-white mt-1 leading-relaxed">{validDate
                ? registeredAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recorded'}</div>
            </div>
            <div>
              <div className="text-slate-500 font-mono text-[10px] uppercase">Entry Type</div>
              <div className="text-white mt-1">{registration.team_name ? 'Team Entry' : 'Individual Entry'}</div>
            </div>
          </div>
        </div>
        <div className="relative z-[2] px-6 py-5 flex justify-between items-center gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase text-slate-400 flex items-center gap-1"><Wallet className="h-3 w-3" /> Payment</p>
            <span className="inline-flex text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-3 py-1 rounded-lg mt-2">● PAYMENT PENDING</span>
            <p className="text-[10px] text-slate-500 mt-2">₹{registration.calculated_fee ?? 0} · Payment verification not enabled yet</p>
          </div>
          <span className="text-[10px] text-violet-300 font-mono tracking-widest">NEXORA / BVM</span>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-4">Your registration is recorded. Keep this reference for entry verification; payment is not yet confirmed.</p>
      {onClose && <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-violet-600 text-white py-3 text-sm font-semibold hover:bg-violet-500">Close Ticket</button>}
    </div>
  );
};
