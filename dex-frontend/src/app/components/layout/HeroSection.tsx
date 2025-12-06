'use client';

import { useEffect, useRef, useState } from 'react';

interface HeroSectionProps {
  onEnterApp: () => void;
}

export function HeroSection({ onEnterApp }: HeroSectionProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTitleHovered, setIsTitleHovered] = useState(false);

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (window.innerWidth / 2 - e.pageX) / 50;
      const y = (window.innerHeight / 2 - e.pageY) / 50;
      setMousePosition({ x, y });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      className="section-hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        padding: '2rem',
      }}
    >
      {/* Badge */}
      <div
        className="hero-badge"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          letterSpacing: '2px',
          color: 'var(--color-aqua)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          padding: '0.5rem 1.5rem',
          borderRadius: '50px',
          marginBottom: '2rem',
          background: 'rgba(0, 243, 255, 0.05)',
          textTransform: 'uppercase',
          animation: 'pulseBadge 3s infinite',
        }}
      >
        System Online v4.2
      </div>

      {/* Main Title */}
      <h1
        ref={titleRef}
        className="hero-title"
        style={{
          fontSize: 'clamp(4rem, 10vw, 10rem)',
          fontWeight: 700,
          lineHeight: 0.9,
          letterSpacing: '-0.04em',
          marginBottom: '2rem',
          position: 'relative',
          mixBlendMode: 'lighten',
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          transition: 'transform 0.1s ease-out',
          cursor: 'default',
        }}
        onMouseEnter={() => setIsTitleHovered(true)}
        onMouseLeave={() => setIsTitleHovered(false)}
      >
        <span
          style={{
            display: 'inline-block',
            color: 'var(--color-text-main)',
            textShadow: isTitleHovered ? '2px 0 var(--color-neon-primary), -2px 0 var(--color-aqua)' : 'none',
            transition: 'transform 0.1s var(--ease-fluid), text-shadow 0.2s ease',
          }}
        >
          LIQUIDITY
        </span>
        <br />
        <span
          className="neon-text"
          style={{
            display: 'inline-block',
            color: 'var(--color-neon-primary)',
            textShadow: isTitleHovered
              ? '2px 0 var(--color-neon-primary), -2px 0 var(--color-aqua), var(--glow-subtle)'
              : 'var(--glow-subtle)',
            transition: 'transform 0.3s var(--ease-fluid), text-shadow 0.2s ease',
          }}
        >
          DECODED
        </span>
      </h1>

      {/* Subtitle */}
      <p
        className="hero-subtitle"
        style={{
          fontSize: 'clamp(1rem, 2vw, 1.5rem)',
          color: 'var(--color-text-muted)',
          maxWidth: '600px',
          lineHeight: 1.6,
          marginBottom: '3rem',
        }}
      >
        Execute atomic swaps with neural precision. The convergence of autonomous systems and
        decentralized markets.
      </p>

      {/* Enter App Button */}
      <button
        onClick={onEnterApp}
        className="btn-primary"
        style={{
          padding: '1rem 3rem',
          fontSize: '1rem',
          marginBottom: '4rem',
        }}
      >
        ENTER_APP()
      </button>

      {/* Scroll Indicator */}
      

      {/* Decorative grid lines (optional visual enhancement) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          background: `
            linear-gradient(90deg, transparent 0%, transparent 50%, rgba(0, 255, 65, 0.02) 50%, transparent 50.5%),
            linear-gradient(0deg, transparent 0%, transparent 50%, rgba(0, 255, 65, 0.02) 50%, transparent 50.5%)
          `,
          backgroundSize: '100px 100px',
          opacity: 0.5,
        }}
      />
    </section>
  );
}
