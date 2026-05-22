# Light Mode — Design Spec

**Status:** Approved (pending user review of this file)
**Date:** 2026-05-21
**Scope:** Workshop SPA (client/) + theme infrastructure

## Problem

The app ships dark-only. The user wants a manual light-mode toggle while
keeping the dark theme visually identical to today (so dark users see
no regression). Light mode must preserve the brand identity: Salt
purple accents, BorderGlow effects, hint-bulb yellows, champion-green
pulse, time-up red, podium colors, MagicRings — only the dark obsidian
surfaces (body, cards, navbar, sidebar, modals) flip to a clean
modern light palette.

## Goals

- Manual light/dark toggle in the global navbar (top-right).
- Choice persisted to `localStorage` under `salt-theme`.
- First-visit default is dark (no system-preference auto-detect for v1).
- No FOUC on reload (theme applied before React hydrates).
- Every route, every overlay reads cleanly in both modes.
- All animated / glow / accent visuals survive intact.

## Non-goals

- `prefers-color-scheme` auto-switching (`enableSystem={false}` in v1).
- High-contrast / colorblind variants.
- Re-shooting step screenshots in light mode (Salt platform itself is dark).
- Per-user theme persistence in Supabase — localStorage is sufficient.
- Theme preview / "try before commit" UI.

## Architecture

**Theming engine:** `next-themes` v0.4.6 (already installed, not yet wired).

```tsx
// client/src/App.tsx (root)
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem={false}
  storageKey="salt-theme"
>
  {/* existing app tree */}
</ThemeProvider>
```

- `attribute="class"` — `next-themes` adds `.light` or `.dark` to `<html>`.
- The existing bespoke `client/src/contexts/ThemeContext.tsx` is deleted —
  `next-themes` supersedes it. No consumer files currently import it.
- `next-themes` ships an inline `<head>` script that reads localStorage
  before React hydrates — prevents the flash of dark theme on a
  light-mode user's reload.

**Token override block** in `client/src/index.css`. The existing
`:root { ... }` block (dark theme tokens) stays untouched. A new
`:root.light { ... }` block adds light-mode overrides for every
semantic token plus the brand-accent variables this spec introduces.

The hard-coded body styles in `index.css:109-110` are removed so the
body re-tints from the tokens:

```css
body {
  @apply bg-background text-foreground;
  /* WAS: background-color: #0a0a0f; color: #e8e8f0; — removed */
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## Token map

### Semantic tokens (light overrides)

```css
:root.light {
  --background: oklch(0.97 0.005 285);          /* cool off-white, same hue */
  --foreground: oklch(0.18 0.01 285);           /* near-black text */
  --card: oklch(0.99 0.003 285);                /* paper-white surface */
  --card-foreground: oklch(0.18 0.01 285);
  --popover: oklch(0.99 0.003 285);
  --popover-foreground: oklch(0.18 0.01 285);
  --primary: oklch(0.52 0.28 290);              /* Salt purple — unchanged */
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.94 0.006 285);
  --secondary-foreground: oklch(0.28 0.012 285);
  --muted: oklch(0.94 0.006 285);
  --muted-foreground: oklch(0.42 0.012 285);
  --accent: oklch(0.52 0.28 290);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.5 0.22 25);            /* darker red on light */
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0 0 0 / 0.08);                /* black at 8%, mirror */
  --input: oklch(0 0 0 / 0.06);
  --ring: oklch(0.52 0.28 290);
}
```

### Brand-accent variables (new — replace inline literals)

Components currently hard-code these as inline `oklch()` literals.
Lifting them to CSS variables lets the same JSX work in both themes.

```css
:root {
  /* Default values mirror current dark behavior */
  --color-accent-text:        oklch(0.65 0.25 290);
  --color-accent-text-bright: oklch(0.72 0.28 290);
  --color-time-up:            oklch(0.7  0.2  25);
  --color-time-up-glow:       oklch(0.5  0.2  25 / 0.5);
  --color-hint-bulb:          oklch(0.82 0.18 85);
  --color-hint-bulb-glow:     oklch(0.65 0.20 85 / 0.4);
  --color-wrong-flash:        oklch(0.3  0.12 25 / 0.3);
  /* HintModal yellow palette (hex needed for BorderGlow `colors` prop) */
  --color-hint-palette-1: #fde68a;
  --color-hint-palette-2: #facc15;
  --color-hint-palette-3: #f59e0b;
  --color-hint-glow:      50 90 70;  /* HSL string for BorderGlow */
}

