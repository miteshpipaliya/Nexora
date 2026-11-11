import React, { useEffect, useRef } from 'react';

/**
 * Intro Sound Controller
 * Original technology-inspired sound effects using Web Audio API
 */

export const useSound = () => {
  const audioContext = useRef<AudioContext | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const initAudio = () => {
    if (audioContext.current) return;
    try {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode.current = audioContext.current.createGain();
      gain.connect(gainNode.current ?? audioContext.current.destination);
      gainNode.current.gain.value = 0.1;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  };

  useEffect(() => {
    initAudio();
    const handleUserInteraction = () => {
      if (audioContext.current?.state === 'suspended') {
        audioContext.current.resume();
      }
      document.removeEventListener('click', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);
    return () => document.removeEventListener('click', handleUserInteraction);
  }, []);

  const playSound = (type: 'whoosh' | 'impact' | 'atmospheric' | 'cinematic') => {
    if (!audioContext.current) return;
    
    const oscillator = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    gain.connect(gainNode.current ?? audioContext.current.destination);
    gain.gain.value = 0.1;

    switch (type) {
      case 'whoosh':
        oscillator.frequency.value = 200;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioContext.current.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.current.currentTime + 0.3);
        break;
      case 'impact':
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        break;
      case 'atmospheric':
        oscillator.frequency.value = 110;
        oscillator.type = 'sine';
        break;
      case 'cinematic':
        oscillator.frequency.value = 150;
        oscillator.type = 'sine';
        break;
    }

    oscillator.connect(gain);
    oscillator.start();
    oscillator.stop(audioContext.current.currentTime + 0.5);
  };

  const stopAll = () => {
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    if (gainNode.current) {
      gainNode.current.disconnect();
    }
  };

  return { playSound, stopAll };
};