-- ─────────────────────────────────────────────────────────────────────────────
-- Perene — Supabase schema
-- Paste this entire file into Supabase → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- user_profiles
-- One row per user; user_id references the built-in auth.users table.
create table if not exists public.user_profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null unique,
  gender         text,
  age_range      text,
  body_type      text,
  style_descriptors  text[] default '{}',
  lifestyle          text[] default '{}',
  typical_events     text[] default '{}',
  budget_range   text,
  color_preferences  text[] default '{}',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.user_profiles enable row level security;

-- Users can only read their own profile
create policy "users: read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

-- Users can insert their own profile
create policy "users: insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

-- Users can update their own profile
create policy "users: update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);
