# Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual light/dark theme toggle to the workshop SPA without touching the existing dark-mode visuals.

**Architecture:** `next-themes` (already installed) manages a `.dark` / `.light` class on `<html>`. `client/src/index.css` gains a `:root.light { ... }` override block plus brand-accent CSS variables that components currently hardcode. Per-file refactor replaces inline `oklch()` / `rgba()` literals with `var(--...)` tokens. Dark-only assets (shader video, MagicRings ring colors) get theme-conditional render branches.

**Tech Stack:** TypeScript / React 18 / Vite / Tailwind v4 (`@theme inline`) / `next-themes` v0.4.6 / Framer Motion. No test infra exists; verification is `pnpm check` + manual visual QA in dev server.

**Reference spec:** `docs/superpowers/specs/2026-05-21-light-mode-design.md` (commit `da8b25c`).

---

## File Structure

**New files:**
- `client/src/components/ThemeToggle.tsx` — sun/moon toggle button rendered top-right of the global navbar.

**Modified files (in wave order):**
- `client/src/index.css` — light-mode token block, brand-accent variables, drop hardcoded `body` colors.
- `client/src/App.tsx` — replace bespoke `<ThemeProvider>` with `next-themes` provider.
- `client/src/components/WorkshopLayout.tsx` — token swap, conditional shader, embed `ThemeToggle`.
- `client/src/components/ChallengePage.tsx`
- `client/src/components/QuestionCard.tsx`
- `client/src/components/ChallengeHeader.tsx`
- `client/src/components/Challenge1HelpStepper.tsx`
- `client/src/components/HintModal.tsx`
- `client/src/components/HintBulbButton.tsx`
- `client/src/components/WaitingOverlay.tsx`
- `client/src/pages/Completed.tsx`
- `client/src/pages/Leaderboard.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Scenario1.tsx`
- `client/src/pages/Scenario2.tsx`
- `client/src/pages/Scenario3.tsx`
- `client/src/pages/SaltNexus.tsx`
- `client/src/components/RegistrationGate.tsx`
- `client/src/components/ZoomableImage.tsx`
- `client/src/components/MagicRingsButton.tsx`
- `client/src/components/BorderGlow.tsx` — default `backgroundColor` becomes `var(--card)`.

**Deleted files:**
- `client/src/contexts/ThemeContext.tsx` — superseded by `next-themes`.

**Verification surface:** `pnpm check` (TypeScript) after every commit. Manual QA at the end (Task 13) covering every route in both themes. No automated tests because the repo has none.

---

## Triage rule for inline color literals (applies to every refactor task)

Whenever a task says "apply the triage rule", scan every `style={{ ... }}` inline literal in the touched file and substitute per this table:

| Current literal pattern | Replace with |
|---|---|
| `rgba(232,232,240, …)` / `#e8e8f0` near-white text | `var(--foreground)` |
| `rgba(200,200,220, 0.4–0.6)` muted text | `var(--muted-foreground)` |
| `rgba(255,255,255, 0.05–0.12)` border | `var(--border)` |
| `#0e0e16` / `#120F17` card surface | `var(--card)` |
| `rgba(10,10,15, 0.5–1)` body/backdrop | use OKLCH derived from `var(--background)`, e.g. `oklch(from var(--background) l c h / 0.85)` |
| `oklch(0.65 0.25 290)` purple text accent | `var(--color-accent-text)` |
| `oklch(0.72 0.28 290)` brightest purple text | `var(--color-accent-text-bright)` |
| `oklch(0.7 0.2 25)` time-up red | `var(--color-time-up)` |
| `oklch(0.5 0.2 25 / 0.5)` time-up glow | `var(--color-time-up-glow)` |
| `oklch(0.82 0.18 85)` hint bulb yellow | `var(--color-hint-bulb)` |
| `oklch(0.65 0.2 85 / 0.4)` hint bulb glow | `var(--color-hint-bulb-glow)` |
| `oklch(0.3 0.12 25 / 0.3)` wrong-flash bg | `var(--color-wrong-flash)` |

**Leave alone:**
- Static brand swatches in mid-saturation OKLCH that already read on both backgrounds: champion green `oklch(0.88 0.2 145)`, podium silver `oklch(0.78 0.04 260)`, bronze `oklch(0.6 0.12 45)`, hint modal yellow palette inside `HintModal.tsx` (handled via `useTheme()` switch — see Task 7).
- Salt purple at its primary saturation `oklch(0.52 0.28 290)` — already reads on both.
- `rgba(0,0,0,0.X)` shadows — they work on both.

---

## Task 1: CSS infrastructure (`index.css` only)

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Add the `:root.light` override block + brand-accent variables**

Open `client/src/index.css`. Locate the existing `:root { ... }` block (around lines 75–98). **Keep it unchanged.** Immediately after that block (around line 99, before `@layer base`), insert two new blocks:

