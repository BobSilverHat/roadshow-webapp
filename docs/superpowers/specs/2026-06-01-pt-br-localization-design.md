# Brazilian Portuguese (pt-BR) Localization — Design Spec

**Date:** 2026-06-01
**Status:** Approved for implementation planning
**Owner:** Brandon

## Summary

Add Brazilian Portuguese (`pt-BR`) localization to the Salt × Guidepoint roadshow web app, across both the static UI narrative and the CTF challenge content. The mechanism is **react-i18next** for frontend copy (lazy-loaded locale files served from the existing CloudFront origin) plus **translated columns** on the 12 CTF rows in Supabase, surfaced through the existing view/RPCs. Attendees switch language with a navbar EN⇄PT toggle; the per-event default comes from `workshop_config`, so **one bilingual build serves every roadshow stop**. CTF answers and product screenshots stay English by design — they mirror the English Salt platform attendees navigate.

## Goals

1. Every string an attendee reads **in our app** is available in pt-BR: scenarios, home, completed, Salt Nexus, leaderboard, navbar/sidebar, challenge intro/header/cards, and the CTF question prompts/hints/titles.
2. A navbar toggle switches language live (no reload); choice persists in `localStorage`; the default is configurable per event via `workshop_config.default_locale`.
3. The English experience is **byte-identical to today** after string extraction — translation lands as additive resource files, never by editing English output.
4. CTF answer matching is **completely untouched**: answers, normalization, and hashing stay as-is (answers are English, found in the English Salt platform).
5. Deployable on the existing S3 + CloudFront pipeline (`scripts/deploy.sh`) with near-zero risk to a running English workshop.

## Non-Goals

- Translating CTF **answers** (they are English identifiers read from the English Salt platform).
- Recreating **screenshots** in Portuguese (every step image is the English Salt UI; the live platform `salt-labs.secured-api.com` is English).
- Localizing the Salt platform itself (out of our control).
- URL-based locale routing / `hreflang` / per-language SEO (see Industry Alignment — deliberately omitted for a gated, non-indexed app).
- Any language beyond pt-BR. The architecture allows adding more later, but YAGNI now.
- A translation-management system (Crowdin/Phrase/Lokalise). Repo-committed JSON is proportionate for one reviewed language.

## Industry Alignment (rationale, validated against current practice)

| Pillar | Our choice | Industry verdict |
|---|---|---|
| Library | react-i18next | The de-facto React standard (largest ecosystem, ~6.3M weekly i18next downloads). Aligned. |
| File org | namespaces per page | Best practice (e.g. Bluesky splits each language into separate files). Aligned. |
| Loading | lazy-load locales from CDN | Matches scale practice; for our small size it's a cheap, future-proof win over bundling both. |
| Switch UX | toggle + localStorage + config default, **no URL prefix** | Conscious divergence: URL-prefix/`hreflang` exists for SEO + bookmarkability, which a gated, single-session, non-indexed app does not have. If this ever became a public marketing surface, URL routing would become mandatory. |
| DB content | translated columns (12 rows, 2 fixed locales) | "Ideal for smaller apps with fixed locales." A `translations` table is the documented upgrade path if locales grow. |
| Tooling | repo JSON, no TMS | Proportionate for one reviewed language; TMS is the upgrade path if localization becomes ongoing. |

## Architecture

### Frontend i18n core

- Add `i18next`, `react-i18next`, `i18next-http-backend` (lazy load), and `i18next-browser-languagedetector` (for the `localStorage` order).
- New `client/src/i18n/index.ts` initializes i18next once, imported at the top of `main.tsx`. Config:
  - `fallbackLng: 'en'` — a missing pt-BR key renders English, never blank.
  - `supportedLngs: ['en', 'pt-BR']`, `load: 'currentOnly'` (prevents a spurious `/locales/pt/*.json` 404 from the region→base-language fallback).
  - `ns`: one namespace per page + a `common` namespace; `defaultNS: 'common'`.
  - Backend loadPath `/locales/{{lng}}/{{ns}}.json` (static assets on the CDN — see Loading).
  - `interpolation` for live values (`{{count}}`, `{{rank}}`, timer, gap counts) and i18next plural keys for count-bearing copy.
  - Detection order: `['localStorage']` only (we drive the default ourselves — see Language resolution). No `navigator`/`path`/`subdomain`.
- Components consume strings via `useTranslation('namespace')` → `t('key')`.

### Locale resource files (lazy-loaded from the CDN)

- Files live at `client/public/locales/{lng}/{ns}.json` so Vite copies them to `dist/public/locales/...` and they ship as static assets from the same S3 origin. `i18next-http-backend` fetches them on demand: a session in English never downloads `pt-BR/*`, and vice versa.
- Namespaces (one file each, per language): `common`, `home`, `scenario1`, `scenario2`, `scenario3`, `completed`, `saltNexus`, `leaderboard`, `challenge` (intro/header/card/waiting copy).
- **CloudFront caching:** `client/public/locales/*` is not hash-versioned by Vite, so `scripts/deploy.sh` must add `/locales/*` to the CloudFront invalidation paths alongside `/` and `/index.html`.

