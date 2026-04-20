-- RPC: get_leaderboard()
-- Returns the leaderboard view ordered by the canonical sort:
--   questions_complete DESC, total_ms ASC NULLS LAST, wrong_count ASC.
-- Anon-callable — no emails exposed.

create or replace function public.get_leaderboard()
returns table(
  attendee_id        uuid,
  name               text,
  questions_complete int,
  c1_elapsed_ms      bigint,
  c2_elapsed_ms      bigint,
  total_ms           bigint,
  wrong_count        int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    attendee_id,
    name,
    questions_complete,
    c1_elapsed_ms,
    c2_elapsed_ms,
    total_ms,
    wrong_count
  from public.leaderboard
  order by
    questions_complete desc,
    total_ms           asc nulls last,
    wrong_count        asc;
$$;

grant execute on function public.get_leaderboard() to anon, authenticated;