```css
/* Brand-accent variables — replace inline literals scattered through
   the component tree. Default values keep current dark behavior. */
:root {
  --color-accent-text:        oklch(0.65 0.25 290);
  --color-accent-text-bright: oklch(0.72 0.28 290);
  --color-time-up:            oklch(0.7  0.2  25);
  --color-time-up-glow:       oklch(0.5  0.2  25 / 0.5);
  --color-hint-bulb:          oklch(0.82 0.18 85);
  --color-hint-bulb-glow:     oklch(0.65 0.20 85 / 0.4);
  --color-wrong-flash:        oklch(0.3  0.12 25 / 0.3);
  /* Hint modal palette (consumed by JS — see HintModal.tsx) */
  --color-hint-palette-1: #fde68a;
  --color-hint-palette-2: #facc15;
  --color-hint-palette-3: #f59e0b;
  --color-hint-glow:      50 90 70;
}

/* Light theme overrides — applied when next-themes sets <html class="light"> */
:root.light {
  --background: oklch(0.97 0.005 285);
  --foreground: oklch(0.18 0.01 285);
  --card: oklch(0.99 0.003 285);
  --card-foreground: oklch(0.18 0.01 285);
  --popover: oklch(0.99 0.003 285);
  --popover-foreground: oklch(0.18 0.01 285);
  --primary: oklch(0.52 0.28 290);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.94 0.006 285);
  --secondary-foreground: oklch(0.28 0.012 285);
  --muted: oklch(0.94 0.006 285);
  --muted-foreground: oklch(0.42 0.012 285);
  --accent: oklch(0.52 0.28 290);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.5 0.22 25);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0 0 0 / 0.08);
  --input: oklch(0 0 0 / 0.06);
  --ring: oklch(0.52 0.28 290);

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

- [ ] **Step 2: Remove hardcoded body bg/color so it inherits from tokens**

Find the `body { ... }` block in `@layer base` (around lines 107-114). Remove the two literal lines so the body re-tints from the tokens. Final block:

```css
body {
  @apply bg-background text-foreground;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS (CSS doesn't affect TypeScript, but confirms nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add client/src/index.css
git commit -m "Add light-mode token block + brand-accent variables"
```

---

## Task 2: Toggle plumbing — `next-themes` provider + `ThemeToggle` component

**Files:**
- Create: `client/src/components/ThemeToggle.tsx`
- Modify: `client/src/App.tsx`
- Delete: `client/src/contexts/ThemeContext.tsx`

- [ ] **Step 1: Create the ThemeToggle component**

Create `client/src/components/ThemeToggle.tsx` with exactly:

```tsx
/**
 * Light/dark theme toggle. Renders a 28x28 sun/moon button that
 * crossfades between icons on click. Reads + writes theme via
 * next-themes; choice persists to localStorage under "salt-theme".
 *
 * Pinned to the top-right of the global navbar (WorkshopLayout).
 */

import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ICON_TRANSITION = { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoid SSR/CSR mismatch flicker — render a fixed-size placeholder
  // until the client has hydrated and resolvedTheme is known.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return <span style={{ width: 28, height: 28, display: "inline-block" }} />;
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        width: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted-foreground)",
        outline: "none",
        transition: "color 0.2s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)")
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.svg
            key="moon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={ICON_TRANSITION}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </motion.svg>
        ) : (
          <motion.svg
            key="sun"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={ICON_TRANSITION}
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4.93 4.93l1.41 1.41" />
            <path d="M17.66 17.66l1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M4.93 19.07l1.41-1.41" />
            <path d="M17.66 6.34l1.41-1.41" />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}
```

- [ ] **Step 2: Swap `App.tsx` to use the next-themes provider**

Replace `client/src/App.tsx` entirely with:

```tsx
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Scenario1 from "./pages/Scenario1";
import Scenario2 from "./pages/Scenario2";
import Scenario3 from "./pages/Scenario3";
import Challenge1 from "./pages/Challenge1";
import Challenge2 from "./pages/Challenge2";
import SaltNexus from "./pages/SaltNexus";
import Leaderboard from "./pages/Leaderboard";
import Completed from "./pages/Completed";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/scenario/1" component={Scenario1} />
      <Route path="/scenario/2" component={Scenario2} />
      <Route path="/scenario/3" component={Scenario3} />
      <Route path="/challenge/1" component={Challenge1} />
      <Route path="/challenge/2" component={Challenge2} />
      <Route path="/salt-nexus" component={SaltNexus} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/completed" component={Completed} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="salt-theme"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Step 3: Delete the obsolete custom ThemeContext**

```bash
git rm client/src/contexts/ThemeContext.tsx
```

If the parent `client/src/contexts/` directory is now empty, also remove it:
```bash
rmdir client/src/contexts 2>/dev/null || true
```

- [ ] **Step 4: Type-check**

