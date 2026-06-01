# Brazilian Portuguese (pt-BR) Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Brazilian Portuguese localization across the app's UI copy and CTF content, switchable via a navbar toggle, without altering the English experience or the CTF answer logic.

**Architecture:** react-i18next with lazy-loaded locale JSON served as static assets from the existing CloudFront origin; translated `*_pt` columns on the 12 CTF rows in Supabase surfaced through the existing view + a locale-aware `request_hint`. Per-event default language from `workshop_config.default_locale`; one bilingual build.

**Tech Stack:** React 18 + Vite + wouter, react-i18next / i18next / i18next-http-backend / i18next-browser-languagedetector, Supabase (Postgres), TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-01-pt-br-localization-design.md`

---

## Verification approach (read first)

This repo has **no unit-test runner** (no Vitest suite/config; `pnpm check` = `tsc --noEmit` is the only gate). Do **not** add a test framework — it's out of scope and against project convention. Each task verifies via the tools that exist:

- `pnpm check` — TypeScript must stay clean.
- `node scripts/check-locales.mjs` — the locale key-parity check added in Task 3 (this is the one real automated test; it catches the failure mode i18n actually has — missing/extra keys).
- `pnpm build` — must stay clean before any deploy.
- **Manual smoke** for visual/switching behavior, against `pnpm dev` on `http://localhost:3000`.

**English-parity invariant:** after every extraction task, the app rendered with `lng='en'` must look identical to before. The `en/*.json` files are seeded from the current literals; you are moving strings, not rewriting them.

