import React, { useEffect, useState } from 'react';
import { Crown, GraduationCap, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { dataService } from '../../services/dataService';
import type { TeamMember } from '../../types';
import { NexoraLogo } from '../../components/ui/NexoraLogo';

// Never persist a private CMS roster in a public browser cache.
const publicOnly = (members: TeamMember[]): TeamMember[] => members
  .filter(m => m.enabled !== false && (m.is_founder === true || m.visibility_approved === true))
  .sort((a, b) => Number(Boolean(b.is_founder)) - Number(Boolean(a.is_founder)) ||
    (a.display_order ?? 99) - (b.display_order ?? 99) || a.name.localeCompare(b.name));

const Detail = ({ label, value }: { label: string; value?: string }) => (
  <div className="min-w-0">
    <span className="block text-[10px] tracking-wider uppercase text-slate-500 font-mono">{label}</span>
    <span className="block break-words text-sm text-slate-100 font-medium mt-1">{value?.trim() || '—'}</span>
  </div>
);

export const TeamPage: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    dataService.getPublicTeamData()
      .then(data => {
        if (!active) return;
        setMembers(publicOnly(data.members ?? []));
        setError(false);
      })
      .catch(err => {
        console.error('[TEAM] Public roster unavailable:', err);
        if (active) setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  const founder = members.find(member => member.is_founder);
  const others = members.filter(member => !member.is_founder);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 space-y-14">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-950/20 px-4 py-1.5 text-xs font-mono text-violet-300">
          <Sparkles className="h-3.5 w-3.5" /> NEXORA · THE PEOPLE BEHIND THE VISION
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Meet the NEXORA Team</h1>
        <p className="text-slate-400 max-w-xl mx-auto">A student-led initiative built on collaboration, creativity and engineering.</p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center gap-3 py-20 text-violet-300 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading team...
        </div>
      ) : (
        <>
          {founder && (
            <section aria-label="Founder" className="mx-auto w-full max-w-xl">
              <div className="text-center text-[11px] text-amber-300/85 font-mono tracking-[.2em] uppercase mb-5">Founder · NEXORA</div>
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#221a31] to-[#0d0c17] p-6 sm:p-8 border border-[#d4af37]/80 shadow-[0_18px_65px_-28px_rgba(212,175,55,.45)]">
                <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-amber-400/5 blur-3xl pointer-events-none" />
                <div className="flex justify-between items-center border-b border-amber-300/15 pb-5 relative">
                  <NexoraLogo size="sm" />
                  <span className="flex gap-1.5 items-center bg-amber-400/10 border border-amber-400/25 rounded-full px-3 py-1 text-[11px] text-amber-200 font-semibold">
                    <Crown className="h-3 w-3" /> FOUNDER
                  </span>
                </div>
                <div className="flex gap-5 items-center py-6 relative">
                  <div className="h-20 w-20 rounded-2xl overflow-hidden bg-violet-950/40 border border-amber-300/25 shrink-0 flex items-center justify-center text-xl text-amber-200 font-semibold">
                    {founder.avatar_url && !avatarFailed
                      ? <img src={founder.avatar_url} alt="" onError={() => setAvatarFailed(true)} className="w-full h-full object-cover" />
                      : founder.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl text-white font-bold">{founder.name}</h2>
                    <p className="text-sm text-amber-200/90 mt-1">{founder.role_name || 'Founder'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 p-4 bg-black/25 rounded-xl border border-white/5 relative">
                  <Detail label="Department" value={founder.department_name} />
                  <Detail label="Division" value={founder.division} />
                  <Detail label="Enrollment" value={founder.enrollment_number} />
                </div>
                {founder.bio?.trim() && <p className="text-sm text-slate-300 leading-relaxed border-t border-amber-300/10 mt-5 pt-5">{founder.bio}</p>}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-7">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Team & Faculty</h2>
                <p className="text-sm text-slate-400">Only profiles approved for publication are shown.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {others.map(member => {
                  const faculty = member.role_key?.startsWith('faculty_') || member.role_name === 'Faculty Member';
                  return (
                    <article key={member.id} className="rounded-2xl bg-[#171426]/90 border border-violet-500/20 p-6 space-y-5 hover:border-violet-500/40 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-mono text-violet-300">{member.role_name || (faculty ? 'Faculty Member' : 'Team Member')}</span>
                        {faculty ? <GraduationCap className="h-5 w-5 text-violet-400" /> : <Users className="h-5 w-5 text-violet-400" />}
                      </div>
                      <h3 className="text-xl font-bold text-white break-words">{member.name}</h3>
                      <div className="grid grid-cols-2 gap-4 border-t border-violet-500/15 pt-4">
                        <Detail label="Department" value={member.department_name} />
                        {!faculty && <Detail label="Division" value={member.division} />}
                        {!faculty && <Detail label="Enrollment" value={member.enrollment_number} />}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {!founder && !error && <div className="text-center text-slate-400">Team profiles are being prepared.</div>}
          {error && <div role="alert" className="text-center text-slate-300 space-y-4">
            <p>Team profiles are temporarily unavailable.</p>
            <button type="button" onClick={() => setRefresh(r => r + 1)}
              className="rounded-lg px-5 py-2 bg-violet-700 text-white">Try again</button>
          </div>}
        </>
      )}
      <footer className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4" /> Unpublished team and faculty details remain private.
      </footer>
    </main>
  );
};
