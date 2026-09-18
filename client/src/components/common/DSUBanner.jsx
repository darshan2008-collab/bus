import React from 'react';

export default function DSUBanner({ className = '', style = {} }) {
  return (
    <div
      className={`dsu-institutional-banner ${className}`}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        padding: '12px 14px',
        backgroundColor: 'rgba(7, 23, 57, 0.6)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(251, 191, 36, 0.35)',
        borderBottom: '1px solid rgba(251, 191, 36, 0.35)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        ...style
      }}
    >
      {/* Official Golden Founder Seal */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <img
          src="/dsu_seal.png"
          alt="Dhanalakshmi Srinivasan University Seal"
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            objectFit: 'cover',
            clipPath: 'circle(47% at 50% 49%)',
            filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6))'
          }}
        />
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 800,
            color: '#facc15',
            letterSpacing: '0.06em',
            marginTop: '4px',
            textTransform: 'uppercase'
          }}
        >
          Learn to create
        </span>
      </div>

      {/* University Official Title & Perambalur Campus Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 900,
            letterSpacing: '0.04em',
            color: '#facc15',
            lineHeight: 1.15,
            fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.6)'
          }}
        >
          DHANALAKSHMI SRINIVASAN
        </div>
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: '#ffffff',
            lineHeight: 1.15,
            fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)'
          }}
        >
          UNIVERSITY
        </div>
        <div
          style={{
            fontSize: '9.5px',
            color: '#93c5fd',
            fontWeight: 500,
            lineHeight: 1.25,
            marginTop: '2px'
          }}
        >
          (Established Under The Tamil Nadu Private Universities Act, 2019)
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#fde047',
            fontWeight: 700,
            letterSpacing: '0.03em',
            marginTop: '1px'
          }}
        >
          Perambalur &ndash; 621 212. Tamil Nadu, India
        </div>
      </div>
    </div>
  );
}