**Commit cadence:** one commit per task (the plan's last step). Branch first: `git checkout -b feat/pt-br-localization`.

---

## File Structure

**New:**
- `client/src/i18n/index.ts` — i18next initialization (single source of config).
- `client/src/i18n/glossary.md` — frozen Salt product/UI terms that stay English.
- `client/src/components/LanguageToggle.tsx` — navbar EN⇄PT switch.
- `client/public/locales/en/*.json` and `client/public/locales/pt-BR/*.json` — one file per namespace: `common, home, scenario1, scenario2, scenario3, completed, saltNexus, leaderboard, challenge`.
- `scripts/check-locales.mjs` — en/pt-BR key-parity validator.
- `supabase/migrations/033_pt_translations.sql` — DB schema for translations + locale-aware `request_hint` + `default_locale`.
- `supabase/migrations/034_seed_pt_translations.sql` — pt-BR CTF content seed.

**Modified:**
- `client/src/main.tsx` — import i18n init.
- `client/src/components/WorkshopLayout.tsx` — mount `LanguageToggle`; nav/sidebar strings → `t()`.
- `client/src/pages/*.tsx` (all 10), `client/src/components/{ChallengeIntro,ChallengeHeader,QuestionCard,WaitingOverlay}.tsx` — strings → `t()`.
- `client/src/hooks/useChallenge.ts`, `client/src/hooks/useHints.ts` — select `*_pt`, pass locale, per-field fallback.
- `client/src/i18n/index.ts` consumer for `default_locale` (read via existing `workshop_config` fetch).
- `scripts/deploy.sh` — add `/locales/*` to the CloudFront invalidation.
- `package.json` — i18next deps + `check-locales` script.

---

## Extraction Procedure (defined once; referenced by Tasks 5–17)

For each target file:

1. Identify every **user-facing literal** rendered as text (JSX text nodes, `alt`, `title`, `placeholder`, `aria-label`, button labels). **Do not** touch: `style={}` objects, `className`, `id`/`data-*`, image `src`, route paths, or the frozen terms in `glossary.md` (those stay English in both locales).
2. Add `import { useTranslation } from "react-i18next";` and inside the component: `const { t } = useTranslation("<namespace>");`.
3. For each literal, add a key to `client/public/locales/en/<namespace>.json` whose **value is the exact current English string**, and replace the literal with `{t("key")}` (or `t("key")` in attribute position).
4. For dynamic strings, use interpolation: `t("key", { count, rank })` with `{{count}}` / `{{rank}}` in the JSON. For singular/plural copy use i18next plural keys (`key_one` / `key_other`).
5. Create the matching `client/public/locales/pt-BR/<namespace>.json` with the **same keys**, values left as the English string for now (real pt-BR lands in Task 21) — this keeps the parity check green and the app functional (pt falls back to identical text until translated).
6. Keep frozen terms (`MCP`, `Posture Gaps`, `Risk Score`, `Prompt Injection`, endpoint/tool strings, …) literally inside the values, not as separate keys.

**Verification for every extraction task:**
- `pnpm check` → clean.
- `node scripts/check-locales.mjs` → PASS (en/pt-BR keys match for the namespace).
- `pnpm dev`, load the page at `lng='en'` → **visually identical** to before.
- Commit.

---

## Phase 0 — Gates

### Task 0: Font glyph test (BLOCKING)

**Files:**
- Inspect: `client/public/fonts/Casta-Thin.otf`, `Casta-ThinSlanted.otf`, `NostalgicWhispers-Regular.ttf`
- Document decision in: `client/src/i18n/glossary.md` (append a "Font glyph decision" section)

- [ ] **Step 1: Install fontTools (Python is available on this machine)**

Run: `pip install fonttools` (or `python3 -m pip install fonttools`)

- [ ] **Step 2: Check each font's cmap for required pt-BR codepoints**

Create a throwaway script `/tmp/glyphcheck.py`:

```python
from fontTools.ttLib import TTFont
need = "ã â á à ç é ê í ó ô õ ú Ã Ç É".replace(" ", "")
for path in [
    "client/public/fonts/Casta-Thin.otf",
    "client/public/fonts/Casta-ThinSlanted.otf",
    "client/public/fonts/NostalgicWhispers-Regular.ttf",
]:
    cmap = TTFont(path).getBestCmap()
    missing = [c for c in need if ord(c) not in cmap]
    print(path, "MISSING:", "".join(missing) if missing else "none")
```

Run: `python3 /tmp/glyphcheck.py`
Expected: a per-font list of missing accented glyphs (or "none").

- [ ] **Step 3: Record the decision**

In `client/src/i18n/glossary.md`, append per font:
- If `MISSING: none` → keep the face for pt headings/nav.
- If glyphs missing → the pt-BR fallback for that face is **Barlow Condensed** (already loaded, full pt coverage). Record which CSS rules (heading `font-family`, sidebar/navbar `font-family`) get a `:lang(pt) { font-family: ... }` override in Task 24.

- [ ] **Step 4: Commit**

```bash
git add client/src/i18n/glossary.md
git commit -m "chore(i18n): record font glyph-coverage decision for pt-BR"
```

---

## Phase 1 — Frontend i18n infrastructure (English-only, shippable)

### Task 1: Install i18n dependencies

**Files:** Modify `package.json`

- [ ] **Step 1: Install**

Run: `pnpm add i18next react-i18next i18next-http-backend i18next-browser-languagedetector`

- [ ] **Step 2: Verify build still clean**

Run: `pnpm check && pnpm build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(i18n): add i18next + react-i18next deps"
```

### Task 2: i18n init + main.tsx wiring + proof namespace

**Files:**
- Create: `client/src/i18n/index.ts`
- Create: `client/public/locales/en/common.json`, `client/public/locales/pt-BR/common.json`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Create `client/src/i18n/index.ts`**

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const NAMESPACES = [
  "common", "home", "scenario1", "scenario2", "scenario3",
  "completed", "saltNexus", "leaderboard", "challenge",
] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "pt-BR"],
    load: "currentOnly",
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
    detection: { order: ["localStorage"], caches: ["localStorage"], lookupLocalStorage: "salt-locale" },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
