-- Core reference tables for the CTF. See design spec §3.1.

create table if not exists public.attendees (
  id         uuid primary key default gen_random_uuid(),
  auth_uid   uuid not null unique references auth.users(id) on delete cascade,
  email      text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id         int primary key,
  slug       text not null unique,
  title      text not null,
  subtitle   text,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id int  not null references public.challenges(id) on delete cascade,
  order_idx    int  not null,
  prompt       text not null,
  answer_hash  text not null,
  created_at   timestamptz not null default now(),
  unique (challenge_id, order_idx)
);