Run: `pnpm check`
Expected: PASS. (If errors mention `next-themes` types missing, `pnpm install` to verify the package is hydrated.)

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/components/ThemeToggle.tsx
git commit -m "Wire next-themes provider + add ThemeToggle component"
```

---

## Task 3: WorkshopLayout — shell tokens, conditional shader, toggle slot

**Files:**
- Modify: `client/src/components/WorkshopLayout.tsx`

- [ ] **Step 1: Add the `useTheme` import + ThemeToggle import**

At the top of `WorkshopLayout.tsx`, add (next to existing react imports):

```tsx
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
```

Inside the `WorkshopLayout` function body, after the existing `useState`s, add:

```tsx
const { resolvedTheme } = useTheme();
const isDark = resolvedTheme !== "light";
```

- [ ] **Step 2: Conditional shader background**

Find the `<video ... src="/shader-bg.webm" ... />` element in the JSX (it's near the top of the rendered layout, before the navbar). Wrap it in a conditional and add a light-mode static gradient div as its sibling fallback:

```tsx
{isDark ? (
  <video
    src="/shader-bg.webm"
    autoPlay
    loop
    muted
    playsInline
    style={{
      position: "fixed",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      zIndex: -2,
      pointerEvents: "none",
    }}
  />
) : (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: -2,
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse at 50% 40%, oklch(0.88 0.08 290 / 0.45) 0%, oklch(0.97 0.005 285 / 0) 60%)",
    }}
  />
)}
```

(Preserve any existing `style` props on the original `<video>`; the snippet above is the canonical form — match whatever the existing literal-color positioning values are.)

- [ ] **Step 3: Conditional purple radial overlay**

If the layout has a separate purple radial-gradient overlay div (separate from the `<video>`), gate it on `isDark` similarly:

```tsx
{isDark && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: -1,
      background: "radial-gradient(...existing values unchanged...)",
      mixBlendMode: "color",
    }}
  />
)}
```

- [ ] **Step 4: Refactor navbar styles**

Find the navbar `<header>` element. Apply the triage rule from the top of this plan. Concretely:
- `backgroundColor: scrolled ? 'rgba(10,10,15,0.92)' : 'rgba(10,10,15,0.75)'` → `backgroundColor: scrolled ? 'oklch(from var(--background) l c h / 0.92)' : 'oklch(from var(--background) l c h / 0.75)'`
- `borderBottom: '1px solid rgba(255,255,255,0.07)'` → `borderBottom: '1px solid var(--border)'`
- Logo subtitle text `color: 'rgba(232,232,240,0.95)'` → `color: 'var(--foreground)'`

- [ ] **Step 5: Embed `<ThemeToggle />` top-right of the navbar**

Inside the `<header>` element, at the very end (right edge), render the toggle. The header is currently a grid/flex; add the toggle as the last child:

```tsx
<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
  <ThemeToggle />
