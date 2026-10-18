import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number; // depth 0.1 to 1.0
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: string;
  vx: number;
  vy: number;
}

export const GlobalGalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Responsive star count
    const isMobile = width < 768;
    const starCount = isMobile ? 140 : 320;

    // Star color palette: silver-white, muted lavender, occasional violet
    const colors = [
      'rgba(248, 250, 252, ', // silver-white
      'rgba(226, 232, 240, ', // cool silver
      'rgba(216, 180, 254, ', // soft lavender
      'rgba(196, 181, 253, ', // muted lavender
      'rgba(167, 139, 250, ', // subtle purple
      'rgba(139, 92, 246, '   // electric violet point
    ];

    const stars: Star[] = [];

    const createStar = (): Star => {
      const z = Math.random() * 0.9 + 0.1;
      const colorIndex = Math.random() > 0.85 
        ? (Math.random() > 0.5 ? 4 : 5) 
        : Math.floor(Math.random() * 4);

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        radius: (Math.random() * 1.1 + 0.4) * z,
        baseAlpha: Math.random() * 0.5 + 0.25,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: colors[colorIndex],
        vx: (Math.random() - 0.5) * 0.08 * z,
        vy: (Math.random() - 0.5) * 0.06 * z
      };
    };

    for (let i = 0; i < starCount; i++) {
      stars.push(createStar());
    }

    // Parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 35;
      targetMouseY = (e.clientY / height - 0.5) * 35;
    };

    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Visibility change handler to pause animation when hidden
    let isPageVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Animation Loop
    let lastTime = performance.now();
    let tick = 0;

    const render = (currentTime: number) => {
      animId = requestAnimationFrame(render);

      if (!isPageVisible) return;

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      tick += prefersReducedMotion ? 0 : 0.015;

      // Smooth mouse parallax
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // 1. Draw near-black deep space background #08080D
      ctx.fillStyle = '#08080D';
      ctx.fillRect(0, 0, width, height);

      // 2. Faint purple nebula gradients
      // Top-right subtle nebula
      const grad1 = ctx.createRadialGradient(
        width * 0.8 + mouseX * 0.3,
        height * 0.25 + mouseY * 0.3,
        10,
        width * 0.8,
        height * 0.25,
        width * 0.55
      );
      grad1.addColorStop(0, 'rgba(59, 19, 99, 0.14)');
      grad1.addColorStop(0.5, 'rgba(30, 11, 56, 0.07)');
      grad1.addColorStop(1, 'rgba(8, 8, 13, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Bottom-left subtle nebula
      const grad2 = ctx.createRadialGradient(
        width * 0.15 - mouseX * 0.2,
        height * 0.75 - mouseY * 0.2,
        10,
        width * 0.15,
        height * 0.75,
        width * 0.5
      );
      grad2.addColorStop(0, 'rgba(43, 14, 76, 0.11)');
      grad2.addColorStop(0.6, 'rgba(20, 8, 38, 0.05)');
      grad2.addColorStop(1, 'rgba(8, 8, 13, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 3. Render stars with depth, twinkle, and gentle drift
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        if (!prefersReducedMotion) {
          star.x += star.vx;
          star.y += star.vy;

          // Wrap edges
          if (star.x < 0) star.x = width;
          if (star.x > width) star.x = 0;
          if (star.y < 0) star.y = height;
          if (star.y > height) star.y = 0;
        }

        // Twinkle calculation
        const twinkle = Math.sin(tick * 2 + star.twinkleOffset) * 0.35;
        const currentAlpha = Math.max(0.08, Math.min(0.95, star.baseAlpha + twinkle));

        // Parallax position
        const px = star.x + mouseX * star.z;
        const py = star.y + mouseY * star.z;

        // Draw star
        ctx.beginPath();
        ctx.arc(px, py, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${currentAlpha})`;
        ctx.fill();

        // Extra soft glow for brighter, larger foreground stars
        if (star.z > 0.75 && star.radius > 0.9) {
          ctx.beginPath();
          ctx.arc(px, py, star.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${star.color}${(currentAlpha * 0.22).toFixed(3)})`;
          ctx.fill();
        }
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ background: '#08080D' }}
      />
    </div>
  );
};
