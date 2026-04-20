-- Seed the two challenges. Idempotent.
-- Titles and slugs are final; subtitles may be tweaked during Phase 7 content authoring.

insert into public.challenges (id, slug, title, subtitle) values
  (1, 'discover-govern', 'Challenge 1 — Discover & Govern', 'Agentic Discovery and Posture Management'),
  (2, 'protect',         'Challenge 2 — Protect',           'Runtime Protection in action')
on conflict (id) do nothing;
