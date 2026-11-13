import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import '../../styles/featherPhoenix.css';

/**
 * Preview variant: the original NEXORA phoenix replaces the Three.js hero object.
 * Uses the same existing transparent phoenix asset as the cinematic intro.
 * A mask-clipped feather shimmer is the only new effect in this branch.
 * No WebGL, color cycling, or changes to the intro/fog sequence.
 */
export const CosmicHeroObject: React.FC = () => {
  const reduced = useReducedMotion();

  return (
    <div
      className="relative isolate w-full h-full min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px] flex items-center justify-center overflow-visible pointer-events-none"
      role="img"
      aria-label="Large luminous purple NEXORA phoenix with wide wings and flowing celestial ribbons"
    >
      {/* Very soft halo behind the artwork—not a bright solid circle. */}
      <motion.div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 w-[86%] h-[80%] rounded-full"
        style={{
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse at center, rgba(112,53,200,0.20) 0%, rgba(73,31,128,0.08) 40%, transparent 72%)',
          filter: 'blur(42px)',
        }}
        animate={reduced ? undefined : { opacity: [0.65, 0.90, 0.65], scale: [0.96, 1.04, 0.96] }}
        transition={reduced ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Three subtle orbiting pinlights, separate from the original logo art. */}
      {!reduced && (
        <>
          <motion.div
            aria-hidden="true"
            className="absolute z-0 top-1/2 left-1/2 w-[83%] h-[62%] rounded-full border border-violet-400/[0.16]"
            style={{ transform: 'translate(-50%, -50%) rotate(-21deg)', boxShadow: '0 0 25px rgba(139,92,246,0.07)' }}
            animate={{ rotate: [-21, 339] }}
            transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute left-[50%] top-[-3px] w-[5px] h-[5px] rounded-full bg-white shadow-[0_0_8px_3px_rgba(172,108,255,0.7)]" />
          </motion.div>
          <motion.div
            aria-hidden="true"
            className="absolute z-0 top-1/2 left-1/2 w-[76%] h-[72%] rounded-full border border-purple-400/[0.1]"
            style={{ transform: 'translate(-50%, -50%) rotate(30deg)' }}
            animate={{ rotate: [30, -330] }}
            transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute right-[12%] top-[12%] w-[4px] h-[4px] rounded-full bg-violet-100 shadow-[0_0_9px_3px_rgba(164,95,245,0.6)]" />
          </motion.div>
        </>
      )}

      {/* The original asset is untouched; a CSS alpha mask clips a gentle
          reflection to its feather silhouette. No recoloring or image motion. */}
      <div className="feather-phoenix-art relative z-10" aria-hidden="true">
        <img
          src="/images/intro/NEXORA%20LOGO.png?v=3"
          alt=""
          draggable={false}
          decoding="async"
          loading="eager"
          className="feather-phoenix-img"
        />
        {!reduced && <span className="feather-phoenix-shimmer" />}
      </div>
    </div>
  );
};
