import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Preview variant: the original NEXORA phoenix replaces the Three.js hero object.
 * Uses the same existing transparent phoenix asset as the cinematic intro.
 * No WebGL, texture downloads, or changes to the intro/fog sequence.
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

      {/* Responsive wingspan is intentionally generous. The original transparent
          image contains the delicate halo and orbit details seen in the reference. */}
      <motion.img
        src="/images/intro/NEXORA%20LOGO.png?v=3"
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className="relative z-10 block w-[116%] max-w-none sm:w-[118%] lg:w-[130%] h-auto max-h-[min(82vh,650px)] object-contain select-none"
        style={{
          filter: 'drop-shadow(0 0 12px rgba(200,158,255,0.48)) drop-shadow(0 0 38px rgba(118,54,210,0.28))',
          willChange: reduced ? 'auto' : 'transform',
        }}
        initial={false}
        animate={reduced ? undefined : {
          y: [0, -11, 0],
          rotate: [-0.65, 0.65, -0.65],
          scale: [0.99, 1.015, 0.99],
        }}
        transition={reduced ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};
