import React, { useState } from 'react';
import { Shield, Sparkles, Building, IdCard, Users, GraduationCap, ChevronRight } from 'lucide-react';
import { FOUNDING_TEAM } from '../../services/mockData';
import { TeamMemberProfile } from '../../types';
import { NexoraLogo } from '../../components/ui/NexoraLogo';

export const TeamPage: React.FC = () => {
  const founder = FOUNDING_TEAM.find((m) => m.is_founder)!;
  const placeholders = FOUNDING_TEAM.filter((m) => !m.is_founder);

  // 3D Card Hover Tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

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

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full user-select-none">
          <span>Visionary Student Leadership</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight user-select-none">
          THE PEOPLE BEHIND THE VISION.
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
          Every movement begins with people willing to build something new.
        </p>
      </div>

      {/* Founder Digital ID Card Section */}
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
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-violet-500/50 shadow-[0_0_20px_-5px_rgba(139,92,246,0.6)] shrink-0 bg-[#08080D]">
              <img
                src={founder.avatar_url}
                alt="Mitesh Pipaliya - Founder"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight select-text">
                {founder.name}
              </h2>
              <div className="text-xs font-semibold text-violet-400 user-select-none">
                {founder.role}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1 font-mono pt-1 user-select-none">
                <Building className="w-3 h-3 text-slate-500" />
                <span>Birla Vishvakarma Mahavidyalaya</span>
              </div>
            </div>
          </div>

          {/* Student Academic Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-[#11101B]/80 rounded-xl border border-violet-500/15 font-mono text-xs text-slate-300">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block user-select-none">Department</span>
              <span className="text-white font-medium select-text">{founder.department}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block user-select-none">Institution</span>
              <span className="text-white font-medium select-text">BVM</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block user-select-none">Enrollment No.</span>
              <span className="text-violet-300 font-bold selectable-content select-text">{founder.enrollment_number}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block user-select-none">Division</span>
              <span className="text-white font-medium selectable-content select-text">{founder.division}</span>
            </div>
          </div>

          {/* Founder Bio Note */}
          <p className="pt-4 text-xs text-slate-400 leading-relaxed font-light select-text">
            {founder.bio}
          </p>

          {/* Holographic Security Micro-line */}
          <div className="pt-5 mt-4 border-t border-violet-500/15 flex items-center justify-between text-[10px] font-mono text-slate-500 user-select-none">
            <span>BVM INITIATIVE PROTOCOL</span>
            <span className="text-violet-400">ID: NXR-FOUNDER-001</span>
          </div>
        </div>
      </div>

      {/* Prospective Executive Team Roster */}
      <div className="space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white user-select-none">
            Prospective Executive Roles
          </h2>
          <p className="text-sm text-slate-400 font-light">
            The core organizing committee will be formally constituted following faculty mentor alignment and student open calls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {placeholders.map((member) => (
            <div
              key={member.id}
              className="p-6 rounded-2xl bg-[#171426]/70 border border-violet-500/15 space-y-4 hover:border-violet-500/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between user-select-none">
                  <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-500/20 flex items-center justify-center text-violet-400 font-mono text-xs">
                    TBA
                  </div>
                  <span className="text-[11px] font-mono text-violet-400 bg-violet-950/50 px-2.5 py-0.5 rounded border border-violet-500/20">
                    To Be Announced
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white user-select-none">
                    {member.name}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5 user-select-none">
                    {member.department}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-light select-text">
                  {member.bio}
                </p>
              </div>

              <div className="pt-3 border-t border-violet-500/10 text-[11px] font-mono text-slate-500 flex items-center justify-between user-select-none">
                <span>{member.institution}</span>
                <span className="text-violet-400">Open Call</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Faculty Mentorship Statement */}
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
