import React, { useState } from 'react';
import { Check, Copy, Ticket, Users, ShieldCheck, Wallet } from 'lucide-react';
import type { RegistrationRecord } from '../../types';

interface RegistrationTicketProps {
  registration: RegistrationRecord;
  onClose?: () => void;
}

// The pass is proof of registration, not payment or event admission.
// Render only backend-issued identity/reference fields. The phoenix artwork
// is the existing NEXORA asset; no new logo or backend technology is exposed.
export const RegistrationTicket: React.FC<RegistrationTicketProps> = ({ registration, onClose }) => {
  const [copied, setCopied] = useState(false);
  const reference = registration.reference_id || registration.id;
  const isTeam = Boolean(registration.team_name?.trim());
  const paid = registration.payment_status === 'Verified';
  const exempt = registration.payment_status === 'Exempt';
  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full max-w-[790px] mx-auto" role="group" aria-label="NEXORA competition registration pass">
      <article className="nexora-registration-ticket nexora-cyber-ticket relative isolate overflow-hidden border border-violet-400/65 text-left text-white shadow-[0_15px_75px_-20px_rgba(141,76,255,.55)]">
        <div aria-hidden="true" className="nexora-ticket-grid absolute inset-0 pointer-events-none" />
        <div aria-hidden="true" className="nexora-ticket-sheen absolute inset-y-0 left-0 w-[36%] pointer-events-none z-[3]" />
        <span aria-hidden="true" className="nexora-ticket-notch nexora-ticket-notch-tl" />
        <span aria-hidden="true" className="nexora-ticket-notch nexora-ticket-notch-tr" />
        <span aria-hidden="true" className="nexora-ticket-notch nexora-ticket-notch-bl" />
        <span aria-hidden="true" className="nexora-ticket-notch nexora-ticket-notch-br" />

        <div className="relative z-[2] grid grid-cols-1 md:grid-cols-[minmax(0,1.12fr)_minmax(0,.88fr)] min-h-[365px]">
          <div className="relative flex flex-col px-6 py-7 sm:px-9 sm:py-8">
            <header className="flex items-center justify-between gap-3 border-b border-violet-400/25 pb-4">
              <span className="font-semibold text-xl tracking-[.17em] text-violet-100">NEXORA</span>
              <span className="text-[10px] font-mono tracking-[.32em] text-violet-300/80">COMPETITION</span>
            </header>
            <div className="mt-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-violet-200">
                <ShieldCheck className="h-3 w-3" /> Official Registration
              </span>
              <span className="inline-flex items-center rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200">Recorded</span>
            </div>
            <h2 className="mt-4 max-w-lg text-2xl sm:text-[30px] leading-tight font-black tracking-tight break-words">{registration.event_title}</h2>
            <div className="mt-5">
              <div className="font-mono text-[10px] uppercase tracking-[.19em] text-violet-300/75">Participant name</div>
              <p className="mt-1 text-lg font-bold tracking-wide break-words">{registration.full_name}</p>
            </div>
            {isTeam && (
              <div className="mt-3">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.19em] text-violet-300/75">
                  <Users className="h-3 w-3" /> Team name
                </div>
                <p className="mt-1 text-sm font-semibold text-violet-100 break-words">{registration.team_name}</p>
              </div>
            )}
            <div className="mt-auto pt-5">
              <div className="text-[10px] uppercase tracking-[.19em] font-mono text-violet-300/70">Unique registration reference</div>
              <div className="mt-1 flex items-center gap-2">
                <strong className="min-w-0 break-all font-mono text-lg sm:text-[22px] font-bold tracking-[.1em] text-white">{reference}</strong>
                <button type="button" onClick={() => void copyReference()} title="Copy registration reference" aria-label={copied ? "Registration reference copied" : "Copy registration reference"} className="shrink-0 rounded-md border border-violet-400/45 bg-violet-500/20 p-2 text-violet-100 transition-colors hover:bg-violet-500/35">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <span role="status" className="sr-only">{copied ? "Registration reference copied to clipboard" : ""}</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-dashed border-violet-400/30 pt-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-violet-300/80"><Wallet className="h-3.5 w-3.5"/> PAYMENT STATUS</span>
              <span className={`rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider ${paid || exempt ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/40 bg-amber-400/10 text-amber-300'}`}>{paid ? '● VERIFIED' : exempt ? '● FREE ENTRY' : '● PENDING'}</span>
            </div>
          </div>

          <div className="relative min-h-[225px] overflow-hidden border-t border-violet-500/25 md:border-l md:border-t-0">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_50%,rgba(137,69,255,.28),transparent_64%)]" />
            <div aria-hidden="true" className="nexora-ticket-orbit absolute top-[50%] left-[50%] h-[65%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-violet-400/40 rotate-[-25deg] shadow-[0_0_24px_rgba(140,72,249,.28)]" />
            <div aria-hidden="true" className="nexora-ticket-orbit absolute top-[50%] left-[50%] h-[49%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-fuchsia-400/25 rotate-[27deg]" />
            <img src="/images/intro/NEXORA%20LOGO.png?v=3" alt="NEXORA phoenix emblem" draggable={false} className="nexora-ticket-phoenix absolute inset-0 h-full w-full object-contain p-5 drop-shadow-[0_0_15px_rgba(165,99,255,.5)]" />
            <span aria-hidden="true" className="absolute right-4 top-5 rounded border border-violet-500/35 bg-[#180c32]/80 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-violet-200">Authentic Pass</span>
            <span aria-hidden="true" className="absolute bottom-6 right-5 text-[10px] font-mono tracking-[.22em] text-violet-200/65">BUILD · COMPETE · INNOVATE</span>
          </div>
        </div>
        <div aria-hidden="true" className="nexora-ticket-bottom-code absolute bottom-1 left-6 z-[3] flex h-[7px] items-end gap-[3px] opacity-50">
          {Array.from({ length: 24 }, (_, i) => <span key={i} style={{ height: i % 4 === 0 ? 7 : i % 3 === 0 ? 5 : 3, width: i % 3 === 0 ? 2 : 1 }} className="bg-violet-300" />)}
        </div>
      </article>
      <p className="mt-4 text-center text-xs text-slate-400">{paid ? `Registration confirmed · ₹${registration.fee_paid ?? registration.calculated_fee ?? 0} paid (TEST MODE)` : exempt ? 'Registration confirmed · No online payment required' : `Registration pending · ₹${registration.calculated_fee ?? 0} payable`}</p>
      {onClose && <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl border border-violet-400/30 bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500">Close Pass</button>}
    </div>
  );
};
