/**
 * MagicRingsButton
 * A clean circle arrow button surrounded by the Magic Rings WebGL animation.
 * Used at the bottom of each workshop chapter to navigate to the next page.
 *
 * Design: Cyber-Noir / Dark Ops Terminal
 * - Circle button: thin border, arrow icon, white on dark
 * - Magic Rings: purple (#8B5CF6) → violet (#6D28D9), centered behind button
 * - Label text below: "Begin" on intro, "Next" on all others
 */
import { useState } from 'react';
import MagicRings from './MagicRings';

interface MagicRingsButtonProps {
  label?: string;
  onClick?: () => void;
}

export default function MagicRingsButton({ label = 'Next', onClick }: MagicRingsButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        userSelect: 'none',
      }}
    >
      {/* Magic Rings + Button container */}
      <div
        style={{
          position: 'relative',
          width: '180px',
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Ambient purple glow behind the rings — replaces the luminance lost
            to the shader mask, so the element reads as a genuine light source
            rather than a faded circle. Intensifies on hover. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: hovered
              ? 'radial-gradient(circle closest-side at center, rgba(139,92,246,0.55) 0%, rgba(124,58,237,0.3) 35%, rgba(76,29,149,0.12) 60%, transparent 90%)'
              : 'radial-gradient(circle closest-side at center, rgba(139,92,246,0.4) 0%, rgba(124,58,237,0.22) 35%, rgba(76,29,149,0.08) 60%, transparent 90%)',
            filter: 'blur(4px)',
            transition: 'background 0.3s ease',
          }}
        />

        {/* Magic Rings canvas — fills the container, centered behind button.
            Uses `closest-side` so the radial mask's 100% stop lands at the
            midpoint of each square edge, not the corners. This guarantees the
            mask reaches full transparency before hitting any side of the
            canvas — no visible rectangular cutoff in any direction. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            maskImage:
              'radial-gradient(circle closest-side at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage:
              'radial-gradient(circle closest-side at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
          }}
        >
          <MagicRings
            color="#8B5CF6"
            colorTwo="#C4B5FD"
            ringCount={5}
            speed={0.85}
            attenuation={10}
            lineThickness={3}
            baseRadius={0.3}
            radiusStep={0.09}
            scaleRate={0.12}
            opacity={hovered ? 1.15 : 1}
            noiseAmount={0.05}
            ringGap={1.6}
            fadeIn={0.6}
            fadeOut={0.55}
            hoverScale={1.15}
            parallax={0.03}
            blur={0}
            clickBurst={true}
          />
        </div>

        {/* Circle arrow button */}
        <button
          style={{
            position: 'relative',
            zIndex: 10,
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: `1.5px solid ${hovered ? 'rgba(167,139,250,0.9)' : 'rgba(167,139,250,0.45)'}`,
            backgroundColor: hovered ? 'rgba(124,58,237,0.18)' : 'rgba(10,10,15,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(4px)',
            boxShadow: hovered
              ? '0 0 24px rgba(124,58,237,0.4), inset 0 0 12px rgba(124,58,237,0.1)'
              : '0 0 12px rgba(124,58,237,0.15)',
          }}
        >
          {/* Arrow right SVG */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={hovered ? 'rgba(196,181,253,1)' : 'rgba(196,181,253,0.7)'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'all 0.3s ease',
              transform: hovered ? 'translateX(2px)' : 'translateX(0)',
            }}
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {/* Label */}
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '0.75rem',
          fontWeight: '600',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: hovered ? 'rgba(196,181,253,0.9)' : 'rgba(150,130,200,0.65)',
          transition: 'color 0.3s ease',
          marginTop: '-0.5rem',
        }}
      >
        {label}
      </span>
    </div>
  );
}