```

- [ ] **Step 2: Seed `client/public/locales/en/common.json` and `pt-BR/common.json`**

`en/common.json`:
```json
{ "appReady": "Ready" }
```
`pt-BR/common.json` (identical for now):
```json
{ "appReady": "Ready" }
```

- [ ] **Step 3: Import in `client/src/main.tsx`**

Add as the first import (before `App`): `import "./i18n";`

- [ ] **Step 4: Verify**

Run: `pnpm check` → clean. `pnpm dev`, open `http://localhost:3000`, confirm app loads unchanged and DevTools Network shows `/locales/en/common.json` fetched (200), no `/locales/pt/*` 404.

- [ ] **Step 5: Commit**

```bash
git add client/src/i18n/index.ts client/public/locales client/src/main.tsx
git commit -m "feat(i18n): initialize react-i18next with CDN-lazy namespaces"
```

### Task 3: Locale key-parity check script

**Files:** Create `scripts/check-locales.mjs`; Modify `package.json`

- [ ] **Step 1: Create `scripts/check-locales.mjs`**

```js
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = "client/public/locales";
const langs = ["en", "pt-BR"];
let failed = false;

const keysOf = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? keysOf(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]);

const nsFiles = readdirSync(join(root, "en")).filter((f) => f.endsWith(".json"));

for (const ns of nsFiles) {
  const sets = {};
  for (const lang of langs) {
    const p = join(root, lang, ns);
    if (!existsSync(p)) { console.error(`MISSING FILE: ${p}`); failed = true; sets[lang] = new Set(); continue; }
    sets[lang] = new Set(keysOf(JSON.parse(readFileSync(p, "utf8"))));
  }
  const en = sets["en"];
  for (const lang of langs.filter((l) => l !== "en")) {
    const missing = [...en].filter((k) => !sets[lang].has(k));
    const extra = [...sets[lang]].filter((k) => !en.has(k));
    if (missing.length) { console.error(`[${ns}] ${lang} MISSING: ${missing.join(", ")}`); failed = true; }
    if (extra.length) { console.error(`[${ns}] ${lang} EXTRA: ${extra.join(", ")}`); failed = true; }
  }
}
if (failed) { console.error("\nLocale parity check FAILED"); process.exit(1); }
console.log("Locale parity check passed.");
```

- [ ] **Step 2: Add script to `package.json`**

In `"scripts"`, add: `"check-locales": "node scripts/check-locales.mjs"`

- [ ] **Step 3: Run it**

Run: `node scripts/check-locales.mjs`
Expected: `Locale parity check passed.` (en/pt-BR `common.json` match).

- [ ] **Step 4: Commit**

```bash
git add scripts/check-locales.mjs package.json
git commit -m "chore(i18n): add locale key-parity check script"
```

### Task 4: LanguageToggle component + navbar wiring

**Files:**
- Create: `client/src/components/LanguageToggle.tsx`
- Modify: `client/src/components/WorkshopLayout.tsx` (mount the toggle in the navbar)

- [ ] **Step 1: Create `client/src/components/LanguageToggle.tsx`**

