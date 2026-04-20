# HANDOFF.md — Salt × Guidepoint Agentic AI Security Workshop

> Handoff document for the next Claude instance. Read **`CLAUDE.md`** first
> for the baseline repo architecture (commands, aliases, Vite quirks).
> This file captures everything built on top of that baseline, design
> decisions made along the way, the user's working style, and open items.

---

## What this project is

A **single-page React workshop application** co-branded Salt Security ×
GuidePoint Security. It's presented at roadshow events and used by workshop
attendees on their own laptops. Each attendee walks three scenarios that
mirror Salt's product surface:

1. **Agentic Discovery** — inventory, graph, MCP side-drawer, per-tool risk
2. **Posture Management** — gap dashboard, filtering, gap drawer,
   API investigation, attacker correlation
3. **Runtime Protection** — runtime feed, anomaly detection, correlation,
   internal traffic, automated response

Each scenario is authored as **Overview → Step 01 – 05 → Summary → Next**,
all on a single scrollable page, with the sidebar acting as an in-page
table-of-contents via scroll-spy.

---

## Current build state at last commit

- **Scenario 1** — fully authored with real screenshots (8 product-UI
  screenshots in `client/public/steps/scenario1/`). Copy is polished.
- **Scenario 2** — fully authored with real screenshots (13 screenshots in
  `client/public/steps/scenario2/`). Copy is polished, agentic/MCP-focused.
- **Scenario 3** — scaffolded with placeholder step content. Real copy and
  screenshots pending from the user. Placeholder divs render a dashed-border
  "Screenshot Pending" box.
- **Introduction (Home)** — hero + overview, CTA to open the Salt platform
  at `https://salt-labs.secured-api.com` in a new tab.
- **Completed** — untouched from the initial scaffold.

---

## Architecture beyond `CLAUDE.md`

### New shared components (not in the original scaffold)

