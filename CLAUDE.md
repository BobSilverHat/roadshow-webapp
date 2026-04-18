# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (see `packageManager` field in `package.json`; a wouter patch in `patches/` is applied on install).

- `pnpm dev` — Vite dev server on port 3000 (`--host`, falls back to next port if taken). This is the only way to run the app during development; `server/index.ts` is **not** used in dev.
- `pnpm build` — Two-stage build: `vite build` emits the SPA to `dist/public`, then `esbuild` bundles `server/index.ts` to `dist/index.js` (ESM, node platform, external packages).
- `pnpm start` — Runs the built Express static server (`NODE_ENV=production node dist/index.js`). Must run `pnpm build` first.
- `pnpm check` — TypeScript type-check only (`tsc --noEmit`). There is **no lint script** and **no test script** — Vitest is listed as a devDependency but no tests or test runner config exist.
- `pnpm format` — Prettier write across the repo.

## Architecture

This is a **single-page React app** that ships as static files served by a minimal Express wrapper. The "server" has no API, no routing logic beyond SPA fallback, and no role in development — it exists only to serve `dist/public/index.html` for all routes in production (`server/index.ts:22`).

### Monorepo-ish layout with path aliases

The top-level `tsconfig.json` + `vite.config.ts` define three roots that all compile together under one `tsconfig`:

- `client/` — Vite root (`root: client/`), aliased as `@/*` → `client/src/*`
- `shared/` — Cross-boundary constants, aliased as `@shared/*`
- `server/` — Production static server, bundled separately by esbuild at build time
- `@assets` → `attached_assets/` (directory may not exist yet; alias is pre-wired)

When adding imports, prefer these aliases over relative paths.

### Client architecture

- **Routing:** `wouter` (not React Router). Routes live in `client/src/App.tsx` — Home (`/`), three scenarios (`/scenario/1..3`), `/completed`, and a NotFound catch-all. When adding a new page, register it in `App.tsx` **and** add it to `NAV_ITEMS` in `client/src/components/WorkshopLayout.tsx` so the sidebar dot navigation picks it up.
- **Shared shell:** Every workshop page wraps its content in `<WorkshopLayout activeId="...">`. The layout owns the fixed top navbar, fixed left sidebar, background, and scroll behavior. Pages should only render the inner content column (max-width ~700px, centered).
- **UI kit:** shadcn/ui "new-york" style (see `components.json`), Tailwind CSS v4 via `@tailwindcss/vite`, Radix primitives, Framer Motion for entrance animations, `sonner` for toasts. Components live under `client/src/components/ui/`.
- **Theme:** A dark-only Cyber-Noir aesthetic is baked into `client/src/index.css` and the layout. Design tokens (`--color-salt-purple*`, `--background`, etc.) are defined as OKLCH CSS variables; utilities like `.section-label`, `.diamond-bullet`, `.btn-salt-primary`, and `.accent-link` are the canonical way to get on-brand styling. Typography pair is **Barlow Condensed** (display, uppercase) + **Inter** (body), loaded from Google Fonts in `client/index.html`. Many layout styles are inline on the page components rather than Tailwind classes — match that style when editing existing pages.
- **Auth scaffolding exists but is not wired up:** `client/src/const.ts` builds an OAuth URL from `VITE_OAUTH_PORTAL_URL` and `VITE_APP_ID`, and `shared/const.ts` defines a session cookie name. No code currently calls `getLoginUrl()` or sets the cookie.

### Vite config quirks

`vite.config.ts` is not a typical SPA config — read it before changing build behavior:

1. **Manus runtime plugins are active.** `vite-plugin-manus-runtime` and a locally-defined `vitePluginManusDebugCollector` inject a debug script and expose a `POST /__manus__/logs` endpoint that writes `browserConsole.log`, `networkRequests.log`, and `sessionReplay.log` to `.manus-logs/` (1MB cap, auto-trimmed to 60%). These only run when `NODE_ENV !== 'production'`. Logs in `.manus-logs/` are safe to delete.
2. **Vite root is `client/`, not the repo root.** `index.html` lives at `client/index.html` and references `/src/main.tsx`. Build output goes to `dist/public` (not `client/dist`).
3. **`server.fs.deny: ["**/.*"]`** blocks dev-server access to any dotfile. If a new config file needs to be fetched at dev time, it must not start with a dot.
4. **Allowed hosts** include `*.manus*.computer` domains — this repo is meant to run inside the Manus sandbox as well as locally.

### Design reference

`ideas.md` documents the chosen design direction ("Cyber-Noir / Dark Ops Terminal") and the color/typography/layout decisions. When making visual changes, stay consistent with the tokens and motifs described there (radial purple glow, diamond bullets `◆`, split-color headlines, Barlow Condensed uppercase labels).
