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
    const starCount = isMobile ? 170 : 400;

    // Warm, tiny ember stars against charcoal/navy space — no violet wash.
    const colors = [
      'rgba(240, 177, 103, ',
      'rgba(204, 112, 57, ',
      'rgba(156, 73, 43, ',
      'rgba(254, 209, 147, ',
      'rgba(116, 139, 153, ',
      'rgba(228, 129, 66, '
    ];

    const stars: Star[] = [];

    const createStar = (): Star => {
      const z = Math.random() * 0.9 + 0.1;
      const colorIndex = Math.floor(Math.random() * colors.length);

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        radius: (Math.random() * 1.15 + 0.25) * z,
        baseAlpha: Math.random() * 0.45 + 0.22,
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
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, width, height);

      // 2. Diffuse midnight-blue haze; black edges and no purple tint.
      const center = ctx.createRadialGradient(
        width * 0.52 + mouseX * 0.15,
        height * 0.43 + mouseY * 0.15,
        0,
        width * 0.52,
        height * 0.43,
        Math.max(width * 0.69, height * 0.74)
      );
      center.addColorStop(0, 'rgba(11, 34, 59, 0.62)');
      center.addColorStop(0.42, 'rgba(5, 20, 37, 0.4)');
      center.addColorStop(1, 'rgba(2, 4, 8, 0)');
      ctx.fillStyle = center;
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
        style={{ background: '#020408' }}
      />
    </div>
  );
};
