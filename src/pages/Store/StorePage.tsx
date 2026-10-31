import React, { useState } from 'react';
import { Sparkles, ShoppingBag, Bell, ShieldCheck, Cpu, Shirt, Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TshirtViewer3D } from '../../components/three/TshirtViewer3D';

export const StorePage: React.FC = () => {
  const [activePreview, setActivePreview] = useState<'apparel' | 'hardware' | 'badges'>('apparel');

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 text-xs font-mono text-violet-300 bg-violet-950/60 border border-violet-500/30 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Official NEXORA Merch &amp; Hardware</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          NEXORA STORE
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-light">
          Engineered for innovators. Represent the movement across campus and beyond.
        </p>
      </div>

      {/* Futuristic Purple Coming Soon Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b1236] via-[#120f24] to-[#0a0914] border border-violet-500/30 p-8 sm:p-12 shadow-[0_0_50px_-10px_rgba(139,92,246,0.25)]">
        {/* Cosmic Background Gradients */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-block px-5 py-2 rounded-full bg-violet-950/90 border border-violet-400/50 shadow-[0_0_30px_rgba(139,92,246,0.5)]">
            <span className="text-sm sm:text-base font-extrabold tracking-widest text-violet-200 font-mono">
              COMING SOON
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Something Extraordinary is Being Crafted.
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-light">
            We are designing high-performance merchandise, official BVM student innovator apparel, NFC-enabled identity gear, and hardware kits for upcoming competitions.
          </p>

          {/* Quick Notice */}
          <div className="p-4 bg-violet-950/40 border border-violet-500/20 rounded-2xl flex items-center justify-center gap-3 text-xs text-violet-300 font-mono">
            <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
            <span>Store launch will go live following formal faculty mentorship &amp; institutional review.</span>
          </div>
        </div>
      </div>

      {/* Futuristic Sneak Peek Collections */}
      <div className="space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            IN THE PIPELINE
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white">
            Upcoming Official Collections
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Performance Apparel */}
          <div className="p-6 rounded-2xl bg-[#171426]/70 border border-violet-500/20 space-y-4 flex flex-col justify-between hover:border-violet-500/40 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Shirt className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Founders &amp; Flagship Apparel</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                High-density breathable poly-cotton blends tailored with cosmic cybernetic accents, reflective NEXORA typography, and personalized departmental insignias.
              </p>
            </div>
            <div className="pt-4 border-t border-violet-500/15 flex items-center justify-between text-xs font-mono text-violet-400">
              <span>Status: In Design</span>
              <span className="px-2 py-0.5 rounded bg-violet-950/80 border border-violet-500/30 text-[10px]">Batch #01</span>
            </div>
          </div>

          {/* Card 2: Smart Credentials & NFC Badges */}
          <div className="p-6 rounded-2xl bg-[#171426]/70 border border-violet-500/20 space-y-4 flex flex-col justify-between hover:border-violet-500/40 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">NFC Innovator Smart Badges</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Hardware-linked attendee credentials with embedded NFC tags linking directly to your verified NEXORA student profile and competition track records.
              </p>
            </div>
            <div className="pt-4 border-t border-violet-500/15 flex items-center justify-between text-xs font-mono text-violet-400">
              <span>Status: Prototyping</span>
              <span className="px-2 py-0.5 rounded bg-violet-950/80 border border-violet-500/30 text-[10px]">Cyber Series</span>
            </div>
          </div>

          {/* Card 3: Arena Hardware Kits */}
          <div className="p-6 rounded-2xl bg-[#171426]/70 border border-violet-500/20 space-y-4 flex flex-col justify-between hover:border-violet-500/40 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Arena Hackathon Survival Kits</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Curated competition essentials including microcontroller expansion headers, tactile switches, high-speed patch cables, and collectible vinyl decal packs.
              </p>
            </div>
            <div className="pt-4 border-t border-violet-500/15 flex items-center justify-between text-xs font-mono text-violet-400">
              <span>Status: Component Sourcing</span>
              <span className="px-2 py-0.5 rounded bg-violet-950/80 border border-violet-500/30 text-[10px]">Arena Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Visualizer Teaser (No shopping cart or pricing) */}
      <div className="p-8 sm:p-12 rounded-3xl bg-[#11101B]/80 border border-violet-500/20 space-y-8">
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            3D LAB PREVIEW
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white">
            Apparel Architecture Preview
          </h3>
          <p className="text-xs text-slate-400">
            Preview the interactive 3D model of the official NEXORA Founders edition.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <TshirtViewer3D
            customization={{
              edition: 'founders',
              studentName: 'INNOVATOR',
              department: 'BVM // NEXORA',
              numberTag: '01',
              size: 'L'
            }}
            viewAngle="spin"
          />
        </div>
      </div>

      {/* CTA: Back to Competitions */}
      <div className="text-center pt-4">
        <Link
          to="/competitions"
          className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors shadow-lg"
        >
          <span>Explore Live Competitions</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
};
