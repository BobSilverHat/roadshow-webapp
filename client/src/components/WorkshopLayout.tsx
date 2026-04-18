/**
 * WorkshopLayout — shared shell for all workshop chapter pages
 * Design: Cyber-Noir / Dark Ops Terminal
 * - Fixed navbar with Salt logo + Agentic Workshop badge
 * - Fixed left sidebar with nav dots
 * - Scrollable main content area
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

const SALT_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485309764/9Qvd9Kw2BJuzG4W4rxnhxw/salt-logo_4799bb3b.png";
const HERO_BG_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485309764/9Qvd9Kw2BJuzG4W4rxnhxw/salt-hero-bg-Q9jC9KFBXthSKQDzj2U5Kb.webp";

const NAV_ITEMS = [
  { id: 'introduction', label: 'Introduction', path: '/' },
  { id: 'scenario-1', label: 'Scenario 1', path: '/scenario/1' },
  { id: 'scenario-2', label: 'Scenario 2', path: '/scenario/2' },
  { id: 'scenario-3', label: 'Scenario 3', path: '/scenario/3' },
  { id: 'completed', label: 'Completed!', path: '/completed' },
];

interface WorkshopLayoutProps {
  children: React.ReactNode;
  activeId: string;
}

export default function WorkshopLayout({ children, activeId }: WorkshopLayoutProps) {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        backgroundImage: `url(${HERO_BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
      }}
    >
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Dark gradient overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.75) 40%, rgba(10,10,15,0.92) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ============================================================
          TOP NAVBAR
          ============================================================ */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.04)',
          backgroundColor: scrolled ? 'rgba(10,10,15,0.92)' : 'rgba(10,10,15,0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            src={SALT_LOGO_URL}
            alt="Salt Security"
            style={{
              height: '36px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'invert(1) hue-rotate(180deg) brightness(1.1)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          />
          <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
          {/* Workshop badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.75rem',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: '4px',
              backgroundColor: 'rgba(139,92,246,0.08)',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'white',
                fontWeight: '700',
              }}
            >
              S
            </div>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '0.75rem',
                fontWeight: '600',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(200,180,255,0.9)',
              }}
            >
              Agentic Workshop
            </span>
          </div>
        </div>

        {/* Right: Workshop title */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              marginBottom: '2px',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'oklch(0.65 0.25 290)',
                boxShadow: '0 0 6px oklch(0.65 0.25 290)',
              }}
            />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '0.65rem',
                fontWeight: '600',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'oklch(0.65 0.25 290)',
              }}
            >
              Workshop
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '1.05rem',
              fontWeight: '600',
              letterSpacing: '0.04em',
              color: 'rgba(232,232,240,0.95)',
            }}
          >
            Agentic AI Security
          </div>
        </div>
      </header>

      {/* ============================================================
          FIXED LEFT SIDEBAR
          ============================================================ */}
      <aside
        style={{
          position: 'fixed',
          top: '70px',
          left: 0,
          bottom: 0,
          width: '200px',
          zIndex: 40,
          padding: '2rem 1.5rem',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Console Access label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '2rem',
          }}
        >
          <span style={{ color: 'oklch(0.65 0.25 290)', fontSize: '0.55rem' }}>◆</span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.7rem',
              fontWeight: '700',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(200,200,220,0.8)',
            }}
          >
            Console Access
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  padding: '0.35rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.875rem',
                  color: isActive ? 'rgba(232,232,240,0.95)' : 'rgba(150,150,170,0.65)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(232,232,240,0.85)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(150,150,170,0.65)';
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? 'oklch(0.65 0.25 290)' : 'rgba(150,150,170,0.4)',
                    flexShrink: 0,
                    transition: 'background-color 0.2s',
                    boxShadow: isActive ? '0 0 6px oklch(0.65 0.25 290 / 0.6)' : 'none',
                  }}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ============================================================
          MAIN CONTENT
          ============================================================ */}
      <main
        style={{
          marginLeft: '200px',
          paddingTop: '70px',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {children}
      </main>
    </div>
  );
}
