-- Client-facing projections. See design spec §3.2.

-- questions_public hides answer_hash from non-privileged callers.
create or replace view public.questions_public as
  select id, challenge_id, order_idx, prompt
  from public.questions;

-- leaderboard is the computed scoreboard joined across three tables.
-- Time formula per spec §3.2:
--   elapsed_ms = (completed_at - started_at) in ms + wrong_count * 15000
-- Nulls (challenge not completed) surface as null elapsed_ms.
create or replace view public.leaderboard as
select
  a.id  as attendee_id,
  a.name,
  coalesce(qp_count.n, 0)::int as questions_complete,
  case
    when c1.completed_at is not null and c1.started_at is not null
    then (extract(epoch from (c1.completed_at - c1.started_at)) * 1000)::bigint
         + c1.wrong_count * 15000
  end as c1_elapsed_ms,
  case
    when c2.completed_at is not null and c2.started_at is not null
    then (extract(epoch from (c2.completed_at - c2.started_at)) * 1000)::bigint
         + c2.wrong_count * 15000
  end as c2_elapsed_ms,
  case
    when c1.completed_at is not null and c1.started_at is not null
     and c2.completed_at is not null and c2.started_at is not null
    then ((extract(epoch from (c1.completed_at - c1.started_at)) * 1000)::bigint + c1.wrong_count * 15000)
       + ((extract(epoch from (c2.completed_at - c2.started_at)) * 1000)::bigint + c2.wrong_count * 15000)
  end as total_ms,
  (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0))::int as wrong_count
from public.attendees a
left join public.challenge_attempts c1 on c1.attendee_id = a.id and c1.challenge_id = 1
left join public.challenge_attempts c2 on c2.attendee_id = a.id and c2.challenge_id = 2
left join (
  select attendee_id, count(*)::int as n
  from public.question_progress
  group by attendee_id
) qp_count on qp_count.attendee_id = a.id;
