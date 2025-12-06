'use client';

import { useEffect, useRef, useState } from 'react';

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const dropsRef = useRef<number[]>([]);
  const columnsRef = useRef<number>(0);
  const [isClient, setIsClient] = useState(false);

  const chars =
    'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fontSize = 14;

  // Ensure we only render on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize drops array
    const initDrops = (cols: number) => {
      const drops: number[] = [];
      for (let i = 0; i < cols; i++) {
        // Stagger the initial positions across the screen
        drops[i] = Math.floor(Math.random() * -50);
      }
      dropsRef.current = drops;
      columnsRef.current = cols;
    };

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Set canvas size to match window
      canvas.width = width;
      canvas.height = height;

      // Fill with initial background
      ctx.fillStyle = '#030405';
      ctx.fillRect(0, 0, width, height);

      // Calculate columns based on font size
      const columns = Math.ceil(width / fontSize) + 1;

      // Only reinitialize if columns changed significantly
      if (Math.abs(columns - columnsRef.current) > 2) {
        initDrops(columns);
      }
    };

    // Draw function
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const drops = dropsRef.current;

      if (drops.length === 0) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Semi-transparent background to create trail effect
      ctx.fillStyle = 'rgba(3, 4, 5, 0.05)';
      ctx.fillRect(0, 0, width, height);

      // Set font
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = chars.charAt(Math.floor(Math.random() * chars.length));

        // Calculate position
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Only draw if on screen or just above
        if (y >= -fontSize && y < height + fontSize) {
          // Occasional bright white character (head of drop)
          if (Math.random() > 0.96) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 15;
          } else {
            // Green with varying intensity
            const intensity = Math.random() > 0.8 ? '00ff41' : '008f11';
            ctx.fillStyle = `#${intensity}`;
            ctx.shadowBlur = 0;
          }

          ctx.fillText(text, x, y);
        }

        // Move drop down
        drops[i]++;

        // Reset drop to top when it reaches bottom
        if (y > height && Math.random() > 0.975) {
          drops[i] = Math.floor(Math.random() * -10);
        }
      }

      // Reset shadow for next frame
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    // Initial setup
    handleResize();
    initDrops(Math.ceil(window.innerWidth / fontSize) + 1);

    // Start animation
    draw();

    // Listen for resize
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isClient]);

  if (!isClient) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        opacity: 0.3,
        pointerEvents: 'none',
      }}
    />
  );
}