```tsx
import { useTranslation } from "react-i18next";

const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "pt-BR", label: "PT" },
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("pt") ? "pt-BR" : "en";
  return (
    <div
      style={{
        display: "inline-flex",
        gap: "0.25rem",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
      }}
    >
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.15rem 0.3rem",
            color: current === code ? "var(--color-accent-text-bright)" : "var(--muted-foreground)",
          }}
          aria-pressed={current === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Mount in the navbar**

In `client/src/components/WorkshopLayout.tsx`, import `LanguageToggle` and render `<LanguageToggle />` in the top navbar row (near the Salt/Guidepoint logos; match existing inline-style spacing). Do not restructure the navbar.

- [ ] **Step 3: Verify**

Run: `pnpm check` → clean. `pnpm dev`: the EN/PT toggle appears in the navbar; clicking PT then refreshing keeps PT (localStorage `salt-locale`); app still renders (English text, since pt files mirror en).

- [ ] **Step 4: Commit**

```bash
git add client/src/components/LanguageToggle.tsx client/src/components/WorkshopLayout.tsx
git commit -m "feat(i18n): navbar EN/PT language toggle with localStorage persistence"
```

---

## Phase 2 — String extraction (apply the Extraction Procedure)

Each task below applies the **Extraction Procedure** (above) to its file(s)/namespace, plus the page-specific notes. Verify per the procedure (`pnpm check`, `node scripts/check-locales.mjs`, visual en-parity) and commit (`git commit -m "feat(i18n): extract <namespace> strings"`).

### Task 5: WorkshopLayout nav/sidebar → `common`

**Files:** Modify `client/src/components/WorkshopLayout.tsx`; create/extend `locales/{en,pt-BR}/common.json`
- Page-specific: nav item labels, sidebar step labels ("Overview", "STEP / 0X", "Summary", "Challenges", "Leaderboard"), the "CONSOLE ACCESS"/section labels. These are short — watch text expansion later. The dynamic `STEP / {{n}}` uses interpolation.

### Task 6: Worked example — Scenario1 → `scenario1`

**Files:** Modify `client/src/pages/Scenario1.tsx`; create `locales/{en,pt-BR}/scenario1.json`

This is the **exemplar**; later page tasks follow the same shape.

- [ ] **Step 1: Add the hook**

In `Scenario1.tsx`: `import { useTranslation } from "react-i18next";` and `const { t } = useTranslation("scenario1");` inside the component.

- [ ] **Step 2: Extract one block (pattern)**

Before:
```tsx
<StepSection stepNumber="02" title="The Agentic Security Graph" id="step-02">
  <p style={bodyParagraphStyle}>
    Switch to the Graph view to see how everything connects. ...
  </p>
```
After:
```tsx
<StepSection stepNumber="02" title={t("step02.title")} id="step-02">
  <p style={bodyParagraphStyle}>
    {t("step02.body")}
  </p>