| File | What it does |
|---|---|
| `client/src/components/StepSection.tsx` | Renders one step (divider, `STEP / 0X` label, heading, body). Stamps `id` + `data-step-id` for scroll-spy. |
| `client/src/components/EvervaultCard.tsx` | Aceternity-style hover-reveal card used for the "Key Objectives" box on every scenario overview. Cyber-noir-themed: purple reveal + hex/binary glyphs + CAD corner brackets. |
| `client/src/components/ZoomableImage.tsx` | Click-to-zoom for step screenshots. Framer-motion spring animation; backdrop confined to main-content area (doesn't overlap navbar/sidebar). |
| `client/src/components/MagicRingsButton.tsx` | (Pre-existing) Circle-arrow "Next" button with a WebGL ring animation behind it. Uses a soft radial mask to feather the square canvas edges. |
| `client/src/components/MagicRings.tsx` | (Pre-existing) The Three.js shader that renders the rings. |

### Sidebar scroll-spy

`WorkshopLayout.tsx` hosts a hierarchical nav: each scenario expands to
`Overview → Step / 01–05 → Summary` when that scenario is the active page.
A scroll listener finds the section whose `offsetTop - 120px` has crossed
the scroll position and sets `activeStepId`, which drives the bright/dim
styling of sub-items.

Clicking a sub-item calls `handleSubItemClick(id)` which smooth-scrolls
to `document.getElementById(id).offsetTop - 90`.

### Layout CSS variables

`WorkshopLayout.tsx` exposes layout dimensions as CSS custom properties on
its root div so descendants (specifically `ZoomableImage`) can inset
correctly:

```js
['--sidebar-width' as string]: `${sidebarWidth}px`,  // dynamic, tracks × mark
['--navbar-height' as string]: '70px',
```

`ZoomableImage`'s backdrop uses `top: var(--navbar-height, 70px)` and
`left: var(--sidebar-width, 200px)` so the zoom overlay only covers the
main-content area, leaving the navbar + sidebar fully visible.

### Sidebar-width measurement trick

The sidebar's **right edge aligns vertically with the `×` between the Salt
and Guidepoint logos in the navbar**. This isn't hardcoded — a `useRef` on
the `×` span measures its x-center in the DOM via `getBoundingClientRect()`
and sets `sidebarWidth` state, which propagates to the aside's `width` and
the main's `marginLeft`. Re-measured on resize AND after logo images load
(since logos are `width: auto`, the × shifts after image decode).

### Background video

The page background is a looping WebM shader at
`client/public/shader-bg.webm` (~3.8 MB). Renders as a fixed `<video>` at
`z-index: 0`. Stacked over it:

1. **Purple tint** — radial gradient at the bottom-left, `mix-blend-mode: color`. Shifts the blue shader highlights toward violet while preserving black pixels.
2. **Noise overlay** — SVG fractal noise at 2.5% opacity (`.noise-overlay` in `index.css`).
3. **Linear dark gradient** — top-to-bottom `rgba(10,10,15, 0.68 → 0.78 → 0.92)`. Dims content for readability.
4. Navbar, sidebar, and main content stack above.

---

## Design system (the important details)

### Typography stack

| Role | Font | Source | Notes |
|---|---|---|---|
| Headings (H1, H2) | **Nostalgic Whispers** | Self-hosted `/fonts/NostalgicWhispers-Regular.ttf` | Decorative display face, 1920s cinema vibe. Used with `textTransform: uppercase` + `fontWeight: 800`. The H2 subtitle "In the Action." uses `fontStyle: italic` (synthesized since only Regular ships). |
| Navbar + Sidebar | **Casta** | Self-hosted `/fonts/Casta-Thin.otf` + `Casta-ThinSlanted.otf` | Only Thin ships; registered with `font-weight: 100 900` so the browser never synthesizes fake-bold when inline styles request higher weights. |
| Body copy | **IBM Plex Mono** | Google Fonts | Cyber-noir / terminal feel. Replaced the original Inter. Size `0.875rem`, line-height `1.65`, weight `300`. |
| Secondary/labels | **Barlow Condensed** | Google Fonts | Section labels, step labels, small badges. |
| Inter | Google Fonts | Still imported as a legacy fallback; not actively used. |

All font files live under `client/public/fonts/`. `@font-face` declarations
are at the top of `client/src/index.css`.

### Color palette

- Base bg: `#0a0a0f` (near-black with faint blue)
- Brand purple tokens in `index.css`:
  - `--color-salt-purple: oklch(0.52 0.28 290)`
  - `--color-salt-purple-light: oklch(0.65 0.22 290)`
  - `--color-salt-purple-dim: oklch(0.38 0.18 290)`
- Heading white: `rgba(232,232,240,0.97)`
- Body text: `rgba(200,200,220,0.85)`
- Purple H1/H2 accent spans: `oklch(0.72 0.28 290)` with a matching purple
  `textShadow` glow.

### Key utility classes (`client/src/index.css`)

- `.section-label` — purple Barlow-condensed uppercase label
- `.accent-link` — inline emphasis inside body copy. **Purple, weight 600,
  no underline.** The user iterated back and forth on color (tried white,
  reverted to purple).
- `.section-divider` — 1px hairline `<hr>` at 8% white
- `.btn-salt-primary` — purple glow button (used on Home CTA)
- `.noise-overlay` — the fractal noise backdrop
- `.diamond-bullet` — `◆` bullet styling

### The EvervaultCard hover effect (Key Objectives card on each scenario)

Three layered visuals, mouse-tracked via `useMotionValue` +
`useMotionTemplate`:

1. **Purple gradient tint** — revealed only inside a 260 px radial mask
   centered on the cursor. Dim-ish alphas (`0.5 / 0.3`) so it's a whisper,
   not a floodlight.
2. **Random hex glyphs** — `0123456789abcdef/_-<>{}[]=+*`, 3500 chars,
   overlay-blended, same cursor mask, capped at 60% opacity. Regenerate on
   ~15% of mousemove frames (throttled by `requestAnimationFrame`) so they
   shimmer under the cursor without re-rendering every event.
3. **Card content** — `z-index: 10`, on hover gets `filter:
   brightness(1.25) saturate(1.1)` + `text-shadow: 0 0 14px rgba(10,10,15,0.9),
   0 1px 3px rgba(10,10,15,0.75)` so text stays punchy against the reveal.

Frame styling: no full 4-sided border. **Top + bottom purple hairline rails
only**, with **white-gray L-corner brackets at all four corners** (flush at
`top/bottom: 0, left/right: 0`, sized 12×12 px, 1 px arms). Matches a
CAD-drawing reference the user provided.

Key bug to remember: `onMouseEnter` must also set `mouseX/Y` from the event
(not just `onMouseMove`). Otherwise, when a user hovers the card without
moving, the mask stays at `(0, 0)` and the reveal appears stuck at the
top-left. Already fixed in `setCoordsFromEvent(event)` called from both
handlers.

### MagicRingsButton (bottom of each scenario page)

- 180 px square container with WebGL rings behind a 64 px circular arrow
  button.
- Shader canvas is square but the rings dissolve smoothly because of a
  `mask-image: radial-gradient(circle closest-side, ...)` on the canvas
  wrapper. The `closest-side` sizing was the key — it guarantees the mask
  reaches full transparency at the midpoint of each canvas edge, so no
  rectangular crop is ever visible.
- An ambient purple radial glow `div` sits behind the rings (below the
  mask) to replace the luminance lost to the mask and keep the button
  reading as a "light source."

### Casta on single-weight quirk

Casta ships only in Thin. We register `font-weight: 100 900` on the
`@font-face` so any `fontWeight: 800` in inline styles resolves to this
file at its native Thin weight — otherwise the browser synthesizes an ugly
fake-bold by doubling strokes.

---

## Voice / copywriting conventions

Established through many rounds of user edits:

- **Short, declarative sentences.** Em-dashes for emphasis. No marketing
  filler. Think "dark ops briefing" not "white paper intro."
- **Agentic / MCP-focused vocabulary.** Prefer "MCPs, tools, capabilities,
  agents" over generic "APIs, endpoints, services." The user explicitly
  rewrote my first drafts to be more MCP-centric.
- **Active voice, concrete verbs.** "Map every agent..." not "Visibility
  is provided for...". "Block compromised agents..." not "Unauthorized
  access can be prevented...".
- **Key Objectives lists:** **three bullets max.** User trimmed from four
  explicitly. Each bullet is a concrete capability that maps to a specific
  step, not a generic value proposition.
- **Scenario summaries** lean on a punchy closing line (e.g. "From 480
  gaps to a named adversary.", "End-to-end visibility, established.",
  "Attacks, stopped at machine speed.").

---

## User preferences / working style

- **Moves fast, iterates rapidly.** Don't over-plan — implement and
  demonstrate, accept that many things will be tweaked or reverted.
- **Prefers targeted edits over full rewrites.** When a file has been
  edited, the system surfaces the latest version; respect that state.
- **Comfortable reverting.** If something doesn't work, say "revert" or
  "undo that" and be ready to restore the prior state cleanly.
- **Visual taste:** cyber-noir / dark-ops / CAD / terminal aesthetic. Dim
  backgrounds, sharp corners, hairline lines, purple accents, decorative
  serif headlines against mono body copy.
- **Hates:** bloat, rounded corners where sharp would fit better, things
  clipping into layout chrome, text that's hard to read under effects,
  "Silicon Valley SaaS" voice.
- **Loves:** single-line bullets that punch, shaders, honest previews of
  what's happening ("here's why I'm doing this, here's the tradeoff").

### Guidelines the user has given explicitly (see `CLAUDE.md` user
preferences)

