import React, { useEffect, useState } from 'react';
import { Crown, GraduationCap, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { dataService } from '../../services/dataService';
import type { TeamMember } from '../../types';
import { NexoraLogo } from '../../components/ui/NexoraLogo';

// Never persist a private CMS roster in a public browser cache.
const publicOnly = (members: TeamMember[]): TeamMember[] => members
  .filter(m => m.enabled !== false && m.is_founder === true)
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
            <section aria-label="Founder" className="mx-auto w-full max-w-[470px]">
              <div className="text-center text-[11px] text-violet-300/80 font-mono tracking-[.19em] uppercase mb-5">NEXORA DIGITAL CREDENTIAL · FOUNDER BADGE</div>
              <article className="group relative overflow-hidden rounded-[25px] border border-[#d4af37]/75 bg-gradient-to-b from-[#211a36]/95 via-[#1a142c]/95 to-[#120f21]/95 px-7 pt-8 pb-6 shadow-[0_23px_60px_-25px_rgba(206,172,70,.24)] transition-transform duration-500 hover:-translate-y-1">
                <header className="relative flex items-center justify-between border-b border-violet-400/15 pb-6">
                  <NexoraLogo size="sm" />
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-200"><Crown className="h-3 w-3" /> FOUNDER</span>
                </header>
                <div className="flex items-center gap-5 py-7">
                  <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-2xl border border-violet-500/65 bg-[#0a0811] shadow-[0_0_18px_-5px_rgba(153,80,255,.7)] flex items-center justify-center text-violet-200 font-bold">
                    {founder.avatar_url && !avatarFailed ? <img src={founder.avatar_url} alt="" onError={() => setAvatarFailed(true)} className="w-full h-full object-cover"/> : founder.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold text-white break-words">{founder.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-violet-300">{founder.role_name || 'Founder'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-violet-400/10 bg-[#100d1d]/85 p-4">
                  <Detail label="Department / Branch" value={founder.academic_branch_name || founder.department_name} />
                  <Detail label="Division" value={founder.division} />
                  <Detail label="Enrollment No." value={founder.enrollment_number} />
                </div>
                {founder.bio?.trim() && <p className="border-b border-violet-500/10 py-5 text-sm leading-relaxed text-slate-400">{founder.bio}</p>}
                <footer className="flex items-center justify-between gap-3 pt-5 font-mono text-[10px] tracking-wider text-violet-300/60"><span>NEXORA INITIATIVE</span><span>FOUNDER · VERIFIED PROFILE</span></footer>
              </article>
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
                    <article key={member.id} className="group relative rounded-[24px] bg-gradient-to-b from-[#201936] to-[#120f22] border border-violet-500/25 p-6 space-y-5 shadow-[0_16px_45px_-25px_rgba(129,70,230,.3)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/45">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-mono text-violet-300">{member.role_name || (faculty ? 'Faculty Member' : 'Team Member')}</span>
                        {faculty ? <GraduationCap className="h-5 w-5 text-violet-400" /> : <Users className="h-5 w-5 text-violet-400" />}
                      </div>
                      <h3 className="text-xl font-bold text-white break-words">{member.name}</h3>
                      <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#0d0b19]/70 border border-violet-500/10 p-4">
                        <Detail label="Department / Branch" value={member.department_name} />
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