:root.light {
  --color-accent-text:        oklch(0.45 0.28 290);
  --color-accent-text-bright: oklch(0.40 0.30 290);
  --color-time-up:            oklch(0.5  0.22 25);
  --color-time-up-glow:       oklch(0.45 0.22 25 / 0.5);
  --color-hint-bulb:          oklch(0.6  0.18 75);
  --color-hint-bulb-glow:     oklch(0.55 0.20 75 / 0.45);
  --color-wrong-flash:        oklch(0.85 0.15 25 / 0.4);
  --color-hint-palette-1: #f59e0b;
  --color-hint-palette-2: #d97706;
  --color-hint-palette-3: #92400e;
  --color-hint-glow:      35 90 50;
}
```

### Triage rule for inline literals

Each `style={{ color: "..." }}` / `backgroundColor` / `borderColor`
literal in the codebase falls into one of these buckets:

| Pattern | Replace with |
|---|---|
| `rgba(232,232,240, …)` near-white text | `var(--foreground)` |
| `rgba(200,200,220, 0.4–0.6)` muted text | `var(--muted-foreground)` |
| `rgba(255,255,255, 0.05–0.12)` border | `var(--border)` |
| `#0e0e16` / `rgba(10,10,15, …)` card surface | `var(--card)` |
| `rgba(10,10,15, …)` translucent dark backdrop | `var(--background)` with alpha (e.g. `oklch(from var(--background) l c h / 0.85)`) |
| `oklch(0.65 0.25 290)` purple text accent | `var(--color-accent-text)` |
| `oklch(0.72 0.28 290)` brightest purple text | `var(--color-accent-text-bright)` |
| `oklch(0.7 0.2 25)` time-up red | `var(--color-time-up)` |
| `oklch(0.82 0.18 85)` hint bulb yellow | `var(--color-hint-bulb)` |
| Wrong-flash `oklch(0.3 0.12 25 / 0.3)` | `var(--color-wrong-flash)` |
| Static mid-saturation brand swatches (champion green `oklch(0.88 0.2 145)`, podium silver, bronze) | leave as-is — already reads on both backgrounds |

## Toggle component

`client/src/components/ThemeToggle.tsx` (~60 lines). Uses
`useTheme()` from `next-themes`. Renders a 28×28 button with two
SVG icons (sun, moon) crossfading via Framer Motion.

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        background: "none", border: "none", padding: 0, cursor: "pointer",
        width: 28, height: 28, display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        color: "var(--muted-foreground)",
        transition: "color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? <MoonIcon key="moon" /> : <SunIcon key="sun" />}
      </AnimatePresence>
    </button>
  );
}
```

Icons are inline SVG (no new dependency). Mounted top-right of the
WorkshopLayout `<header>`.

## Surface-by-surface notes

### Shader background

In `WorkshopLayout.tsx`, conditionally render the `.webm` video for
dark only; for light, render a static radial gradient.

```tsx
{resolvedTheme === "dark" ? (
  <video src="/shader-bg.webm" autoPlay loop muted playsInline ... />
) : (
  <div
    style={{
      position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none",
      background:
        "radial-gradient(ellipse at 50% 40%, oklch(0.88 0.08 290 / 0.45) 0%, oklch(0.97 0.005 285 / 0) 60%)",
    }}
  />
)}
```

The existing dark-mode purple radial overlay (mix-blend-mode: color)
keeps the same conditional — dark only.

### MagicRings (Three.js Begin button)

Two color uniforms are hardcoded. Add a theme-aware default in the
parent component (`MagicRingsButton.tsx`):

```tsx
const { resolvedTheme } = useTheme();
const ringColors = resolvedTheme === "light"
  ? { ringA: "#a855f7", ringB: "#0ea5e9" }   // purple + sky for white bg
  : { ringA: "#fc42ff", ringB: "#42fcff" };  // current magenta + cyan
```

Pass to existing `<MagicRings>` props. Shader code unchanged.

### BorderGlow default backgroundColor

`BorderGlow.tsx`'s default `backgroundColor` prop is currently
`#120F17`. Change the default to `var(--color-card)`. Every existing
caller that passes an explicit `backgroundColor="#0e0e16"` migrates to
`backgroundColor="var(--color-card)"` during the per-file refactor.

The `outerGlowOnly + fillOpacity={0}` combo shipped on the Completed
results card stays as-is — works identically on light backgrounds.

### HintModal

The yellow palette currently lives as an inline constant:

```ts
const YELLOW_PALETTE = ["#fde68a", "#facc15", "#f59e0b"];
```

Replace with a `useTheme()` switch — React-idiomatic, re-runs on theme
change without manual subscription:

```ts
import { useTheme } from "next-themes";

const { resolvedTheme } = useTheme();
const PALETTE = resolvedTheme === "light"
  ? ["#f59e0b", "#d97706", "#92400e"]
  : ["#fde68a", "#facc15", "#f59e0b"];
const GLOW = resolvedTheme === "light" ? "35 90 50" : "50 90 70";
```

(The CSS-variable values defined earlier still exist as the canonical
source of truth — they're referenced by other modal surfaces. Only the
two `BorderGlow` array/string props need this JS-side switch because
`BorderGlow` reads them as literals at render-time, not via `var()`.)

The backdrop `background: rgba(10,10,15,0.65)` becomes
`rgba(245,245,250,0.55)` in light. `backdropFilter: blur(10px)` stays.