- Identify root causes, don't apply bandaids.
- Don't oversell the work — be honest about what was done and what wasn't.
- Don't commit without being asked.

---

## Key file map

```
client/
├── index.html                               # Google Fonts link (Barlow Condensed + IBM Plex Mono + Inter + Libre Caslon Display)
├── public/
│   ├── fonts/                               # Self-hosted Casta + Nostalgic Whispers
│   ├── shader-bg.webm                       # Background shader video (3.8 MB)
│   ├── guidepoint-logo.png                  # Co-brand logo, background-removed
│   └── steps/
│       ├── scenario1/                       # 8 product-UI screenshots
│       └── scenario2/                       # 13 product-UI screenshots
└── src/
    ├── index.css                            # @font-face, :root tokens, utility classes
    ├── App.tsx                              # wouter routes
    ├── components/
    │   ├── WorkshopLayout.tsx               # Navbar + sidebar + scroll-spy + bg video
    │   ├── StepSection.tsx                  # Single step wrapper
    │   ├── EvervaultCard.tsx                # Key Objectives hover-reveal card
    │   ├── ZoomableImage.tsx                # Click-to-zoom step screenshots
    │   ├── MagicRingsButton.tsx             # Bottom Next button
    │   └── MagicRings.tsx                   # WebGL ring shader
    └── pages/
        ├── Home.tsx                         # Introduction
        ├── Scenario1.tsx                    # Agentic Discovery (real content)
        ├── Scenario2.tsx                    # Posture Management (real content)
        ├── Scenario3.tsx                    # Runtime Protection (placeholder content)
        └── Completed.tsx                    # (untouched)
```

