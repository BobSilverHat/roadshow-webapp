# Salt Security Landing Page — Design Brainstorm

## Context
Faithful recreation of the CrowdStrike Falcon Workshop landing page, adapted for Salt Security.
Color swap: red → purple. Logo swap: CrowdStrike → Salt Security.

---

<response>
<probability>0.07</probability>
<idea>

**Design Movement:** Cyber-Noir / Dark Ops Terminal

**Core Principles:**
1. Deep darkness as canvas — near-black base with purple radial glow as the only light source
2. Military-grade typography — condensed, uppercase, high-contrast
3. Information hierarchy through color temperature — white for neutral, purple for critical
4. Structural asymmetry — fixed sidebar anchors the user while content breathes

**Color Philosophy:**
- Background: `oklch(0.06 0.01 285)` → `oklch(0.02 0 0)` radial gradient (purple-tinted black to pure black)
- Accent: `oklch(0.55 0.28 290)` — electric violet, Salt Security brand purple
- Body text: `oklch(0.82 0.01 285)` — cool near-white
- Muted text: `oklch(0.55 0.01 285)` — mid-gray
- Inline accent links: `oklch(0.65 0.22 290)` — slightly lighter purple for readability

**Layout Paradigm:**
- Fixed top navbar (70px) with logo left, workshop title right
- Fixed left sidebar (200px) with vertical nav
- Centered content column (max 680px) with generous vertical rhythm
- Full-width CTA section at bottom with purple gradient button

**Signature Elements:**
1. Radial purple glow from top-center of hero — `radial-gradient(ellipse at 50% 0%, oklch(0.25 0.15 290) 0%, transparent 60%)`
2. Small diamond bullet `◆` in accent color before section labels and sidebar items
3. Split-color hero headline: white line + full accent-color line below

**Interaction Philosophy:**
- Sidebar nav items highlight on hover with accent color
- Smooth scroll to sections
- CTA button has subtle glow pulse animation

**Animation:**
- Hero text: fade-up entrance (staggered, 0.1s delay between lines)
- Content sections: fade-in on scroll (Framer Motion viewport trigger)
- Sidebar active state: accent dot pulses
- Background glow: very slow breathing pulse (opacity 0.7 → 1, 4s loop)

**Typography System:**
- Display/Hero: `Barlow Condensed` — bold, all-caps, tight tracking
- Body: `Inter` — clean, readable, 400/300 weight
- Labels: `Barlow Condensed` — small caps, wide letter-spacing (0.15em)
- Font sizes: hero 56px / section label 11px / body 16px / CTA heading 48px

</idea>
</response>

<response>
<probability>0.05</probability>
<idea>

**Design Movement:** Brutalist Security Dashboard

**Core Principles:**
1. Raw grid structure — no softness, everything is on a strict baseline
2. Monospace code aesthetic mixed with display type
3. Purple as a warning signal, not decoration
4. Dense information layout that communicates authority

**Color Philosophy:**
- Background: flat `#0a0a0f` with subtle scanline texture
- Accent: `#9333ea` — vivid purple
- Secondary accent: `#4ade80` — terminal green for status indicators
- Text: pure `#f0f0f0`

**Layout Paradigm:**
- Left sidebar with border-right rule
- Content in strict 12-column grid
- Section dividers are full-width 1px purple lines

**Signature Elements:**
1. Scanline CSS overlay texture
2. Blinking cursor after section headings
3. Monospace labels with `>` prefix

**Interaction Philosophy:**
- Hover states reveal border highlights
- Keyboard-navigable sidebar

**Animation:**
- Typewriter effect on hero headline
- Cursor blink on section labels

**Typography System:**
- Display: `JetBrains Mono` — monospace, bold
- Body: `JetBrains Mono` — monospace, regular
- All text: monospace throughout

</idea>
</response>

<response>
<probability>0.06</probability>
<idea>

**Design Movement:** Glassmorphic Void

**Core Principles:**
1. Frosted glass panels floating over deep space background
2. Purple nebula-like gradient background with particle noise
3. Layered depth through blur and opacity
4. Soft but precise typography

**Color Philosophy:**
- Background: deep space gradient with purple nebula clouds
- Glass panels: `rgba(255,255,255,0.04)` with `backdrop-blur`
- Accent: `#a855f7` — medium purple
- Text: white with varying opacity

**Layout Paradigm:**
- Glass card sidebar
- Glass card content area
- Floating navbar with blur background

**Signature Elements:**
1. Glass morphism panels with purple border glow
2. Particle/star field background
3. Purple aurora gradient blobs

**Interaction Philosophy:**
- Glass panels lift on hover
- Smooth parallax scrolling

**Animation:**
- Floating animation on glass cards
- Aurora gradient slow movement

**Typography System:**
- Display: `Sora` — geometric, modern
- Body: `Sora` — light weight
- Clean, rounded aesthetic

</idea>
</response>

---

## Chosen Approach: **Cyber-Noir / Dark Ops Terminal** (Response 1)

This most faithfully replicates the CrowdStrike original's aesthetic while adapting it to Salt Security's purple brand identity. The fixed sidebar, radial glow, split-color hero headline, and diamond bullet motifs are all direct translations of the source design.
