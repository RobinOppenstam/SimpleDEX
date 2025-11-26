'use client';

import { useEffect, useRef, useCallback } from 'react';

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<number[]>([]);
  const animationRef = useRef<number>();

  const chars =
    'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fontSize = 14;

  const initDrops = useCallback((columns: number) => {
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -50);
    }
    dropsRef.current = drops;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Set display size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Set actual size in memory (scaled for retina)
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Scale context to match
      ctx.scale(dpr, dpr);

      // Recalculate columns and reinitialize drops
      const columns = Math.floor(width / fontSize);
      initDrops(columns);
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const drops = dropsRef.current;

      // Semi-transparent black to create trail effect
      ctx.fillStyle = 'rgba(3, 4, 5, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = chars.charAt(Math.floor(Math.random() * chars.length));

        // Occasional bright character, otherwise dim green
        ctx.fillStyle = Math.random() > 0.95 ? '#e0e6ed' : '#008f11';

        // Draw the character
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(text, x, y);

        // Reset drop to top when it reaches bottom (with some randomness)
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Initial setup
    resize();

    // Start animation
    draw();

    // Handle window resize
    window.addEventListener('resize', resize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initDrops]);

  return (
    <canvas
      ref={canvasRef}
      id="matrix-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
        opacity: 0.25,
        pointerEvents: 'none',
      }}
    />
  );
}
