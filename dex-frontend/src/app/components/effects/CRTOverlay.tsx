'use client';

export function CRTOverlay() {
  return (
    <>
      {/* CRT Scanlines */}
      <div
        className="crt-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 9999,
          pointerEvents: 'none',
          background: `
            linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%),
            linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))
          `,
          backgroundSize: '100% 3px, 3px 100%',
          opacity: 0.6,
        }}
      />

      {/* Vignette Effect */}
      <div
        className="vignette"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
          pointerEvents: 'none',
          background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.8) 100%)',
        }}
      />
    </>
  );
}
