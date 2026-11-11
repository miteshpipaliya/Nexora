import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from './IntroSoundController';

interface IntroAnimationProps {
  autoPlay?: boolean;
  skipVisible?: boolean;
  onComplete?: () => void;
}


/** Cinematic fog keyframes defined in index.css @keyframes */

export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  autoPlay = true,
  skipVisible = true,
  onComplete,
}) => {
  // ... (complete implementation)
};
const MAIN_LOGO = '/images/intro/NEXORA%20LOGO.png';
const TEXT_LOGO = '/images/intro/nexora-bvm-text-logo.png';

/**
 * Cinematic NEXORA intro animation.
* Fixed overlay above the always-mounted <App />.
 
 * Timeline:
 * Phase A: 0-3.8s - Both logos, atmospheric glow, particles, sync with sound
 * Phase B: 3.8-5.0s - Cinematic fog zoom
 * Phase C: 5.0-6.2s - Homepage reveal, smooth opacity transition
 * onComplete fires exactly once (after the fade-out, or via Skip).
 */
 