```
`locales/en/scenario1.json` (exact current English as values):
```json
{
  "step02": {
    "title": "The Agentic Security Graph",
    "body": "Switch to the Graph view to see how everything connects. The graph reads left to right across four linked columns: your MCPs, the Technologies they run on, the third-party Applications they reach, and the Capabilities each one exposes. Hover any node to highlight its connections and preview its risk score, top posture gap, and sensitive data; click to open its full side drawer. Turn on Insight Layers to recolor the whole graph by risk score, posture gaps, or sensitive data, so the highest-value targets stand out at a glance. Filters and layer toggles trim the view to what matters, and they persist across both Table and Graph."
  }
}
```
(For inline `<a className="accent-link">` emphasis inside a paragraph, use the `<Trans>` component from react-i18next so the markup is preserved, or split into lead/link/tail keys — prefer `<Trans i18nKey="...">` with the anchor as a child placeholder. Keep frozen terms — "Insight Layers", "MCPs" — verbatim in the value.)

- [ ] **Step 3:** Repeat for every literal in Scenario1 (overview, all 5 steps, summary, Next button label, image `alt` text), keyed under `scenario1`.
- [ ] **Step 4:** Create `locales/pt-BR/scenario1.json` mirroring the keys (values = English for now).
- [ ] **Step 5:** Verify (procedure) + commit.

### Task 7: Scenario2 → `scenario2`
**Files:** `client/src/pages/Scenario2.tsx`; `locales/{en,pt-BR}/scenario2.json`. Page-specific: the interpolated counts ("909 gaps", "42 items") — make these interpolation values (`t("step01.body", { gaps: 909 })`) so the number stays a single source. Preserve `<Trans>` for `accent-link` spans.

### Task 8: Scenario3 → `scenario3`
**Files:** `client/src/pages/Scenario3.tsx`; `locales/{en,pt-BR}/scenario3.json`. Page-specific: many frozen endpoint/tool/risk-type terms (`POST /agent/chat`, `/mcp/tools/list`, `CVE-2015-9235`, `Broken User Authentication → Unsecured JWT`, the attacker hash) — keep verbatim inside values.

### Task 9: Home → `home`
**Files:** `client/src/pages/Home.tsx`; `locales/{en,pt-BR}/home.json`. Page-specific: hero headline (display font — see Task 24 glyph decision), the "Launch Salt Platform" CTA label.

### Task 10: Completed → `completed`
**Files:** `client/src/pages/Completed.tsx`; `locales/{en,pt-BR}/completed.json`. Page-specific: **tier headlines** (Champion/Runner-up/Third/Round Complete/Time's Up/Workshop Complete) and **plurals** ("1 wrong guess" / "N wrong guesses") — use i18next plural keys (`wrongGuesses_one`/`wrongGuesses_other`); interpolated rank/time/stat values.

### Task 11: SaltNexus → `saltNexus`
**Files:** `client/src/pages/SaltNexus.tsx`; `locales/{en,pt-BR}/saltNexus.json`. Page-specific: the STATS grid labels ("Document chunks", etc.) and the Lilli/McKinsey narrative; the animated "Salt Nexus" headline word stays as-is.

### Task 12: Leaderboard → `leaderboard`
**Files:** `client/src/pages/Leaderboard.tsx`; `locales/{en,pt-BR}/leaderboard.json`. Page-specific: column headers (Rank/Name/C1/C2/Total/Wrong/Done) — short, watch expansion; the footnote caption; interpolated counts.

### Task 13: NotFound → `common`
**Files:** `client/src/pages/NotFound.tsx`; extend `common.json`.

### Task 14: ChallengeIntro → `challenge`
**Files:** `client/src/components/ChallengeIntro.tsx`; `locales/{en,pt-BR}/challenge.json`. Page-specific: the "Begin Workshop" button + the 35-minute orientation copy.

### Task 15: ChallengeHeader → `challenge`
**Files:** `client/src/components/ChallengeHeader.tsx`; extend `challenge.json`. Page-specific: title prefix, "X / Y solved" pill (interpolation), penalty pill ("+15s × {{n}}"), "REVIEW MODE" label, countdown is numeric (no translation).

### Task 16: QuestionCard → `challenge`
**Files:** `client/src/components/QuestionCard.tsx`; extend `challenge.json`. Page-specific: submit button, placeholder text, "COMPLETE"/"Locked" labels, wrong-answer toast/error copy.

### Task 17: WaitingOverlay → `challenge`
**Files:** `client/src/components/WaitingOverlay.tsx`; extend `challenge.json`. Page-specific: both variants (pre-start gate copy + nexus variant copy). Note: `ChallengePage`'s "Time's Up" overlay copy and completion-reveal copy also live here/in `ChallengePage.tsx` — extract those too (keyed under `challenge`).

---

## Phase 3 — DB translation layer

### Task 18: Migration 033 — schema + locale-aware request_hint + default_locale

**Files:** Create `supabase/migrations/033_pt_translations.sql`; apply via Supabase MCP `apply_migration` (project `cttpfrwphcqpjwmwothb`).

- [ ] **Step 1: Write `supabase/migrations/033_pt_translations.sql`**

```sql
-- 033_pt_translations.sql
-- pt-BR localization: translated columns for CTF content, a locale-aware
-- request_hint, and a per-event default_locale. All additive/nullable;
-- submit_answer / answer_hash / normalize_answer are UNTOUCHED (answers
-- stay English, matched against the English Salt platform).

alter table public.challenges
  add column if not exists title_pt    text,
  add column if not exists subtitle_pt text;

alter table public.questions
  add column if not exists prompt_pt text,
  add column if not exists hints_pt  text[];

alter table public.workshop_config
  add column if not exists default_locale text not null default 'en';

-- questions_public: expose pt fields
create or replace view public.questions_public as
  select id, challenge_id, order_idx,
         prompt, prompt_pt,
         cardinality(hints) as hint_count,
         hints_pt
  from public.questions;
grant select on public.questions_public to anon, authenticated;

-- request_hint: locale-aware (drop 2-arg, recreate 3-arg with default).
-- Body identical to migration 023 except hint text resolves per locale.
drop function if exists public.request_hint(uuid, int);
create function public.request_hint(
  p_question_id uuid, p_hint_idx int, p_locale text default 'en'
) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_attendee_id uuid; v_challenge_id int;
  v_hints text[]; v_hints_pt text[];
  v_started_at timestamptz; v_opened_at timestamptz;
  v_hint_text text; v_inserted int;
