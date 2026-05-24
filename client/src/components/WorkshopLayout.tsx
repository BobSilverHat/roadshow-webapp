/**
 * WorkshopLayout — shared shell for all workshop chapter pages
 * Design: Cyber-Noir / Dark Ops Terminal
 * - Fixed navbar with Salt logo
 * - Fixed left sidebar with nav dots
 * - Scrollable main content area
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useTheme } from 'next-themes';
import ThemeToggle from '@/components/ThemeToggle';
import { useWorkshopClock } from '@/hooks/useWorkshopClock';

const SALT_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485309764/9Qvd9Kw2BJuzG4W4rxnhxw/salt-logo_4799bb3b.png";
const HERO_BG_VIDEO_URL = "/shader-bg.webm";

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Live countdown row anchored at the bottom of the sidebar. Single line:
 *   ● IN PROGRESS · 34:12
 *
 * - Green pulsing dot + "IN PROGRESS" in pale neon green (matches the
 *   WaitingOverlay accent), same 2.4s pulse cadence.
 * - "MM:SS" glowing white, same 2.4s rhythm via textShadow oscillation.
 * - Hidden when the gate is closed or the workshop has expired.
 */
function WorkshopClockPill() {
  const clock = useWorkshopClock();
  if (clock.status === 'closed') return null;

  const isExpired = clock.status === 'expired';

  // Shared row chrome (border, layout). Content differs by state.
  // Bottom positioning is handled by the Salt Access label's marginTop:auto
  // in WorkshopLayout — this pill renders flush against it.
  const rowStyle = {
    paddingTop: '1.25rem',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    whiteSpace: 'nowrap',
  } as const;

  if (isExpired) {
    // Final state: static red. No pulse — the workshop is over.
    return (
      <div style={rowStyle}>
        <div
          style={{
            flex: '0 0 auto',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'oklch(0.7 0.2 25)',
            boxShadow: '0 0 8px oklch(0.5 0.2 25 / 0.55)',
          }}
        />
        <span
          style={{
            fontFamily: "'Casta', 'Barlow Condensed', serif",
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'oklch(0.78 0.22 25)',
            textShadow: '0 0 10px oklch(0.5 0.2 25 / 0.5)',
          }}
        >
          Complete
        </span>
        <span
          style={{
            color: 'rgba(200,200,220,0.35)',
            fontSize: '0.62rem',
          }}
          aria-hidden="true"
        >
          ·
        </span>
        <span
          style={{
            fontFamily: "'Casta', 'Barlow Condensed', serif",
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'rgba(245,245,250,0.97)',
            textShadow: '0 0 8px rgba(255,255,255,0.35)',
            fontVariantNumeric: 'tabular-nums',
            marginLeft: 'auto',
          }}
        >
          00:00
        </span>
      </div>
    );
  }

  // In-progress state: pulsing green + glowing white timer.
  return (
    <div style={rowStyle}>
      <motion.div
        animate={{
          opacity: [0.55, 1, 0.55],
          boxShadow: [
            '0 0 4px oklch(0.6 0.25 145 / 0.4)',
            '0 0 10px oklch(0.65 0.28 145 / 0.85)',
            '0 0 4px oklch(0.6 0.25 145 / 0.4)',
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          flex: '0 0 auto',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'oklch(0.78 0.18 145)',
        }}
      />
      <motion.span
        animate={{
          opacity: [0.7, 1, 0.7],
          textShadow: [
            '0 0 6px oklch(0.6 0.25 145 / 0.35)',
            '0 0 16px oklch(0.65 0.28 145 / 0.7)',
            '0 0 6px oklch(0.6 0.25 145 / 0.35)',
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontFamily: "'Casta', 'Barlow Condensed', serif",
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'oklch(0.88 0.2 145)',
        }}
      >
        In Progress
      </motion.span>
      <span
        style={{
          color: 'rgba(200,200,220,0.35)',
          fontSize: '0.62rem',
        }}
        aria-hidden="true"
      >
        ·
      </span>
      <motion.span
        animate={{
          textShadow: [
            '0 0 5px rgba(255,255,255,0.25)',
            '0 0 14px rgba(255,255,255,0.6)',
            '0 0 5px rgba(255,255,255,0.25)',
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontFamily: "'Casta', 'Barlow Condensed', serif",
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: 'rgba(245,245,250,0.97)',
          fontVariantNumeric: 'tabular-nums',
          marginLeft: 'auto',
        }}
      >
        {formatRemaining(clock.remainingMs)}
      </motion.span>
    </div>
  );
}

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
  { id: 'challenge-1', label: 'Challenge 1', path: '/challenge/1' },
  { id: 'challenge-2', label: 'Challenge 2', path: '/challenge/2' },
  { id: 'salt-nexus', label: 'Salt Nexus', path: '/salt-nexus' },
  { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard' },
  { id: 'completed', label: 'Completed!', path: '/completed' },
];

interface WorkshopLayoutProps {
  children: React.ReactNode;
  activeId: string;
}

export default function WorkshopLayout({ children, activeId }: WorkshopLayoutProps) {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  // The sidebar's right edge aligns just past the Salt logo's right edge,
  // so the sidebar column lines up vertically with the navbar branding.
  // Measured from the live DOM because the logo has `width: auto` and
  // loads asynchronously.
  const saltLogoRef = useRef<HTMLImageElement>(null);
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
      const el = saltLogoRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSidebarWidth(Math.round(rect.right + 24));
    };
    measure();
    window.addEventListener('resize', measure);
    // Re-measure once the logo image has loaded — its `width: auto` means
    // its right edge shifts between initial render and image load.
    const img = saltLogoRef.current;
    if (img && !img.complete) img.addEventListener('load', measure, { once: true });
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        position: 'relative',
        // Exposed so descendants (e.g. ZoomableImage's fixed backdrop) can
        // inset to the main-content area and avoid overlapping the fixed
        // sidebar/navbar. React strict typing doesn't model custom
        // properties on `CSSProperties`, hence the cast.
        ['--sidebar-width' as string]: `${sidebarWidth}px`,
        ['--navbar-height' as string]: '70px',
      } as React.CSSProperties}
    >
      {/* Background shader video — fixed, behind all content. Renders in
          BOTH themes; light mode adds a high-opacity white wash on top so
          the shader motion ghosts through faintly without the dark
          obsidian feel. */}
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
      {!isDark && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            background:
              'linear-gradient(to bottom, oklch(0.97 0.005 285 / 0.99) 0%, oklch(0.97 0.005 285 / 0.99) 70px, oklch(0.97 0.005 285 / 0.78) 100%)',
          }}
        />
      )}

      {/* Purple tint — shifts the blue shader highlights in the bottom-left
          toward violet. `mix-blend-mode: color` preserves luminance so blacks
          stay black; only chromatic pixels pick up the purple hue. */}
      {isDark && (
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
      )}

      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Dark gradient overlay */}
      {isDark && (
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
      )}

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
          borderBottom: '1px solid var(--border)',
          backgroundColor: isDark
            ? (scrolled
                ? 'oklch(from var(--background) l c h / 0.92)'
                : 'oklch(from var(--background) l c h / 0.75)')
            // Light: match the TOP of the wash gradient (0.96 alpha) so
            // the navbar looks like a seamless continuation of the page
            // surface rather than a separate strip — but still opaque
            // enough to block scrolled content from bleeding through.
            // Bump a touch when scrolled for extra safety.
            : (scrolled
                ? 'oklch(from var(--background) l c h / 0.99)'
                : 'oklch(from var(--background) l c h / 0.96)'),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Left: Salt brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            ref={saltLogoRef}
            src={SALT_LOGO_URL}
            alt="Salt Security"
            style={{
              height: '36px',
              width: 'auto',
              objectFit: 'contain',
              filter: isDark ? 'brightness(0) invert(1)' : 'brightness(0)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          />
        </div>

        {/* Right: theme toggle (Workshop title moved into the sidebar) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <ThemeToggle />
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
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
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
                    padding: '0.4rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    cursor: 'pointer',
                    width: '100%',
                    fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.04em',
                    color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? 'var(--color-accent-text)' : 'var(--muted-foreground)',
                      flexShrink: 0,
                      transition: 'background-color 0.2s',
                      boxShadow: isActive ? '0 0 6px oklch(from var(--color-accent-text) l c h / 0.6)' : 'none',
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
                      borderLeft: '1px solid var(--border)',
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
                            padding: '0.24rem 0',
                            cursor: 'pointer',
                            fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                            fontSize: '0.78rem',
                            fontWeight: isSubActive ? 500 : 400,
                            letterSpacing: '0.01em',
                            color: isSubActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
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

        {/* Workshop branding — moved here from the navbar's right cluster.
            Docks to the bottom of the sidebar, sitting directly above the
            WorkshopClockPill so the pill's borderTop doubles as the visual
            divider. Same two-line shape (Workshop label + title heading)
            as the original, just left-aligned for the sidebar context. */}
        <div
          style={{
            marginTop: 'auto',
            marginBottom: '0.85rem',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '2px',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-accent-text)',
                boxShadow: '0 0 6px var(--color-accent-text)',
              }}
            />
            <span
              style={{
                fontFamily: "'Casta', 'Barlow Condensed', serif",
                fontSize: '0.65rem',
                fontWeight: '600',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-text)',
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
              color: 'var(--foreground)',
            }}
          >
            Agentic AI Security
          </div>
        </div>

        {/* Live workshop countdown — pinned to the bottom under Salt Access. */}
        <WorkshopClockPill />
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