### ZoomableImage (step screenshots)

In light mode, add a subtle frame so the dark Salt UI screenshots
don't float on white:

```tsx
const { resolvedTheme } = useTheme();
style={{
  border: "1px solid var(--border)",
  borderRadius: 6,
  boxShadow: resolvedTheme === "light" ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
  ...
}}
```

### Salt Nexus page

Uses `.section-label` (token-driven, inherits `--color-accent-text`).
The "Salt Nexus" green pulse (`oklch(0.88 0.2 145)`) and its
text-shadow read on both backgrounds. No surgical work required
beyond the standard inline-literal triage.

## Refactor waves

| Wave | Files | Outcome |
|---|---|---|
| 1. CSS infra | `index.css` | Light tokens defined; body re-tints; no component changes yet. |
| 2. Toggle plumbing | `App.tsx`, `ThemeToggle.tsx` (new), `WorkshopLayout.tsx` | Toggle clickable; `<html>` class flips; old `ThemeContext.tsx` deleted. |
| 3. Layout shell | `WorkshopLayout.tsx` | Navbar / sidebar / shader-vs-gradient swap correct. |
| 4. Challenge flow | `ChallengePage`, `QuestionCard`, `ChallengeHeader`, `Challenge1HelpStepper`, `HintModal`, `HintBulbButton`, `WaitingOverlay` | C1/C2 + hint modal + time-up overlay clean in both modes. |
| 5. Completion + leaderboard | `Completed`, `Leaderboard` | Results card + podium clean. |
| 6. Scenario pages + home | `Home`, `Scenario1`, `Scenario2`, `Scenario3`, `SaltNexus`, `RegistrationGate`, `ZoomableImage` | Whole-app coverage. |
| 7. WebGL + visual edges | `MagicRings`, `MagicRingsButton`, `BorderGlow` defaults | No regressions, theme-aware ring colors. |
| 8. QA pass | (no code) | Every route × every theme walked manually with `pnpm dev`. |

Each wave is a separate commit. Type-check (`pnpm check`) after every
wave. The order minimizes "broken in the middle" states — after wave 3,
the chrome is correct; after wave 4, the most-trafficked screen is
correct; subsequent waves are additive polish.

## Edge cases

| Scenario | Behavior |
|---|---|
| First visit on a light-system-pref user | Dark (we explicitly set `enableSystem={false}` and `defaultTheme="dark"`). |
| User toggles light, refreshes | Light renders before React hydrates (no FOUC, via `next-themes` inline head script). |
| User toggles light, opens a different tab to same domain | Both tabs converge — `next-themes` listens to `storage` events. |
| Toggle clicked mid-animation (modal opening, page transitioning) | Theme swap is instant CSS class flip; no in-flight animation is interrupted. Framer Motion `useTheme()` re-renders consumers but doesn't unmount them. |
| User is mid-hint-modal when toggling | Modal re-paints with new palette; hint text + bulb-yellow border swap to light variants. |
| User is on `/completed` with looping BorderGlow when toggling | BorderGlow's `colors` array is theme-derived per the refactor (consumers pass `var(--color-card)` for `backgroundColor`); palette of the rotating glow stays identical (rank accents read on both). |
| Print stylesheet / accessibility tools | Not addressed in v1. If needed, add `@media print { :root { ... } }` later. |

## QA matrix

| Route | Dark check | Light check |
|---|---|---|
| `/` (Home) | baseline ✓ | hero gradient + recap cards |
| `/scenario/1`, `/2`, `/3` | baseline ✓ | step-image frames, sidebar scroll-spy |
| `/challenge/1`, `/challenge/2` | baseline ✓ | card grid, hint bulb visibility, time-up overlay |
| `/completed` | baseline ✓ | spinning BorderGlow on results card, podium colors |
| `/leaderboard` | baseline ✓ | row dividers, rank accents |
| `/salt-nexus` | baseline ✓ | "Salt" purple + "Nexus" green pulse |
| Hint modal (mid-flow) | baseline ✓ | yellow palette readability, red close-warning |
| Time-up overlay (forced via DB) | baseline ✓ | overlay backdrop alpha, "Time's Up" red glow |
| WaitingOverlay (admin gate closed) | baseline ✓ | pulsing dot-matrix S logo |
| RegistrationGate | baseline ✓ | input field contrast, button hover |

Walk with the toggle in DevTools open; use the Accessibility panel's
contrast checker on each surface. Acceptance bar: WCAG AA on body text
(4.5:1), AA Large on display headings (3:1).

## Out-of-scope (deferred)

- `prefers-color-scheme` auto-detection.
- Sepia / high-contrast / colorblind themes.
- Re-shooting step screenshots in light mode.
- Per-user theme persistence in Supabase.
- Print stylesheet.
- Theme-preview UI (e.g. "preview before commit").
- A dynamic light-mode shader video (current plan: static gradient).