begin
  select id into v_attendee_id from public.attendees where auth_uid = auth.uid();
  if v_attendee_id is null then return json_build_object('ok', false, 'error', 'not_registered'); end if;

  select hints, hints_pt, challenge_id into v_hints, v_hints_pt, v_challenge_id
  from public.questions where id = p_question_id;
  if v_hints is null then return json_build_object('ok', false, 'error', 'question_not_found'); end if;

  if p_hint_idx < 0 or p_hint_idx >= cardinality(v_hints) then
    return json_build_object('ok', false, 'error', 'hint_out_of_range'); end if;

  if exists (select 1 from public.question_progress
             where attendee_id = v_attendee_id and question_id = p_question_id) then
    return json_build_object('ok', false, 'error', 'already_solved'); end if;

  select started_at into v_started_at from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
  if v_started_at is null then return json_build_object('ok', false, 'error', 'challenge_not_begun'); end if;

  select opened_at into v_opened_at from public.workshop_config where id = 1;
  if v_opened_at is null then return json_build_object('ok', false, 'error', 'challenge_locked'); end if;
  if now() > v_opened_at + interval '35 minutes' then
    return json_build_object('ok', false, 'error', 'time_expired'); end if;

  if p_locale = 'pt-BR' and v_hints_pt is not null and v_hints_pt[p_hint_idx + 1] is not null then
    v_hint_text := v_hints_pt[p_hint_idx + 1];
  else
    v_hint_text := v_hints[p_hint_idx + 1];
  end if;

  with ins as (
    insert into public.hint_usage (attendee_id, question_id, hint_idx)
    values (v_attendee_id, p_question_id, p_hint_idx)
    on conflict (attendee_id, question_id, hint_idx) do nothing
    returning 1)
  select count(*) into v_inserted from ins;

  return json_build_object('ok', true, 'hint', v_hint_text, 'hint_idx', p_hint_idx,
                           'already_charged', v_inserted = 0, 'penalty_ms', 60000);
end; $$;
revoke execute on function public.request_hint(uuid, int, text) from public;
revoke execute on function public.request_hint(uuid, int, text) from anon;
grant  execute on function public.request_hint(uuid, int, text) to authenticated;
```

- [ ] **Step 2: Apply via MCP**

Apply with Supabase MCP `apply_migration` (name `033_pt_translations`, project `cttpfrwphcqpjwmwothb`).

- [ ] **Step 3: Verify with execute_sql**

```sql
select column_name from information_schema.columns
 where table_name='questions' and column_name in ('prompt_pt','hints_pt');
select column_name from information_schema.columns
 where table_name='workshop_config' and column_name='default_locale';
select prompt, prompt_pt, hint_count, hints_pt from public.questions_public limit 1;
```
Expected: new columns present; `questions_public` returns the new fields (pt null for now).

- [ ] **Step 4: Smoke the 2-arg→3-arg compatibility**

Confirm a registered/begun test attendee calling `request_hint(qid, 0)` (2 args) still returns the English hint (default `p_locale='en'`). (Run only against a disposable test attendee, or skip if no workshop is active.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/033_pt_translations.sql
git commit -m "feat(i18n): DB translated columns, locale-aware request_hint, default_locale"
```

### Task 19: Wire useChallenge + useHints to locale

**Files:** Modify `client/src/hooks/useChallenge.ts`, `client/src/hooks/useHints.ts`

- [ ] **Step 1: Add a pick helper + select pt fields in `useChallenge.ts`**