### Language resolution & switching

- A `LanguageToggle` component in the navbar (`WorkshopLayout`), styled to the cyber-noir system (Barlow Condensed label, e.g. `EN / PT`).
- Initial language resolution (instant paint, no blocking network call):
  1. `localStorage` value if present → use it synchronously.
  2. Else default to `'en'` synchronously for first paint, then asynchronously read `workshop_config.default_locale`; if it differs and the user has no stored preference, switch once. (Known trade-off: a brief en→pt flash on a first-ever visit when the event default is pt and the user hasn't toggled. See Open Questions for the no-flash alternative.)
- Toggling: calls `i18n.changeLanguage(lng)`, persists to `localStorage`, re-renders live (react-i18next subscription) — no reload.
- One bilingual build; `default_locale` is flipped per event in SQL (same operator pattern as the gate flags), e.g. `update workshop_config set default_locale = 'pt-BR' where id = 1;`.

### String extraction

- Mechanical pass over the 10 pages + components. Each user-facing literal becomes `t('ns:key')`. Inline `style={}` objects are untouched — only text moves.
- **Invariant:** with `lng = 'en'`, rendered output is byte-identical to today. The `en/*.json` files are populated from the current literals, so extraction is independently shippable with zero visual change before any pt-BR copy exists.
- A **frozen-terms glossary** (`client/src/i18n/glossary.md`) lists Salt product/UI nouns that stay English inside Portuguese sentences so attendees can still match them against the platform: `MCP`, `Posture Gaps`, `Risk Score`, `Capabilities`, `Insight Layers`, `Large Language Model`, `Prompt Injection`, `Parameter Tampering`, `Broken User Authentication`, endpoint strings (`POST /agent/chat`, `/mcp/tools/list`, etc.), and tool names (`stripe.orders.get`, `plaid.identity.verify`, …).

### DB translation layer (migration `033_pt_translations.sql`)

- `challenges`: add nullable `title_pt text`, `subtitle_pt text`.
- `questions`: add nullable `prompt_pt text`, `hints_pt text[]`. Constraint/convention: when `hints_pt` is non-null its cardinality must equal `hints` (same hint count both languages; `hint_count` continues to derive from English `hints`).
- Recreate `questions_public` to also expose `prompt_pt`, `hints_pt` (alongside existing `id, challenge_id, order_idx, prompt, hint_count`).
- `request_hint`: drop the 2-arg form and recreate as `request_hint(p_question_id uuid, p_hint_idx int, p_locale text default 'en')`. When `p_locale = 'pt-BR'` and `hints_pt[idx]` is non-null, return the pt hint; else return the English hint. Penalty/`hint_usage` ledger logic is unchanged. Existing 2-arg client calls resolve via the default.
- **`submit_answer`, `answer_hash`, `normalize_answer`, and all answer logic are untouched.**

### Client DB wiring

- `useChallenge`: `fetchMeta` selects `title_pt, subtitle_pt`; `fetchQuestions` selects `prompt_pt, hints_pt`. A small `pick(locale, en, pt)` helper returns pt when locale is `pt-BR` and the pt field is non-null, else en (per-field fallback). The current language comes from `i18n.language`.
- `useHints`: pass `p_locale: i18n.language` to `request_hint`.
- No change to `submit`/answer flow.

### Fonts & layout (risk gates — done first)

- **Glyph-test gate (blocking, before any copy work):** inspect the cmap of `Casta-Thin.otf` / `Casta-ThinSlanted.otf` (navbar/sidebar) and `NostalgicWhispers-Regular.ttf` (all H1/H2) for `ã â á à ç é ê í ó ô õ ú`. For any face missing them, choose per-face: (a) swap to Barlow Condensed for pt headings, (b) accept browser fallback for accented glyphs only, or (c) source a glyph-complete display face. Body (IBM Plex Mono) and labels (Barlow Condensed) are Google Fonts with full pt coverage — safe.
- **Text-expansion QA pass:** pt runs ~15–30% longer. Review tight spots after translation — sidebar nav labels, uppercase Barlow section labels, the `Begin Workshop`→`Iniciar Workshop` button, timer/penalty pills, leaderboard column headers. Mitigations are CSS tweaks, not architecture.

## Data model changes (migration `033_pt_translations.sql`)

```sql
alter table public.challenges
  add column if not exists title_pt    text,
  add column if not exists subtitle_pt text;

alter table public.questions
  add column if not exists prompt_pt text,
  add column if not exists hints_pt  text[];

-- questions_public: expose pt fields (recreate view)
create or replace view public.questions_public as
  select id, challenge_id, order_idx,
         prompt, prompt_pt,
         cardinality(hints) as hint_count,
         hints_pt
  from public.questions;
grant select on public.questions_public to anon, authenticated;

-- request_hint: locale-aware (drop 2-arg, recreate 3-arg with default)
drop function if exists public.request_hint(uuid, int);
create function public.request_hint(
  p_question_id uuid, p_hint_idx int, p_locale text default 'en'
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
  -- identical to current body, except hint text resolves as:
  --   v_hint_text := case
  --     when p_locale = 'pt-BR' and v_hints_pt[p_hint_idx + 1] is not null
  --       then v_hints_pt[p_hint_idx + 1]
  --     else v_hints[p_hint_idx + 1] end;
  -- penalty / hint_usage insert / gates unchanged.
$$;
revoke execute on function public.request_hint(uuid, int, text) from public, anon;
grant  execute on function public.request_hint(uuid, int, text) to authenticated;
```

`workshop_config`:

```sql
alter table public.workshop_config
  add column if not exists default_locale text not null default 'en';
```

All changes additive and nullable/defaulted → the English path is unaffected; no backfill required.

## Rollout & live-event safety

Build order (each step independently safe):

1. **Glyph test** (blocking gate) — resolve the Casta / Nostalgic Whispers question before investing in copy.
2. **i18n scaffolding + extraction**, English-only. Output byte-identical to today; deployable on its own.
3. **Draft pt-BR** resource files + glossary (Brandon drafts), keeping frozen terms English.
4. **Native-speaker review** of pt-BR copy (technical terms + voice).
5. **DB migration 033** — additive/nullable; seed `*_pt` columns for the 12 CTF rows.
6. **Text-expansion QA pass** at `lng = pt-BR`.
7. **Deploy outside a live workshop** via `scripts/deploy.sh` (after adding `/locales/*` to its CloudFront invalidation). `default_locale` stays `en` globally; flip to `pt-BR` only for the Brazil stop.

Because the en path is byte-identical and all DB columns are nullable/defaulted, risk to a running English workshop is near-zero. We will not deploy mid-workshop.

## File-level change summary

**New:**
- `client/src/i18n/index.ts` (i18next init)
- `client/src/i18n/glossary.md` (frozen terms)
- `client/src/components/LanguageToggle.tsx`
- `client/public/locales/{en,pt-BR}/{common,home,scenario1,scenario2,scenario3,completed,saltNexus,leaderboard,challenge}.json`
- `supabase/migrations/033_pt_translations.sql`

**Modified:**
- `client/src/main.tsx` — import i18n init.
- All 10 pages + `WorkshopLayout`, `ChallengeIntro`, `ChallengeHeader`, `QuestionCard`, `WaitingOverlay` — strings → `t()`.
- `client/src/hooks/useChallenge.ts`, `client/src/hooks/useHints.ts` — select/pass pt fields + locale.
- `client/src/hooks/useWorkshopClock.ts` (or a small config read) — expose `default_locale`.
- `scripts/deploy.sh` — add `/locales/*` to the invalidation paths.
- `package.json` — add i18next deps.

**Unchanged (confirm):** `submit_answer`, `answer_hash`, `normalize_answer`, leaderboard view/RPC, gate/timer logic.

## Verification checklist (manual; no test suite in repo)

**Extraction (en parity)**
- [ ] With `lng = 'en'`, every page renders identically to pre-change (spot-check all 10 pages + challenge flow).
- [ ] `pnpm check` passes; `pnpm build` clean.

**Switching**
- [ ] Navbar toggle flips EN⇄PT live with no reload; choice persists across refresh (localStorage).
- [ ] With no stored preference and `default_locale='pt-BR'`, a fresh load resolves to pt-BR.
- [ ] Missing pt-BR key renders the English string, never blank.

**CTF content**
- [ ] In pt-BR, question prompts/hints/titles render Portuguese; frozen terms stay English.
- [ ] `request_hint` returns pt hint text in pt-BR, English when `hints_pt` is null; penalty still +60s; `hint_usage` ledger unchanged.
- [ ] Answers submit and match **identically** in both languages (English answers).

**Fonts & layout**
- [ ] Accented characters (ã ç õ â ê) render in the correct typeface in headings + nav (or the agreed fallback).
- [ ] No overflow/clipping at pt-BR on sidebar, section labels, buttons, pills, leaderboard headers.

**Lazy loading**
- [ ] English session network shows no `pt-BR/*.json` fetch; toggling to PT fetches them on demand.
- [ ] After a translation edit + deploy, `/locales/*` invalidation serves the new copy.

## Open questions for implementation

- **First-paint flash:** config-driven default can cause a brief en→pt flash on first-ever visit (no stored pref). Accept it, or eliminate by also honoring a build-time `VITE_DEFAULT_LOCALE` (no flash, but a per-event rebuild)? Default plan: accept the flash; revisit if the native reviewer finds it jarring.
- **Glyph-test outcome** decides whether pt headings keep Nostalgic Whispers/Casta or fall back to Barlow Condensed — resolved in step 1, folded into the plan.
