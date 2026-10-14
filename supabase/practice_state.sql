-- Motivace progress (Supabase → SQL Editor → Run).
-- Odděleně od srs_cards.

create table if not exists public.practice_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wrong_pool jsonb not null default '{}'::jsonb,
  wip jsonb,
  chapter_best jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.practice_state enable row level security;

drop policy if exists "Users read own practice" on public.practice_state;
create policy "Users read own practice"
  on public.practice_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own practice" on public.practice_state;
create policy "Users insert own practice"
  on public.practice_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own practice" on public.practice_state;
create policy "Users update own practice"
  on public.practice_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