---

## Open / pending items the user may return to

- **Scenario 3 real content.** Needs copy + screenshots from the same
  product-UI source as scenarios 1 and 2. The structure is already in
  place (5 steps + summary).
- **Completed page polish.** Still the original scaffold.
- **"Launch Salt Platform" button** currently opens
  `https://salt-labs.secured-api.com` in a new tab. Works but is not yet
  linked to any real OAuth flow. The `client/src/const.ts` file has
  OAuth-url scaffolding that's unused.
- **Shader video file size** — 3.8 MB. Could be re-encoded at lower
  bitrate via `ffmpeg` if the user wants, though ffmpeg isn't installed
  on this machine (Python via the Windows `py` launcher is, and Pillow is
  installed in user site-packages for image work).
- **Sidebar "CONSOLE ACCESS" label** — user has mentioned it reads dated.
  I suggested alternatives like `WORKSHOP` / `NAVIGATION` / `SESSIONS`.
  The user renamed the Home-page CTA (`Salt Access` / `Launch Salt
  Platform`) but left the sidebar label as "CONSOLE ACCESS" — open to
  further change.

---

## Gotchas / non-obvious things

- **`wouter` routing** — not react-router. Patched via `patches/wouter@...`.
- **Vite root is `client/`**, not the repo root. `index.html` is at
  `client/index.html`.
- **`server/` is production-only.** Dev uses Vite directly. `server/` just
  serves static files after `pnpm build`.
- **`.claude/` and `.manus-logs/`** are local-only, now in `.gitignore`.
- **Image processing:** Pillow is installed globally via
  `C:\Users\Brandon\AppData\Local\Programs\Python\Python314`. `py` is the
  launcher command. ImageMagick and ffmpeg are **not** installed.
- **Font handles on Windows:** after extracting a TTF/OTF zip, the
  `.tmp-*` extraction folder may remain stuck with a file handle (likely
  Vite's watcher). Harmless, now gitignored.
- **Scenario page re-mounts**: navigating between scenarios via wouter
  unmounts and remounts `WorkshopLayout`, which means the background
  video restarts each time. Currently tolerated.

---

## Sanity checks before a commit

```bash
pnpm check        # TypeScript noEmit — must pass clean
```

There are **no tests** (Vitest is a devDependency but no suite exists).
There is **no lint** command. Prettier is available via `pnpm format`.

The Vite dev server at `pnpm dev` serves on port 3000 (falls back to next
if busy). Don't rely on `pnpm start` during development — that's the
production static server.
