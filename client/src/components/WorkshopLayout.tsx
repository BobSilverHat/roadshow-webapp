/**
 * WorkshopLayout — shared shell for all workshop chapter pages
 * Design: Cyber-Noir / Dark Ops Terminal
 * - Fixed navbar with Salt × Guidepoint co-brand
 * - Fixed left sidebar with nav dots
 * - Scrollable main content area
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';

const SALT_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485309764/9Qvd9Kw2BJuzG4W4rxnhxw/salt-logo_4799bb3b.png";
const GUIDEPOINT_LOGO_URL = "/guidepoint-logo.png";
const HERO_BG_VIDEO_URL = "/shader-bg.webm";

interface SubItem {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  subItems?: SubItem[];
}

const SCENARIO_SUB_ITEMS: SubItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'step-01', label: 'Step / 01' },
  { id: 'step-02', label: 'Step / 02' },
  { id: 'step-03', label: 'Step / 03' },
  { id: 'step-04', label: 'Step / 04' },
  { id: 'step-05', label: 'Step / 05' },
  { id: 'summary', label: 'Summary' },
];

const NAV_ITEMS: NavItem[] = [
  { id: 'introduction', label: 'Introduction', path: '/' },
  { id: 'scenario-1', label: 'Scenario 1', path: '/scenario/1', subItems: SCENARIO_SUB_ITEMS },
  { id: 'scenario-2', label: 'Scenario 2', path: '/scenario/2', subItems: SCENARIO_SUB_ITEMS },
  { id: 'scenario-3', label: 'Scenario 3', path: '/scenario/3', subItems: SCENARIO_SUB_ITEMS },
  { id: 'completed', label: 'Completed!', path: '/completed' },
];

interface WorkshopLayoutProps {
  children: React.ReactNode;
  activeId: string;
}

export default function WorkshopLayout({ children, activeId }: WorkshopLayoutProps) {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // The sidebar's right edge snaps to the horizontal center of the "×"
  // between the Salt and Guidepoint logos, so the sidebar column lines up
  // vertically with the X-mark in the navbar. Measured from the live DOM
  // because both logos have `width: auto` and load asynchronously.
  const xRef = useRef<HTMLSpanElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(200);

  // Scroll-spy — tracks which step section (overview / step-0X / summary) is
  // currently in view so the sidebar can highlight the active sub-item while
  // the user scrolls through a scenario page.
  const [activeStepId, setActiveStepId] = useState<string>('overview');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Scroll-spy: find the step section whose top has crossed just above the
  // navbar (offsetTop - 120px buffer). Re-registers when the active page
  // changes because each scenario page renders its own set of sections.
  useEffect(() => {
    setActiveStepId('overview');
    const compute = () => {
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>('[data-step-id]')
      );
      if (sections.length === 0) return;
      const scrollY = window.scrollY;
      const threshold = 120;
      let currentId = sections[0].getAttribute('data-step-id') || 'overview';
      for (const section of sections) {
        if (section.offsetTop - threshold <= scrollY) {
          currentId = section.getAttribute('data-step-id') || currentId;
        } else {
          break;
        }
      }
      setActiveStepId(currentId);
    };
    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [activeId]);

  // Clicking a sub-item in the sidebar smooth-scrolls to the matching section.
  const handleSubItemClick = (subId: string) => {
    const el = document.getElementById(subId);
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
  };

  useLayoutEffect(() => {
    const measure = () => {
      const el = xRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSidebarWidth(Math.round(rect.left + rect.width / 2));
    };
    measure();
    window.addEventListener('resize', measure);
    // Re-measure once the logo images have loaded — their `width: auto` means
    // the ×'s x-position shifts between initial render and image load.
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('header img'));
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', measure, { once: true });
    });
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        position: 'relative',
        // Exposed so descendants (e.g. ZoomableImage's fixed backdrop) can
        // inset to the main-content area and avoid overlapping the fixed
        // sidebar/navbar. React strict typing doesn't model custom
        // properties on `CSSProperties`, hence the cast.
        ['--sidebar-width' as string]: `${sidebarWidth}px`,
        ['--navbar-height' as string]: '70px',
      } as React.CSSProperties}
    >
      {/* Background shader video — fixed, behind all content */}
      <video
        src={HERO_BG_VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Purple tint — shifts the blue shader highlights in the bottom-left
          toward violet. `mix-blend-mode: color` preserves luminance so blacks
          stay black; only chromatic pixels pick up the purple hue. */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 15% 90%, rgba(139,92,246,0.85) 0%, rgba(124,58,237,0.55) 35%, rgba(124,58,237,0.15) 65%, transparent 90%)',
          mixBlendMode: 'color',
        }}
      />

      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Dark gradient overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,10,15,0.68) 0%, rgba(10,10,15,0.78) 40%, rgba(10,10,15,0.92) 100%)',
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
        {/* Left: Co-brand — Salt × Guidepoint */}
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
          <span
            ref={xRef}
            aria-hidden="true"
            style={{
              fontFamily: "'Casta', 'Barlow Condensed', serif",
              fontSize: '1.25rem',
              fontWeight: '300',
              color: 'rgba(200,180,255,0.55)',
              letterSpacing: '0',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            ×
          </span>
          <img
            src={GUIDEPOINT_LOGO_URL}
            alt="Guidepoint Security"
            style={{
              height: '36px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'invert(1) hue-rotate(180deg) brightness(1.1)',
            }}
          />
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
                fontFamily: "'Casta', 'Barlow Condensed', serif",
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
              fontFamily: "'Casta', 'Barlow Condensed', serif",
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
          width: `${sidebarWidth}px`,
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
              fontFamily: "'Casta', 'Barlow Condensed', serif",
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
              <div key={item.id}>
                <button
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
                    width: '100%',
                    fontFamily: "'Casta', 'Barlow Condensed', serif",
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

                {/* Sub-items — render only for the currently active scenario.
                    Scroll-spy highlights whichever sub-section is in view. */}
                {isActive && item.subItems && (
                  <div
                    style={{
                      marginLeft: '0.85rem',
                      paddingLeft: '0.9rem',
                      marginTop: '0.2rem',
                      marginBottom: '0.5rem',
                      borderLeft: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {item.subItems.map((sub) => {
                      const isSubActive = sub.id === activeStepId;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubItemClick(sub.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            padding: '0.22rem 0',
                            cursor: 'pointer',
                            fontFamily: "'Casta', 'Barlow Condensed', serif",
                            fontSize: '0.78rem',
                            letterSpacing: '0.01em',
                            color: isSubActive ? 'rgba(232,232,240,0.95)' : 'rgba(130,130,150,0.45)',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,200,220,0.75)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(130,130,150,0.45)';
                          }}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ============================================================
          MAIN CONTENT
          ============================================================ */}
      <main
        style={{
          marginLeft: `${sidebarWidth}px`,
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
