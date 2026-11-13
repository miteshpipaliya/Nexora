/**
 * Central color definitions for the 2D phoenix hero only.
 * The underlying NEXORA logo PNG is never recolored or replaced.
 */
export const PHOENIX_CONFIG = {
  transitionDuration: 1500,
  colorInterval: 7000,
  initialColor: 'violet',
  enableAutoColor: true,
  enableGlowPulse: true,
  enableParticleSync: true,
  enableOrbitalSync: true,
  respectReducedMotion: true,
} as const;

export const PHOENIX_COLORS = {
  violet: {
    primary: '#A855F7',
    secondary: '#D8B4FE',
    glow: '#9333EA',
    aura: 'rgba(168, 85, 247, 0.30)',
    particle: '#C084FC',
  },
  blue: {
    primary: '#38BDF8',
    secondary: '#BAE6FD',
    glow: '#0284C7',
    aura: 'rgba(56, 189, 248, 0.30)',
    particle: '#7DD3FC',
  },
  magenta: {
    primary: '#EC4899',
    secondary: '#FBCFE8',
    glow: '#DB2777',
    aura: 'rgba(236, 72, 153, 0.30)',
    particle: '#F9A8D4',
  },
  gold: {
    primary: '#FBBF24',
    secondary: '#FEF3C7',
    glow: '#D97706',
    aura: 'rgba(251, 191, 36, 0.30)',
    particle: '#FDE68A',
  },
} as const;

export type PhoenixColor = keyof typeof PHOENIX_COLORS;
export const COLOR_SEQUENCE: readonly PhoenixColor[] = ['violet', 'blue', 'magenta', 'gold'];
