-- Puzzles for the chess school trainer
create table if not exists public.puzzles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  fen text not null,
  moves text[] not null default '{}',
  kind text not null default 'move',
  squares text[] not null default '{}',
  theme text,
  level text,
  hint text,
  explanation text,
  source text,
  video_url text,
  wrong_replies jsonb not null default '[]'::jsonb,
  markup jsonb not null default '{}'::jsonb,
  chapter_id text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.puzzles enable row level security;

create policy "Public can read puzzles"
  on public.puzzles
  for select
  to anon, authenticated
  using (true);

-- If the table already exists from the mate-in-1 schema, run this:
alter table public.puzzles add column if not exists kind text not null default 'move';
alter table public.puzzles add column if not exists squares text[] not null default '{}';
alter table public.puzzles add column if not exists theme text;
alter table public.puzzles add column if not exists level text;
alter table public.puzzles add column if not exists wrong_replies jsonb not null default '[]'::jsonb;
alter table public.puzzles add column if not exists markup jsonb not null default '{}'::jsonb;
alter table public.puzzles add column if not exists chapter_id text;
alter table public.puzzles add column if not exists sort int not null default 0;
alter table public.puzzles add column if not exists source text;

create table if not exists public.curriculum (
  id text primary key default 'main',
  courses jsonb not null default '[]'::jsonb,
  chapters jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.curriculum enable row level security;

create policy "Public can read curriculum"
  on public.curriculum
  for select
  to anon, authenticated
  using (true);

insert into public.curriculum (id, courses, chapters)
values ('main', '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;

drop policy if exists "Service role writes curriculum" on public.curriculum;
create policy "Service role writes curriculum"
  on public.curriculum
  for all
  to service_role
  using (true)
  with check (true);

-- Writes go through the Next.js API with the service role key.

create table if not exists public.srs_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id text not null,
  ease double precision not null default 2.5,
  interval int not null default 0,
  due timestamptz not null,
  reps int not null default 0,
  lapses int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, puzzle_id)
);

alter table public.srs_cards enable row level security;

create policy "Users read own srs"
  on public.srs_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own srs"
  on public.srs_cards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own srs"
  on public.srs_cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Stripe entitlements. Writes only via Next.js webhook (service role).
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

create table if not exists public.subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  status text not null,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  plan text,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;
