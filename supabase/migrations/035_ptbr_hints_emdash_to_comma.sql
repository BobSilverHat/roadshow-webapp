-- 035_ptbr_hints_emdash_to_comma.sql
-- Style: replace em dashes with commas in pt-BR question hints, matching the
-- locale-file copy convention (the user prefers commas over em dashes).
--   * prompt_pt has no em dashes (nothing to do).
--   * title_pt's "Challenge N — " prefix is INTENTIONALLY left untouched:
--     titleWithoutPrefix() parses that separator and it is stripped before
--     display, so it is never user-visible.
--   * Answers (answer_hash / alt_answer_hashes) untouched.
-- Idempotent: re-running is a no-op once no em dashes remain.

update public.questions
set hints_pt = (
  select array_agg(regexp_replace(h, '\s*—\s*', ', ', 'g') order by ord)
  from unnest(hints_pt) with ordinality as u(h, ord)
)
where hints_pt is not null
  and exists (select 1 from unnest(hints_pt) h where h like '%—%');