In `fetchMeta`: select `id, slug, title, subtitle, title_pt, subtitle_pt`. In `fetchQuestions`: select `id, order_idx, prompt, prompt_pt, hint_count, hints_pt`. Add:
```ts
import i18n from "@/i18n";
const isPt = () => i18n.language?.startsWith("pt");
const pick = (en: string, pt: string | null) => (isPt() && pt ? pt : en);
```
Resolve `meta.title = pick(row.title, row.title_pt)` etc.; `question.prompt = pick(q.prompt, q.prompt_pt)`. Re-resolve on `i18n` language change (subscribe to `i18n.on("languageChanged", refetchOrRemap)`), or re-map from raw rows held in state.

- [ ] **Step 2: Pass locale in `useHints.ts`**

In the `request_hint` RPC call, add `p_locale: i18n.language`.

- [ ] **Step 3: Verify**

`pnpm check` → clean. `pnpm dev`: with pt columns still null, pt mode shows English prompts/hints (fallback). No console errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useChallenge.ts client/src/hooks/useHints.ts
git commit -m "feat(i18n): locale-aware CTF content + hint fetch"
```

### Task 20: Wire default_locale into language resolution

**Files:** Modify `client/src/i18n/index.ts` consumer (a small bootstrap in `main.tsx` or `WorkshopLayout`) using the existing `workshop_config` read.

- [ ] **Step 1: Apply config default when no stored preference**

Where `workshop_config` is already fetched (`useWorkshopClock`), also select `default_locale`. On first resolution: if `localStorage.salt-locale` is unset and `default_locale !== i18n.language`, call `i18n.changeLanguage(default_locale)` once. (Accept the brief first-paint flash per the spec's Open Questions.)

- [ ] **Step 2: Verify**

Set `default_locale='pt-BR'` via execute_sql on a test basis; clear localStorage; reload → resolves to pt (English text until Task 21). Reset `default_locale='en'` after.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useWorkshopClock.ts client/src/main.tsx
git commit -m "feat(i18n): per-event default_locale from workshop_config"
```

---

## Phase 4 — Translation content

### Task 21: Draft pt-BR resource files

**Files:** Replace English placeholder values in every `client/public/locales/pt-BR/*.json` with Brazilian Portuguese.

- [ ] **Step 1: Translate each namespace file**, preserving keys, interpolation placeholders (`{{count}}`), plural key suffixes, and **frozen terms verbatim** (see `glossary.md`). Voice: short, declarative, "dark-ops briefing" — match the English register, not a literal word-for-word rendering.
- [ ] **Step 2: Run parity** — `node scripts/check-locales.mjs` → PASS (keys still match; only values changed).
- [ ] **Step 3: Visual pass** — `pnpm dev`, toggle PT, walk every page.
- [ ] **Step 4: Commit** — `git commit -m "feat(i18n): pt-BR translations for all namespaces"`.

### Task 22: Seed pt-BR CTF content (migration 034)

**Files:** Create `supabase/migrations/034_seed_pt_translations.sql`; apply via MCP.

- [ ] **Step 1: Write the seed** — `update public.challenges set title_pt=…, subtitle_pt=… where id in (1,2);` and per question `update public.questions set prompt_pt=…, hints_pt=array[…] where challenge_id=… and order_idx=…;` for all 10 questions. `hints_pt` cardinality MUST equal existing `hints`. Keep frozen terms English; **do not** translate anything answer-bearing.
- [ ] **Step 2: Apply via MCP** (`apply_migration`, name `034_seed_pt_translations`).
- [ ] **Step 3: Verify** — `select order_idx, prompt_pt, hints_pt from public.questions where challenge_id=2 order by order_idx;` shows pt text; counts match `hints`.
- [ ] **Step 4: Commit** — `git commit -m "feat(i18n): seed pt-BR CTF prompts/hints/titles"`.

### Task 23: Native-speaker review (external gate)

- [ ] A fluent Brazil/Salt reviewer checks pt-BR copy (technical terms + voice) across UI + CTF. Fold edits back into the locale files / migration 034 (re-run parity, re-commit). **Do not deploy before this passes.**

---

## Phase 5 — Fonts, layout QA, deploy

### Task 24: Apply the glyph-test decision (CSS)

**Files:** Modify `client/src/index.css` (and any inline heading styles flagged in Task 0).

