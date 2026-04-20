-- Per-attendee tracking tables. See design spec §3.1.

create table if not exists public.challenge_attempts (
  id           uuid primary key default gen_random_uuid(),
  attendee_id  uuid not null references public.attendees(id) on delete cascade,
  challenge_id int  not null references public.challenges(id) on delete cascade,
  started_at   timestamptz,
  completed_at timestamptz,
  wrong_count  int not null default 0,
  unique (attendee_id, challenge_id)
);

create table if not exists public.answer_attempts (
  id             uuid primary key default gen_random_uuid(),
  attendee_id    uuid not null references public.attendees(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  submitted_at   timestamptz not null default now(),
  correct        boolean not null,
  submission_raw text
);

create index if not exists answer_attempts_attendee_question_idx
  on public.answer_attempts (attendee_id, question_id);

create table if not exists public.question_progress (
  attendee_id  uuid not null references public.attendees(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete cascade,
  correct_at   timestamptz not null default now(),
  primary key (attendee_id, question_id)
);
