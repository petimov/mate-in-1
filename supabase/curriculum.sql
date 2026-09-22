-- Jen osnova. Supabase → SQL Editor → Run.

create table if not exists public.curriculum (
  id text primary key default 'main',
  courses jsonb not null default '[]'::jsonb,
  chapters jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.curriculum enable row level security;

drop policy if exists "Public can read curriculum" on public.curriculum;
create policy "Public can read curriculum"
  on public.curriculum
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Service role writes curriculum" on public.curriculum;
create policy "Service role writes curriculum"
  on public.curriculum
  for all
  to service_role
  using (true)
  with check (true);

insert into public.curriculum (id, courses, chapters)
values ('main', '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;