- [ ] **Step 1:** If Task 0 found missing glyphs, add `:lang(pt) h1, :lang(pt) h2 { font-family: 'Barlow Condensed', sans-serif; }` (and the sidebar/navbar selector for Casta gaps), and set `<html lang>` from `i18n.language`. If no glyphs were missing, skip the override.
- [ ] **Step 2: Verify** — pt headings/nav render accented characters in a single consistent face (no mid-word fallback).
- [ ] **Step 3: Commit** — `git commit -m "fix(i18n): pt heading/nav font fallback per glyph test"`.

### Task 25: Text-expansion QA pass

**Files:** Targeted CSS/inline tweaks in the flagged components.

- [ ] **Step 1:** At `lng='pt-BR'`, inspect: sidebar nav labels, uppercase Barlow section labels, `Begin Workshop`→`Iniciar Workshop` button, timer/penalty pills, leaderboard column headers, MagicRingsButton labels. Fix overflow/clipping with minimal CSS (no layout re-architecture).
- [ ] **Step 2: Verify** — no clipped/overflowing text at pt-BR across all pages and the challenge flow.
- [ ] **Step 3: Commit** — `git commit -m "fix(i18n): pt-BR text-expansion layout adjustments"`.

### Task 26: Add /locales/* to CloudFront invalidation

**Files:** Modify `scripts/deploy.sh`

- [ ] **Step 1:** Change the invalidation paths from `"/" "/index.html"` to `"/" "/index.html" "/locales/*"`.
- [ ] **Step 2: Verify** — `bash -n scripts/deploy.sh` (syntax) passes.
- [ ] **Step 3: Commit** — `git commit -m "chore(deploy): invalidate /locales/* on deploy"`.

### Task 27: Final verification + deploy

- [ ] **Step 1: Full local gate** — `pnpm check` (clean), `node scripts/check-locales.mjs` (PASS), `pnpm build` (clean).
- [ ] **Step 2: Manual smoke matrix** — for `lng` in {en, pt-BR}: walk Home → Scenario 1–3 → Challenge 1 (register on a disposable email, begin, submit a correct + a wrong answer, reveal a hint) → Challenge 2 → Leaderboard → Completed → Salt Nexus. Confirm: en is byte-identical to prod today; pt is fully translated with frozen terms English; **answers match identically in both locales**; hint reveal returns pt text in pt; no layout breakage; no `/locales/pt/*` 404.
- [ ] **Step 3: Merge** — `git checkout main && git merge --no-ff feat/pt-br-localization`.
- [ ] **Step 4: Deploy OUTSIDE a live workshop** — `set -a; source .env.local; set +a; ./scripts/deploy.sh` (deploys as `nexus_host`; verify identity first). Confirm live `workshop.salt-nexus.com` serves the new bundle and `/locales/en/*` + `/locales/pt-BR/*` return 200.
- [ ] **Step 5: Per-event default** — leave `default_locale='en'` globally; for the Brazil stop, `update public.workshop_config set default_locale='pt-BR' where id=1;`.

---

## Self-Review (completed by plan author)

- **Spec coverage:** every spec section maps to a task — i18n core (T2), lazy-load/CDN (T2, T26), namespaces (T2, T5–17), toggle + persistence + config default (T4, T20), extraction + en-parity (T5–17), frozen terms (T0/glossary, used throughout), DB columns + view + locale request_hint + submit_answer untouched (T18), client DB wiring (T19), fonts glyph gate (T0, T24), text expansion (T25), rollout/deploy + /locales invalidation (T26–27), native review (T23). No gaps.
- **Placeholders:** none — extraction "how" is the fully-specified Extraction Procedure; SQL is complete (not pseudocode); the parity script and components are full.
- **Type/name consistency:** `pick`/`isPt` (T19), namespace list `NAMESPACES` (T2) reused, `salt-locale` localStorage key consistent (T2/T4/T20), `default_locale` consistent (T18/T20/T27), `request_hint(uuid,int,text)` consistent (T18/T19).
