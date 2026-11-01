-- Stride database setup
-- Supabase dashboard > SQL Editor > New query > paste this file > Run.
-- Safe to run more than once.

-- ---------- tables ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, age int, gender text, height_cm numeric, weight_kg numeric,
  goal_weight_kg numeric, goal text, activity text, diet text,
  location text, experience text, created_at timestamptz default now()
);

create table if not exists weight_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null, weight_kg numeric not null,
  unique (user_id, logged_on)
);

create table if not exists food_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  name text not null, kcal int not null,
  protein numeric default 0, carbs numeric default 0, fat numeric default 0
);

create table if not exists workout_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null, done boolean default true,
  unique (user_id, logged_on)
);

create table if not exists water_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null, glasses int default 0,
  unique (user_id, logged_on)
);

-- ---------- Row Level Security: each user sees only their own rows ----------
alter table profiles      enable row level security;
alter table weight_logs   enable row level security;
alter table food_logs     enable row level security;
alter table workout_logs  enable row level security;
alter table water_logs    enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own logs" on weight_logs;
create policy "own logs" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own food" on food_logs;
create policy "own food" on food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own workouts" on workout_logs;
create policy "own workouts" on workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own water" on water_logs;
create policy "own water" on water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
