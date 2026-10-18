import React, { useState } from 'react';
import { Sparkles, RotateCw, User, ShieldCheck, Tag, Info } from 'lucide-react';
import { TshirtViewer3D, TshirtCustomization } from '../../components/three/TshirtViewer3D';
import { useAuth } from '../../context/AuthContext';

export const StorePage: React.FC = () => {
  const { user } = useAuth();

  const [customization, setCustomization] = useState<TshirtCustomization>({
    edition: 'founders',
    studentName: user?.full_name ? user.full_name.split(' ')[0] : 'INNOVATOR',
    department: user?.branch || 'ELECTRONICS // BVM',
    numberTag: '01',
    size: 'L'
  });

  const [viewAngle, setViewAngle] = useState<'front' | 'back' | 'spin'>('spin');

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono text-violet-300 bg-[#171426] border border-violet-500/25 rounded-full">
          <span>Official Merchandise Architecture</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          NEXORA WEAR.
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
          Represent the vision. Wear the identity.
        </p>
      </div>

      {/* Coming Soon Notice Banner */}
      <div className="max-w-4xl mx-auto p-5 bg-[#171426] border border-violet-500/30 rounded-2xl flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-violet-400 font-semibold tracking-wider">
            THE COLLECTION IS COMING
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            An exclusive NEXORA merchandise experience is being developed. Experiment with our interactive 3D personalization preview below!
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-mono text-violet-300 bg-violet-950/80 border border-violet-500/25 rounded-lg shrink-0">
          Prototype Preview Active
        </span>
      </div>

      {/* 3D T-Shirt Customizer Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Left Column: Interactive 3D Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <TshirtViewer3D
            customization={customization}
            viewAngle={viewAngle}
          />

          {/* Viewer Rotation Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setViewAngle('front')}
              className={`px-4 py-2 text-xs font-mono rounded-lg transition-colors ${
                viewAngle === 'front'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-[#171426] text-slate-300 border border-violet-500/20 hover:text-white'
              }`}
            >
              Front View
            </button>
            <button
              onClick={() => setViewAngle('back')}
              className={`px-4 py-2 text-xs font-mono rounded-lg transition-colors ${
                viewAngle === 'back'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-[#171426] text-slate-300 border border-violet-500/20 hover:text-white'
              }`}
            >
              Back Personalization
            </button>
            <button
              onClick={() => setViewAngle('spin')}
              className={`px-4 py-2 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 ${
                viewAngle === 'spin'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-[#171426] text-slate-300 border border-violet-500/20 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>360° Spin</span>
            </button>
          </div>
        </div>

        {/* Right Column: Customization Controls & Product Details */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-[#11101B] border border-violet-500/20 space-y-6">
          <div>
            <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
              CUSTOM ENGINEERING
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">
              NEXORA Performance Tee
            </h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-violet-300">₹599</span>
              <span className="text-xs text-slate-500 font-mono">(Proposed Pre-Order Rate)</span>
            </div>
          </div>

          {/* Color Edition Swatches */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 block">
              Colorway Edition:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCustomization({ ...customization, edition: 'founders' })}
                className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 ${
                  customization.edition === 'founders'
                    ? 'border-violet-400 bg-[#171426] text-white shadow-[0_0_15px_-3px_rgba(139,92,246,0.4)]'
                    : 'border-violet-500/20 bg-[#0d0c17] text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-[#0d0c17] border border-violet-400 shadow-sm shrink-0" />
                <div>
                  <div className="font-semibold text-white">Founders Black</div>
                  <div className="text-[10px] text-violet-400 font-mono">Cosmic Purple</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCustomization({ ...customization, edition: 'zerocode' })}
                className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 ${
                  customization.edition === 'zerocode'
                    ? 'border-cyan-400 bg-[#171426] text-white shadow-[0_0_15px_-3px_rgba(56,189,248,0.4)]'
                    : 'border-violet-500/20 bg-[#0d0c17] text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-slate-100 border border-cyan-400 shadow-sm shrink-0" />
                <div>
                  <div className="font-semibold text-white">ZeroCode White</div>
                  <div className="text-[10px] text-cyan-400 font-mono">Electric Blue</div>
                </div>
              </button>
            </div>
          </div>

          {/* Student Personalization */}
          <div className="space-y-3 pt-2 border-t border-violet-500/15">
            <label className="text-xs font-medium text-slate-300 block flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span>Back Personalization (Live 3D Render)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Student Name</span>
                <input
                  type="text"
                  maxLength={14}
                  value={customization.studentName}
                  onChange={(e) => setCustomization({ ...customization, studentName: e.target.value })}
                  placeholder="e.g. PIPALIYA"
                  className="w-full px-3 py-1.5 text-xs uppercase font-mono bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Jersey Number</span>
                <input
                  type="text"
                  maxLength={2}
                  value={customization.numberTag}
                  onChange={(e) => setCustomization({ ...customization, numberTag: e.target.value })}
                  placeholder="01"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Branch Subtitle</span>
              <input
                type="text"
                maxLength={24}
                value={customization.department}
                onChange={(e) => setCustomization({ ...customization, department: e.target.value })}
                placeholder="ELECTRONICS // BVM"
                className="w-full px-3 py-1.5 text-xs uppercase font-mono bg-[#171426] border border-violet-500/20 rounded-lg text-white focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-2 pt-2 border-t border-violet-500/15">
            <span className="text-xs font-medium text-slate-300 block">Select Size:</span>
            <div className="flex gap-2">
              {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCustomization({ ...customization, size: s })}
                  className={`w-10 h-9 rounded-lg text-xs font-mono font-medium transition-colors ${
                    customization.size === s
                      ? 'bg-violet-600 text-white font-bold shadow-md'
                      : 'bg-[#171426] text-slate-400 border border-violet-500/15 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Institutional Compliance Notice */}
          <div className="p-3 bg-violet-950/30 border border-violet-500/20 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Order processing and checkout are intentionally disabled until official BVM administrative authorization.
            </p>
          </div>

          {/* Disabled Pre-Order Button */}
          <button
            type="button"
            disabled
            className="w-full py-3.5 text-xs font-mono font-semibold text-slate-400 bg-[#171426] border border-violet-500/20 rounded-xl cursor-not-allowed opacity-80"
          >
            Orders Opening Post Institutional Approval
          </button>
        </div>
      </div>
    </div>
  );
};
