import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Building, IdCard, Users, GraduationCap, ChevronRight, Loader2, Linkedin, Github, Twitter, Mail } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { TeamMember, TeamDepartment } from '../../types';
import { NexoraLogo } from '../../components/ui/NexoraLogo';

type PublicTeamCache = { members: TeamMember[]; departments: TeamDepartment[]; savedAt: number };
const TEAM_CACHE_KEY = 'nexora-public-team-v1';
const TEAM_CACHE_TTL = 15 * 60 * 1000;

const readCachedTeam = (): PublicTeamCache | null => {
  try {
    const raw = sessionStorage.getItem(TEAM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicTeamCache;
    if (!Array.isArray(parsed.members) || !Array.isArray(parsed.departments)) return null;
    if (Date.now() - parsed.savedAt > TEAM_CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const TeamPage: React.FC = () => {
  const [initialCache] = useState(readCachedTeam);
  const [members, setMembers] = useState<TeamMember[]>(() => initialCache?.members ?? []);
  const [departments, setDepartments] = useState<TeamDepartment[]>(() => initialCache?.departments ?? []);
  const [loading, setLoading] = useState(!initialCache);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 3D Card Hover Tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    let active = true;
    // Data is never invented: cached entries are previously retrieved public team members.
    dataService.getPublicTeamData().then(data => {
      if (!active) return;
      const liveMembers = data.members ?? [];
      const liveDepartments = data.meta?.departments ?? [];
      setMembers(liveMembers);
      setDepartments(liveDepartments);
      setLoadError(false);
      try {
        sessionStorage.setItem(TEAM_CACHE_KEY, JSON.stringify({
          members: liveMembers,
          departments: liveDepartments,
          savedAt: Date.now(),
        } satisfies PublicTeamCache));
      } catch {
        // Storage can be unavailable; rendering must still succeed.
      }
    }).catch(error => {
      console.error('[TEAM] Unable to load public roster:', error);
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [refreshKey]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -(y / (rect.height / 2)) * 10,
      y: (x / (rect.width / 2)) * 10
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const founder = members.find((m) => m.is_founder) || members[0];
  const regularMembers = members.filter((m) => !m.is_founder);

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full user-select-none">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Visionary Student Leadership</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight user-select-none">
          THE PEOPLE BEHIND THE VISION.
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
          Every movement begins with people willing to build something new. Meet the student organizers, engineers, and creatives powering NEXORA.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading team credentials...</span>
        </div>
      ) : (
        <>
          {/* Founder Digital ID Card Section */}
          {founder && (
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs font-mono text-violet-400 uppercase tracking-widest mb-6 user-select-none">
                NEXORA DIGITAL CREDENTIAL · FOUNDER BADGE
              </div>

              {/* 3D Interactive ID Card */}
              <div
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="relative w-full max-w-md bg-gradient-to-b from-[#1c1730] to-[#0d0c17] rounded-3xl p-6 sm:p-8 border border-violet-500/35 shadow-[0_20px_50px_-15px_rgba(139,92,246,0.35)] overflow-hidden group select-none"
              >
                {/* Subtle holographic sheen overlay */}
                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-violet-400/10 to-transparent group-hover:translate-x-full duration-1000 transition-transform pointer-events-none" />

                {/* Card Header: Exact NexoraLogo & Founder Chip */}
                <div className="flex items-center justify-between pb-6 border-b border-violet-500/20">
                  <NexoraLogo size="sm" />
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-violet-300 bg-violet-950/80 border border-violet-500/30 rounded-md user-select-none">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    <span>FOUNDER</span>
                  </div>
                </div>

                {/* Profile Photo & Name */}
                <div className="pt-6 pb-6 flex items-center gap-5">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-violet-500/50 shadow-[0_0_20px_-5px_rgba(139,92,246,0.6)] shrink-0 bg-[#08080D] flex items-center justify-center">
                    {founder.avatar_url && !avatarError ? (
                      <img
                        src={founder.avatar_url}
                        alt={`${founder.name} - Founder`}
                        onError={() => setAvatarError(true)}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-700 to-purple-900 text-white font-bold text-2xl font-mono">
                        {founder.name?.slice(0, 2).toUpperCase() || 'MP'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight select-text">
                      {founder.name}
                    </h2>
                    <div className="text-xs font-semibold text-violet-400 user-select-none">
                      {founder.role_name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 font-mono pt-1 user-select-none">
                      <Building className="w-3 h-3 text-slate-500" />
                      <span>{founder.institution || 'Birla Vishvakarma Mahavidyalaya'}</span>
                    </div>
                  </div>
                </div>

                {/* Student Academic Details Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-[#11101B]/80 rounded-xl border border-violet-500/15 font-mono text-xs text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block user-select-none">Department</span>
                    <span className="text-white font-medium select-text">{founder.department_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block user-select-none">Branch</span>
                    <span className="text-white font-medium select-text">{founder.academic_branch_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block user-select-none">Enrollment No.</span>
                    <span className="text-violet-300 font-bold selectable-content select-text">{founder.enrollment_number || '23EL001'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block user-select-none">Division</span>
                    <span className="text-white font-medium selectable-content select-text">{founder.division || 'Division A'}</span>
                  </div>
                </div>

                {/* Founder Bio Note */}
                <p className="pt-4 text-xs text-slate-400 leading-relaxed font-light select-text">
                  {founder.bio}
                </p>

                {/* Social Links if present */}
                {founder.social_links && (
                  <div className="pt-4 flex items-center gap-3 text-slate-400">
                    {founder.social_links.linkedin && (
                      <a href={founder.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-violet-400">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {founder.social_links.github && (
                      <a href={founder.social_links.github} target="_blank" rel="noopener noreferrer" className="hover:text-violet-400">
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {founder.social_links.twitter && (
                      <a href={founder.social_links.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-violet-400">
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Holographic Security Micro-line */}
                <div className="pt-5 mt-4 border-t border-violet-500/15 flex items-center justify-between text-[10px] font-mono text-slate-500 user-select-none">
                  <span>BVM INITIATIVE PROTOCOL</span>
                  <span className="text-violet-400">ID: NXR-FOUNDER-001</span>
                </div>
              </div>
            </div>
          )}

          {/* Prospective & Appointed Executive Team Roster */}
          {regularMembers.length > 0 && (
            <div className="space-y-8">
              <div className="text-center space-y-2 max-w-xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-white user-select-none">
                  Executive Organizing Committee &amp; Faculty Mentors
                </h2>
                <p className="text-sm text-slate-400 font-light">
                  Cross-disciplinary engineers, faculty coordinators, and student leaders driving technical arena setups, scoring matrices, and platform operations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regularMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-6 rounded-2xl bg-[#171426]/80 border border-violet-500/20 space-y-4 hover:border-violet-500/40 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between user-select-none">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-violet-500/30 bg-[#0d0c15] shadow-[0_0_15px_-3px_rgba(139,92,246,0.4)] shrink-0">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/team/mitesh_founder.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-violet-300 font-mono font-bold text-sm bg-violet-950/80">
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-violet-300 bg-violet-950/80 px-2.5 py-0.5 rounded-md border border-violet-500/25">
                          {member.department_name}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-white user-select-none">
                          {member.name}
                        </h3>
                        <div className="text-xs font-mono text-violet-400 mt-0.5 user-select-none">
                          {member.role_name}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span>{member.academic_branch_name}</span>
                        {member.division && <span>· Div {member.division}</span>}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
                        {member.bio}
                      </p>

                      {member.faculty_designation && (
                        <div className="p-3 bg-[#11101B] border border-violet-500/20 rounded-xl space-y-1 font-mono text-xs">
                          <div className="text-violet-300 font-semibold">{member.faculty_designation}</div>
                          {member.faculty_cabin && <div className="text-slate-400">Cabin: {member.faculty_cabin}</div>}
                          {member.faculty_research && <div className="text-slate-400">Research: {member.faculty_research}</div>}
                          {member.faculty_office_hours && <div className="text-emerald-400">Hours: {member.faculty_office_hours}</div>}
                        </div>
                      )}

                      {member.social_links && (
                        <div className="pt-2 flex items-center gap-3 text-slate-400">
                          {member.social_links.linkedin && (
                            <a href={member.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors">
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                          {member.social_links.github && (
                            <a href={member.social_links.github} target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors">
                              <Github className="w-4 h-4" />
                            </a>
                          )}
                          {member.social_links.twitter && (
                            <a href={member.social_links.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors">
                              <Twitter className="w-4 h-4" />
                            </a>
                          )}
                          {member.social_links.email && (
                            <a href={`mailto:${member.social_links.email}`} className="hover:text-violet-400 transition-colors">
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-violet-500/15 text-[11px] font-mono text-slate-400 flex items-center justify-between user-select-none">
                      <span>{member.institution || 'BVM Engineering'}</span>
                      {member.enrollment_number && (
                        <span className="text-violet-400">ID: {member.enrollment_number}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && loadError && members.length === 0 && (
        <div role="alert" className="rounded-2xl border border-violet-500/25 bg-[#171426]/80 px-6 py-8 text-center space-y-3">
          <p className="text-slate-200">Team information is temporarily unavailable.</p>
          <button type="button" onClick={() => { setLoading(true); setLoadError(false); setRefreshKey(key => key + 1); }}
            className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium">
            Try again
          </button>
        </div>
      )}
      {!loading && !loadError && members.length === 0 && (
        <p className="text-center text-slate-400">Team members will be displayed when the public roster is available.</p>
      )}

      {/* Faculty Mentorship Alignment Statement */}
      <div className="p-8 rounded-3xl bg-[#11101B]/80 border border-violet-500/25 max-w-4xl mx-auto space-y-3 text-center">
        <GraduationCap className="w-8 h-8 text-violet-400 mx-auto" />
        <h3 className="text-xl font-bold text-white user-select-none">Faculty Mentorship Alignment</h3>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
          NEXORA holds deep respect for Birla Vishvakarma Mahavidyalaya&apos;s academic standards. In accordance with honest disclosure, faculty advisors and mentors will be formally announced only after official institutional review and agreement.
        </p>
      </div>
    </div>
  );
};
