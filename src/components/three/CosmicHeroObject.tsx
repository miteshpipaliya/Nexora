import React from 'react';
import { PHOENIX_CONFIG } from '../../config/phoenixColors';
import { usePhoenixColor } from '../../hooks/usePhoenixColor';
import '../../styles/phoenix.css';

/**
 * 2D NEXORA phoenix, preserving the original transparent asset and layout.
 * Its surrounding illumination changes in one synchronized CSS color state.
 * This branch deliberately does not use WebGL or a 3D model.
 */
export const CosmicHeroObject: React.FC = () => {
  const { colors, colorName, reducedMotion } = usePhoenixColor();

  const style = {
    '--phoenix-primary': colors.primary,
    '--phoenix-secondary': colors.secondary,
    '--phoenix-glow': colors.glow,
    '--phoenix-aura': colors.aura,
    '--phoenix-particle': colors.particle,
    '--phoenix-transition': `${PHOENIX_CONFIG.transitionDuration}ms`,
  } as React.CSSProperties;

  return (
    <div
      className="phoenix-color-scene relative w-full h-full min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px] flex items-center justify-center overflow-visible pointer-events-none"
      style={style}
      role="img"
      aria-label={`NEXORA phoenix with ${colorName} luminous energy`}
      data-phoenix-color={colorName}
    >
      <div className="phoenix-color-aura" aria-hidden="true" />
      <div className="phoenix-color-halo" aria-hidden="true" />

      {PHOENIX_CONFIG.enableOrbitalSync && (
        <>
          <div className="phoenix-color-orbit" aria-hidden="true">
            <span className="phoenix-color-spark" />
          </div>
          <div className="phoenix-color-orbit second" aria-hidden="true">
            <span className="phoenix-color-spark" />
          </div>
        </>
      )}

      {PHOENIX_CONFIG.enableParticleSync && !reducedMotion && [
        [13, 24], [81, 25], [17, 77], [80, 80], [51, 8], [47, 88],
      ].map(([left, top], i) => (
        <span
          key={i}
          className="phoenix-color-dust"
          style={{ left: `${left}%`, top: `${top}%` }}
          aria-hidden="true"
        />
      ))}

      <img
        src="/images/intro/NEXORA%20LOGO.png?v=3"
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className="phoenix-color-image sm:w-[118%] lg:w-[130%]"
      />
    </div>
  );
};
