/**
 * WorkshopLayout — shared shell for all workshop chapter pages
 * Design: Cyber-Noir / Dark Ops Terminal
 * - Fixed navbar with Salt logo
 * - Fixed left sidebar with nav dots
 * - Scrollable main content area
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import i18n from '@/i18n';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import AdminLink from '@/components/AdminLink';
import { useWorkshopClock } from '@/hooks/useWorkshopClock';

// Imported (not referenced from /public) so Vite content-hashes it into
// /assets/. That makes the URL change whenever the bytes change, so a
// re-export can never be masked by a cached copy — the failure mode that hid
// the corrected padding behind an immutable cache entry.
//
// Previously loaded from a Manus scaffold CDN
// (d2xsxph8kpxj0f.cloudfront.net), whose S3 origin began returning
// AccessDenied — which took the sidebar with it, since the sidebar width is
// measured from this element.
//
// Source: Salt Security Design System, assets/logos/salt-logo-black.png,
// padded to reproduce the original asset's built-in margin (ink renders 32px
// inside the 36px box). The navbar filter recolors it per theme.
import saltLogoUrl from '@/assets/salt-logo.png';

const SALT_LOGO_URL = saltLogoUrl;

// Width the sidebar renders at before (or without) a successful logo measure.
const DEFAULT_SIDEBAR_WIDTH = 200;
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
  const { t } = useTranslation('common');
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

  if (clock.reviewMode) {
    // Demo / handoff window — no countdown, no urgency.
    return (
      <div style={rowStyle}>
        <div
          style={{
            flex: '0 0 auto',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent-text)',
            boxShadow: '0 0 8px oklch(from var(--color-accent-text) l c h / 0.55)',
          }}
        />
        <span
          style={{
            fontFamily: "'Casta', 'Barlow Condensed', serif",
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--color-accent-text)',
          }}
        >
          {t('clock.reviewMode')}
        </span>
      </div>
    );
  }

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
            color: 'var(--color-time-up)',
            textShadow: '0 0 10px var(--color-time-up-glow)',
          }}
        >
          {t('clock.complete')}
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
            color: 'var(--foreground)',
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
        {t('clock.inProgress')}
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
      <span
        style={{
          fontFamily: "'Casta', 'Barlow Condensed', serif",
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: 'var(--foreground)',
          fontVariantNumeric: 'tabular-nums',
          marginLeft: 'auto',
        }}
      >
        {formatRemaining(clock.remainingMs)}
      </span>
    </div>
  );
}

interface SubItem {
  id: string;
  labelKey: string;
  /** When present, use t('nav.sub.step', { n }) instead of t(labelKey). */
  stepN?: string;
}

interface NavItem {
  id: string;
  labelKey: string;
  path: string;
  subItems?: SubItem[];
}

const SCENARIO_SUB_ITEMS: SubItem[] = [
  { id: 'overview', labelKey: 'nav.sub.overview' },
  { id: 'step-01', labelKey: 'nav.sub.step', stepN: '01' },
  { id: 'step-02', labelKey: 'nav.sub.step', stepN: '02' },
  { id: 'step-03', labelKey: 'nav.sub.step', stepN: '03' },
  { id: 'step-04', labelKey: 'nav.sub.step', stepN: '04' },
  { id: 'step-05', labelKey: 'nav.sub.step', stepN: '05' },
  { id: 'summary', labelKey: 'nav.sub.summary' },
];

const NAV_ITEMS: NavItem[] = [
  { id: 'introduction', labelKey: 'nav.introduction', path: '/' },
  { id: 'scenario-1', labelKey: 'nav.scenario1', path: '/scenario/1', subItems: SCENARIO_SUB_ITEMS },
  { id: 'scenario-2', labelKey: 'nav.scenario2', path: '/scenario/2', subItems: SCENARIO_SUB_ITEMS },
  { id: 'scenario-3', labelKey: 'nav.scenario3', path: '/scenario/3', subItems: SCENARIO_SUB_ITEMS },
  { id: 'challenge-1', labelKey: 'nav.challenge1', path: '/challenge/1' },
  { id: 'challenge-2', labelKey: 'nav.challenge2', path: '/challenge/2' },
  { id: 'salt-nexus', labelKey: 'nav.saltNexus', path: '/salt-nexus' },
  { id: 'leaderboard', labelKey: 'nav.leaderboard', path: '/leaderboard' },
  { id: 'completed', labelKey: 'nav.completed', path: '/completed' },
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
  const { t } = useTranslation('common');
  const { defaultLocale } = useWorkshopClock();

  // Apply per-event default locale once at startup, firing when defaultLocale
  // first resolves from the DB. Skipped only if the user made an explicit
  // choice: LanguageToggle writes "salt-locale" on click and the detector no
  // longer auto-caches it, so a non-null key reliably means a real choice.
  // A ref guard ensures we only call changeLanguage once.
  const defaultLocaleApplied = useRef(false);
  useEffect(() => {
    if (defaultLocaleApplied.current) return;
    if (defaultLocale === 'en') return; // no-op: "en" is already the fallback
    if (localStorage.getItem('salt-locale') !== null) return; // user chose explicitly
    if (defaultLocale !== i18n.language) {
      i18n.changeLanguage(defaultLocale);
    }
    defaultLocaleApplied.current = true;
  }, [defaultLocale]);

  // The sidebar's right edge aligns just past the Salt logo's right edge,
  // so the sidebar column lines up vertically with the navbar branding.
  // Measured from the live DOM because the logo has `width: auto` and
  // loads asynchronously.
  const saltLogoRef = useRef<HTMLImageElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_SIDEBAR_WIDTH);

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
      // Only trust the measurement once the bitmap has actually decoded.
      // A broken image still reports a bounding box (the placeholder glyph +
      // alt text), which is far narrower than the real mark — measuring that
      // collapsed the whole sidebar to ~85px and truncated every nav label.
      // Falling through leaves sidebarWidth at DEFAULT_SIDEBAR_WIDTH, which
      // renders correctly with or without the logo. Do NOT clamp the measured
      // value against that default: the real measurement is ~179px, so a
      // Math.max would silently widen the sidebar by 20px.
      if (!el.complete || el.naturalWidth === 0) return;
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

        {/* Right: language toggle + theme toggle (Workshop title moved into the sidebar) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <LanguageToggle />
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
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 400 : 300,
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
                  {t(item.labelKey)}
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
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.8rem',
                            fontWeight: isSubActive ? 500 : 300,
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
                          {sub.stepN ? t('nav.sub.step', { n: sub.stepN }) : t(sub.labelKey)}
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
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: '0.65rem',
                fontWeight: '600',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-text)',
              }}
            >
              {t('sidebar.workshopLabel')}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
              fontSize: '0.95rem',
              fontWeight: '600',
              letterSpacing: '0.03em',
              color: 'var(--foreground)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('sidebar.workshopTitle')}
          </div>
        </div>

        {/* Live workshop countdown — pinned to the bottom under Salt Access. */}
        <WorkshopClockPill />

        {/* Discreet operator admin entry — opens the PIN-gated admin panel. */}
        <AdminLink />
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