</div>
```

If the header already has a right-aligned cluster, append `<ThemeToggle />` to it.

- [ ] **Step 6: Refactor sidebar styles**

Find the `<aside>` (sidebar) element. Apply the triage rule:
- `borderRight: '1px solid rgba(255,255,255,0.06)'` → `borderRight: '1px solid var(--border)'`
- Sidebar nav item active color `'rgba(248,250,255,1)'` → `'var(--foreground)'`
- Sidebar nav item inactive color `'rgba(210,210,225,0.9)'` → `'var(--muted-foreground)'`
- Sidebar nav item hover `'rgba(248,250,255,1)'` → `'var(--foreground)'`
- Sub-item inactive `'rgba(180,180,200,0.7)'` → `'var(--muted-foreground)'`
- Sub-item active `'rgba(248,250,255,1)'` → `'var(--foreground)'`
- Dot indicator inactive `'rgba(170,170,190,0.55)'` → `'var(--muted-foreground)'`
- Dot indicator active `'oklch(0.65 0.25 290)'` → `'var(--color-accent-text)'`

For purple accent texts in the sidebar (the leaderboard sidebar pill colors, etc.), use `var(--color-accent-text)` for accents and leave the brand-purple swatches as-is.

- [ ] **Step 7: Refactor any remaining literals in WorkshopLayout**

Scan the rest of the file for any `oklch(`, `rgba(`, `#0e0e16`, `#120F17`, `#0a0a0f` literals in inline styles and apply the triage rule. The countdown pill (`WorkshopClockPill`) keeps its red/green status `boxShadow` colors — they're state-driven, not theme-driven.

- [ ] **Step 8: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 9: Manual sanity check**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
sleep 5
open http://localhost:3000/
```

Click the ThemeToggle (top-right of navbar). Confirm:
- Dark mode: navbar dark, sidebar dark, shader video visible behind content.
- Light mode: navbar light, sidebar light, static purple-tinted gradient behind content, shader video HIDDEN.

Kill the dev server: `kill %1` (or `lsof -i:3000` and `kill <pid>`).

- [ ] **Step 10: Commit**

```bash
git add client/src/components/WorkshopLayout.tsx
git commit -m "WorkshopLayout: tokenize shell + conditional shader + theme toggle"
```

---

## Task 4: Challenge flow refactor — ChallengePage, QuestionCard, ChallengeHeader

**Files:**
- Modify: `client/src/components/ChallengePage.tsx`
- Modify: `client/src/components/QuestionCard.tsx`
- Modify: `client/src/components/ChallengeHeader.tsx`

- [ ] **Step 1: Refactor `ChallengePage.tsx`**

Apply the triage rule to every inline color literal. Specific replacements to apply (each `style={{ ... }}` value):
- Body text `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- Muted text `'rgba(200,200,220,0.7)'`, `'rgba(200,200,220,0.55)'`, `'rgba(200,200,220,0.8)'`, `'rgba(200,200,220,0.85)'` → `'var(--muted-foreground)'`
- Border `'1px solid rgba(255,255,255,0.06)'` / `'1px solid rgba(255,255,255,0.08)'` → `'1px solid var(--border)'`
- Backdrop `'rgba(10,10,15,0.45)'`, `'rgba(10,10,15,0.55)'`, `'rgba(10,10,15,0.65)'` → `'oklch(from var(--background) l c h / 0.65)'` (use the same alpha)
- Time-up overlay heading red `'oklch(0.7 0.2 25)'` → `'var(--color-time-up)'`
- Time-up overlay textShadow `'0 0 24px oklch(0.5 0.2 25 / 0.5)'` → `'0 0 24px var(--color-time-up-glow)'`
- DotMatrixLogo color prop `'oklch(0.7 0.2 25)'` → `'var(--color-time-up)'`
- Celebration card border `'oklch(0.55 0.22 145 / 0.4)'` — LEAVE (champion green border, brand swatch)
- Celebration card bg gradient `'oklch(0.3 0.12 145 / 0.35)'` / `'oklch(0.25 0.15 290 / 0.25)'` — LEAVE (brand swatches)
- Snapshot card bg `'rgba(10,10,15,0.45)'` → `'oklch(from var(--background) l c h / 0.45)'`
- Snapshot rank colors (oklch swatches for 1st/2nd/3rd) — LEAVE (brand swatches)
- Snapshot row colors `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`; `'rgba(200,200,220,0.8)'` → `'var(--muted-foreground)'`

- [ ] **Step 2: Refactor `QuestionCard.tsx`**

Specific replacements:
- Card chrome `backgroundColor="#0e0e16"` (passed to `BorderGlow`) → `backgroundColor="var(--card)"`
- Solved-state label color `'oklch(0.78 0.25 145)'` — LEAVE (champion green brand swatch)
- Solved-card answer box border `'1px solid oklch(0.55 0.22 145 / 0.5)'` — LEAVE (brand)
- Solved-card answer box bg `'rgba(0,0,0,0.25)'` → `'oklch(from var(--card) l c h / 0.5)'`
- Solved-card answer text `'oklch(0.88 0.2 145)'` — LEAVE (champion green text on green border)
- Locked-state container border `'1px solid rgba(255,255,255,0.08)'` → `'1px solid var(--border)'`
- Locked-state container bg `'rgba(255,255,255,0.015)'` → `'oklch(from var(--foreground) l c h / 0.04)'`
- Locked-state label color `'rgba(200,200,220,0.5)'` → `'var(--muted-foreground)'`
- Default-state input bg `'rgba(0,0,0,0.25)'` → `'oklch(from var(--card) l c h / 0.5)'`
- Default-state input border `'1px solid rgba(255,255,255,0.12)'` → `'1px solid var(--border)'`
- Default-state input color `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- Wrong-flash bg `'oklch(0.3 0.12 25 / 0.3)'` → `'var(--color-wrong-flash)'`
- Error message color `'oklch(0.7 0.2 25)'` → `'var(--color-time-up)'`

Submit button gradient (`oklch(0.52 0.28 290) → oklch(0.42 0.25 295)`) — LEAVE (brand purple).

- [ ] **Step 3: Refactor `ChallengeHeader.tsx`**

Specific replacements:
- Background `'rgba(10,10,15,0.85)'` → `'oklch(from var(--background) l c h / 0.85)'`
- Border top/bottom `'1px solid rgba(255,255,255,0.08)'` → `'1px solid var(--border)'`
- Title color `'rgba(200,200,220,0.75)'` → `'var(--muted-foreground)'`
- Solved-count `'rgba(200,200,220,0.55)'` → `'var(--muted-foreground)'`
- Attendee name `'rgba(200,200,220,0.85)'` → `'var(--muted-foreground)'`
- Diamond `'oklch(0.65 0.25 290)'` → `'var(--color-accent-text)'`
- Help button open-state color `'rgba(232,232,240,0.4)'` → `'var(--muted-foreground)'`
- Help button closed-state color `'oklch(0.88 0.2 145)'` — LEAVE (champion green pulse)
- Help button text-shadow values `'oklch(... 145 / ...)'` — LEAVE (green pulse)
- Timer color logic (timerColor variable):
  - Loaded neutral `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
  - Loading neutral `'rgba(200,200,220,0.45)'` → `'var(--muted-foreground)'`
  - Expired/<1min `'oklch(0.7 0.2 25)'` → `'var(--color-time-up)'`
  - Expired textShadow `'0 0 16px oklch(0.5 0.2 25 / 0.4)'` → `'0 0 16px var(--color-time-up-glow)'`
  - Amber <5min — LEAVE (state-driven amber, not theme-driven)
- Penalty label color `'oklch(0.7 0.2 25)'` → `'var(--color-time-up)'`

- [ ] **Step 4: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ChallengePage.tsx client/src/components/QuestionCard.tsx client/src/components/ChallengeHeader.tsx
git commit -m "Tokenize challenge page + question card + header"
```

---

## Task 5: Hint surfaces — HintModal, HintBulbButton, Challenge1HelpStepper

**Files:**
- Modify: `client/src/components/HintModal.tsx`
- Modify: `client/src/components/HintBulbButton.tsx`
- Modify: `client/src/components/Challenge1HelpStepper.tsx`

- [ ] **Step 1: Refactor `HintModal.tsx`** — palette via `useTheme()`

Add `import { useTheme } from "next-themes";` next to the existing react imports. At the top of the component body, replace:

```ts
const YELLOW_PALETTE = ["#fde68a", "#facc15", "#f59e0b"];
```

with:

```ts
const { resolvedTheme } = useTheme();
const YELLOW_PALETTE =
  resolvedTheme === "light"
    ? ["#f59e0b", "#d97706", "#92400e"]
    : ["#fde68a", "#facc15", "#f59e0b"];
const YELLOW_GLOW = resolvedTheme === "light" ? "35 90 50" : "50 90 70";
```

Then update the BorderGlow JSX:
- `glowColor="50 90 70"` → `glowColor={YELLOW_GLOW}`
- `backgroundColor="#0e0e16"` → `backgroundColor="var(--card)"`

Remaining replacements:
- Backdrop `background: 'rgba(10,10,15,0.65)'` → `background: 'oklch(from var(--background) l c h / 0.65)'`
- Section-label color `'oklch(0.82 0.18 85)'` → `'var(--color-hint-bulb)'`
- Hint-count text `'rgba(200,200,220,0.55)'` → `'var(--muted-foreground)'`
- Confirm heading color `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- "Reveal a Hint?" inner span (the highlighted "Hint") color `'oklch(0.82 0.18 85)'` → `'var(--color-hint-bulb)'`
- `textShadow: '0 0 24px oklch(0.6 0.2 85 / 0.45)'` → `'0 0 24px var(--color-hint-bulb-glow)'`
- Body p color `'rgba(210,210,225,0.85)'` → `'var(--muted-foreground)'`
- Revealed hint card border `'1px solid oklch(0.55 0.18 85 / 0.35)'` — LEAVE (hint yellow brand; reads on both)
- Revealed hint card bg `'oklch(0.18 0.06 85 / 0.18)'` → `'oklch(from var(--color-hint-bulb) l c h / 0.12)'`
- Revealed hint label color `'oklch(0.82 0.18 85)'` → `'var(--color-hint-bulb)'`
- Revealed hint body color `'rgba(232,232,240,0.92)'` → `'var(--foreground)'`
- Warning callout border `'1px solid oklch(0.55 0.22 25 / 0.55)'` → `'1px solid var(--color-time-up)'`
- Warning callout bg `'oklch(0.22 0.09 25 / 0.25)'` → `'oklch(from var(--color-time-up) l c h / 0.15)'`
- Warning callout color `'oklch(0.78 0.18 25)'` → `'var(--color-time-up)'`
- Error message color `'oklch(0.7 0.2 25)'` → `'var(--color-time-up)'`
- Cancel button border `'1px solid rgba(255,255,255,0.18)'` → `'1px solid var(--border)'`
- Cancel button color `'rgba(200,200,220,0.85)'` → `'var(--foreground)'`
- Reveal button gradient — LEAVE (yellow brand swatch)
- Footer `'+60s per hint'` color `'rgba(200,200,220,0.55)'` → `'var(--muted-foreground)'`

- [ ] **Step 2: Refactor `HintBulbButton.tsx`**

Replace the svg fill `'oklch(0.82 0.18 85)'` with `'var(--color-hint-bulb)'`.

In the animation `filter` keyframes, replace the inline literals:
- `"drop-shadow(0 0 4px oklch(0.65 0.2 85 / 0.4))"` → `"drop-shadow(0 0 4px var(--color-hint-bulb-glow))"`
- `"drop-shadow(0 0 10px oklch(0.78 0.22 85 / 0.7))"` → `"drop-shadow(0 0 10px var(--color-hint-bulb-glow))"`
- `"drop-shadow(0 0 4px oklch(0.65 0.2 85 / 0.4))"` → `"drop-shadow(0 0 4px var(--color-hint-bulb-glow))"`

- [ ] **Step 3: Refactor `Challenge1HelpStepper.tsx`**

Specific replacements:
- `headingStyle.color: 'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- `bodyStyle.color: 'rgba(210,210,225,0.85)'` → `'var(--muted-foreground)'`
- `labelStyle.color: 'oklch(0.78 0.18 145)'` — LEAVE (green brand)

- [ ] **Step 4: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/HintModal.tsx client/src/components/HintBulbButton.tsx client/src/components/Challenge1HelpStepper.tsx
git commit -m "Tokenize hint surfaces (modal palette via useTheme)"
```

---

## Task 6: WaitingOverlay + RegistrationGate

**Files:**
- Modify: `client/src/components/WaitingOverlay.tsx`
- Modify: `client/src/components/RegistrationGate.tsx`

- [ ] **Step 1: Refactor `WaitingOverlay.tsx`**

Apply the triage rule. Common replacements expected:
- Backdrop `'rgba(10,10,15,0.65)'` → `'oklch(from var(--background) l c h / 0.65)'`
- Heading `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- Body text `'rgba(200,200,220,0.7)'` / `'rgba(200,200,220,0.85)'` → `'var(--muted-foreground)'`
- Green pulse `'oklch(0.88 0.2 145)'` — LEAVE (green brand swatch)
- Green pulse textShadow values — LEAVE (brand glow)
- Section-label colors → `'var(--color-accent-text)'` (already uses `.section-label` class via index.css → will inherit correctly without inline override)

- [ ] **Step 2: Refactor `RegistrationGate.tsx`**

Apply the triage rule. Likely replacements:
- Backdrop `'rgba(10,10,15,0.X)'` → `'oklch(from var(--background) l c h / 0.X)'`
- Card bg `'rgba(10,10,15,0.55)'` / `'rgba(0,0,0,0.X)'` → `'var(--card)'` (for fully opaque) or `'oklch(from var(--card) l c h / 0.X)'`
- Border `'1px solid rgba(255,255,255,0.08)'` → `'1px solid var(--border)'`
- Input bg/border/color — same patterns as QuestionCard's input
- Error red `'oklch(0.7 0.2 25)'` → `'var(--color-time-up)'`
- Body text `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- Muted `'rgba(200,200,220,*)'` → `'var(--muted-foreground)'`

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/WaitingOverlay.tsx client/src/components/RegistrationGate.tsx
git commit -m "Tokenize waiting overlay + registration gate"
```

---

## Task 7: Completed + Leaderboard pages

**Files:**
- Modify: `client/src/pages/Completed.tsx`
- Modify: `client/src/pages/Leaderboard.tsx`

- [ ] **Step 1: Refactor `Completed.tsx`**

Specific replacements:
- Body text `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- Muted text `'rgba(200,200,220,0.55)'` / `'rgba(200,200,220,0.6)'` / `'rgba(200,200,220,0.7)'` / `'rgba(200,200,220,0.8)'` / `'rgba(160,160,180,0.75)'` → `'var(--muted-foreground)'`
- Tier-headline accent colors (`rankAccent()` return values) — LEAVE (champion green, podium silver/bronze, etc.)
- Hint-line summary text `'rgba(200,200,220,0.7)'` → `'var(--muted-foreground)'`
- Scenario recap card border `'1px solid oklch(0.52 0.28 290 / 0.18)'` → `'1px solid var(--color-accent-text)'` with opacity preserved → `'1px solid oklch(from var(--color-accent-text) l c h / 0.18)'`
- Scenario recap card bg `'oklch(0.52 0.28 290 / 0.04)'` → `'oklch(from var(--color-accent-text) l c h / 0.04)'`
- Number color `'oklch(0.65 0.25 290)'` → `'var(--color-accent-text)'`
- Title color `'rgba(232,232,240,0.9)'` → `'var(--foreground)'`
- Back button colors `'rgba(150,130,200,0.55)'` / `'rgba(196,181,253,0.8)'` — LEAVE (light-purple links, brand swatch family)
- `BorderGlow` on results card: `backgroundColor="#0e0e16"` → `backgroundColor="var(--card)"`
- `resultsGlow()` palette returns — LEAVE (rank-derived brand swatches)
- Stat helper accent — LEAVE (consumer passes rank accent)

- [ ] **Step 2: Refactor `Leaderboard.tsx`**

Apply the triage rule. Common patterns:
- Row backgrounds / dividers / muted text → tokenized.
- Rank-accent colors (gold/silver/bronze) — LEAVE.
- "YOU" badge colors → `'var(--color-accent-text)'` if currently `oklch(0.65 0.25 290)` etc.

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Completed.tsx client/src/pages/Leaderboard.tsx
git commit -m "Tokenize completed + leaderboard"
```

---

## Task 8: Home + Scenario pages

**Files:**
- Modify: `client/src/pages/Home.tsx`
- Modify: `client/src/pages/Scenario1.tsx`
- Modify: `client/src/pages/Scenario2.tsx`
- Modify: `client/src/pages/Scenario3.tsx`

- [ ] **Step 1: Refactor `Home.tsx`**

Specific replacements:
- Hero h1 first half `color: "rgba(232,232,240,0.97)"` → `color: "var(--foreground)"`
- Hero h1 italic second half `color: "oklch(0.72 0.28 290)"` → `color: "var(--color-accent-text-bright)"`
- Hero h1 textShadow `"0 0 40px oklch(0.52 0.28 290 / 0.5)"` → `"0 0 40px oklch(from var(--color-accent-text-bright) l c h / 0.5)"`
- Body text colors → `var(--foreground)` / `var(--muted-foreground)` per triage.
- Scenario card border `'oklch(0.52 0.28 290 / 0.18)'` → `'oklch(from var(--color-accent-text) l c h / 0.18)'`
- Scenario card bg `'oklch(0.52 0.28 290 / 0.04)'` → `'oklch(from var(--color-accent-text) l c h / 0.04)'`
- `.section-label` text already token-driven via index.css class.

- [ ] **Step 2: Refactor `Scenario1.tsx`, `Scenario2.tsx`, `Scenario3.tsx`**

Each scenario page uses similar patterns: large body text, step labels, embedded `ZoomableImage` instances, "STEP / 0X" labels via `.section-label`. Apply the triage rule across each.

For each: replace foreground/muted/border literals; leave brand-purple swatches alone if they're at primary saturation (`oklch(0.52 0.28 290)`); swap the brighter purple text accents (0.65, 0.72) to the new vars.

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Home.tsx client/src/pages/Scenario1.tsx client/src/pages/Scenario2.tsx client/src/pages/Scenario3.tsx
git commit -m "Tokenize home + scenarios 1-3"
```

---

## Task 9: SaltNexus + ZoomableImage

**Files:**
- Modify: `client/src/pages/SaltNexus.tsx`
- Modify: `client/src/components/ZoomableImage.tsx`

- [ ] **Step 1: Refactor `SaltNexus.tsx`**

Apply the triage rule. Key points:
- "Salt" h1 color `'rgba(232,232,240,0.97)'` → `'var(--foreground)'`
- "Nexus" pulse color `'oklch(0.88 0.2 145)'` — LEAVE (green brand)
- "Nexus" textShadow keyframes `'oklch(0.6 0.25 145 / 0.35)'` / `'oklch(0.65 0.28 145 / 0.7)'` — LEAVE (brand glow)
- Body text → `'var(--foreground)'` / `'var(--muted-foreground)'`
- Section dividers → token-driven via `.section-divider` class.
- Card borders / backgrounds → triage rule.

- [ ] **Step 2: Refactor `ZoomableImage.tsx`** — add a light-mode frame

Open `client/src/components/ZoomableImage.tsx`. At the top, add:

```tsx
import { useTheme } from "next-themes";
```

Inside the component body, after existing hooks:

```tsx
const { resolvedTheme } = useTheme();
const isLight = resolvedTheme === "light";
```

Find the inline image `<img>` element. Add (or merge with existing style) these light-mode-only props:

```tsx
style={{
  ...(existing style props),
  borderRadius: 6,
  border: isLight ? "1px solid var(--border)" : undefined,
  boxShadow: isLight ? "0 4px 16px rgba(0,0,0,0.08)" : undefined,
}}
```

(If the file already wraps the img in a container `<div>`, apply the styles to the container instead.)

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/SaltNexus.tsx client/src/components/ZoomableImage.tsx
git commit -m "Tokenize SaltNexus + light-mode frame on ZoomableImage"
```

---

## Task 10: WebGL + visual edges — MagicRingsButton + BorderGlow defaults

**Files:**
- Modify: `client/src/components/MagicRingsButton.tsx`
- Modify: `client/src/components/BorderGlow.tsx`

- [ ] **Step 1: Refactor `MagicRingsButton.tsx`** — theme-aware ring colors

At the top, add:

```tsx
import { useTheme } from "next-themes";
```

Inside the component, after existing hooks:

```tsx
const { resolvedTheme } = useTheme();
const ringColors =
  resolvedTheme === "light"
    ? { ringA: "#a855f7", ringB: "#0ea5e9" }
    : { ringA: "#fc42ff", ringB: "#42fcff" };
```

Pass to the existing `<MagicRings>` invocation: locate the props it currently receives (the magenta + cyan defaults) and pass `colorA={ringColors.ringA} colorB={ringColors.ringB}` (or whichever prop names the existing `MagicRings` component already accepts — keep the same names).

If `MagicRings` doesn't expose color props yet, add them: open `client/src/components/MagicRings.tsx`, find the hardcoded `'#fc42ff'` / `'#42fcff'`, add `colorA?: string; colorB?: string;` to its props interface, default to those hexes, and use the prop values in the shader uniforms.

- [ ] **Step 2: Refactor `BorderGlow.tsx`** — change default `backgroundColor`

Find the prop default: `backgroundColor = "#120F17"`. Change to:

```tsx
backgroundColor = "var(--card)",
```

Internal uses of `backgroundColor` inside the component (the mesh-gradient cover layer) already reference the prop, so no further changes needed.

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/MagicRingsButton.tsx client/src/components/MagicRings.tsx client/src/components/BorderGlow.tsx
git commit -m "Theme-aware ring colors + BorderGlow card default"
```

---

## Task 11: End-to-end manual QA pass

**Files:** none (manual verification).

- [ ] **Step 1: Reset workshop state for clean testing**

Via Supabase MCP:

```sql
truncate public.answer_attempts, public.question_progress, public.challenge_attempts, public.hint_usage;
update public.workshop_config set opened_at = now(), challenge_open = true where id = 1;
```

- [ ] **Step 2: Run the dev server**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
sleep 5
open http://localhost:3000/
```

- [ ] **Step 3: Walk every route in DARK mode (baseline — should look identical to today)**

For each route below, navigate to it and confirm visual parity with the pre-refactor dark theme:
- `/`
- `/scenario/1`
- `/scenario/2`
- `/scenario/3`
- `/challenge/1` (register first, then begin)
- `/challenge/2`
- `/completed`
- `/leaderboard`
- `/salt-nexus`

Note any regressions. If anything looks "off" vs. the pre-refactor look, capture the screenshot and diff against the original. The token swap should be visually a no-op in dark mode.

- [ ] **Step 4: Toggle to LIGHT mode and walk every route again**

Click the ThemeToggle (top-right of navbar). For each route, confirm:
- Body bg is the off-white `oklch(0.97 0.005 285)`.
- Text is dark and readable (WCAG AA contrast).
- BorderGlow effects still glow (purple/green/yellow accents).
- Hint bulb visible on unsolved cards.
- Step screenshots have a subtle frame.
- Static purple radial gradient is visible behind content (no shader video).

Use DevTools Accessibility panel's contrast checker on body text + headings on each route.

- [ ] **Step 5: Toggle interactive surfaces in both modes**

- Open a hint modal in light mode — confirm darker amber palette renders, modal text readable, last-hint red warning visible.
- Force time-up via DB: `update workshop_config set opened_at = now() - interval '36 minutes' where id = 1;`. Confirm time-up overlay backdrop + red glow render in light mode.
- Trigger the completion-card spinning BorderGlow on `/completed` in light mode — confirm halo is visible outside the card, no inward bleed.

- [ ] **Step 6: Refresh test — FOUC prevention**

In light mode, refresh the page. Confirm no dark flash before light renders. Then toggle to dark and refresh — same check.

- [ ] **Step 7: Multi-tab convergence test**

Open the site in two browser windows. Toggle one to light. The other window should remain on its previous theme (next-themes does NOT propagate `storage` events to other tabs by default unless `enableSystem={true}` is set; for v1 this is acceptable). Confirm there are no console errors.

- [ ] **Step 8: Stop the dev server**

```bash
kill %1 2>/dev/null || lsof -i:3000 -t | xargs kill 2>/dev/null
```

- [ ] **Step 9: Final commit / push**

```bash
git status
# If there are no further changes, no commit needed.
git push origin main
```

If QA flagged regressions in any earlier task, fix them in a new commit before pushing.

---

## Self-review notes

**Spec coverage:**
- Theme engine + provider config — Task 2 ✓
- `:root.light` token block — Task 1 ✓
- Brand-accent variables — Task 1 ✓
- Body bg/color removal — Task 1 ✓
- `ThemeToggle` component + placement — Task 2 + Task 3 (step 5) ✓
- Conditional shader render — Task 3 (step 2) ✓
- Per-file token refactor — Tasks 4–9 ✓
- HintModal palette via `useTheme()` — Task 5 (step 1) ✓
- ZoomableImage light-mode frame — Task 9 (step 2) ✓
- MagicRings theme-aware colors — Task 10 (step 1) ✓
- BorderGlow default backgroundColor — Task 10 (step 2) ✓
- QA matrix (every route × every theme) — Task 11 ✓
- FOUC prevention test — Task 11 (step 6) ✓

**Type consistency check:**
- `resolvedTheme === "light"` / `"dark"` used consistently across all 4 components that call `useTheme()` (ThemeToggle, HintModal, MagicRingsButton, ZoomableImage). ✓
- `var(--color-accent-text)`, `var(--color-time-up)`, `var(--color-hint-bulb)` etc. all defined in Task 1 and referenced consistently in later tasks. ✓
- Same variable names used in Triage table and per-file step instructions. ✓

**No placeholders:** the only "apply the triage rule" instructions reference the explicit table at the top of this document. Every step has concrete commands or code. No "TBD" / "handle edge cases" / "similar to Task N" deferrals.
