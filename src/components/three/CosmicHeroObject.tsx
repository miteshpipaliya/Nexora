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

      {/* Responsive wingspan is intentionally generous. The original transparent
          image contains the delicate halo and orbit details seen in the reference. */}
      <motion.img
        src="/images/intro/NEXORA%20LOGO.png?v=3"
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className="relative z-10 block w-[112%] max-w-none sm:w-[110%] lg:w-[124%] h-auto max-h-[min(82vh,650px)] object-contain select-none"
        style={{
          filter: 'drop-shadow(0 0 12px rgba(166,114,247,0.38)) drop-shadow(0 0 35px rgba(104,43,193,0.25))',
          willChange: reduced ? 'auto' : 'transform',
        }}
        initial={false}
        animate={reduced ? undefined : {
          y: [0, -9, 0],
          rotate: [-0.65, 0.65, -0.65],
          scale: [0.99, 1.015, 0.99],
        }}
        transition={reduced ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};
