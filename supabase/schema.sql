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

-- ── 2026-05-07: signup-time first name + marketing opt-in ─────────────────────
-- Both nullable / defaulted so existing rows aren't disrupted.
alter table public.user_profiles
  add column if not exists first_name        text,
  add column if not exists marketing_opt_in  boolean default false;

-- ── 2026-05-09: closet-stats engagement tracking ──────────────────────────────
-- last_visit / last_outfit_at are nullable timestamps written fire-and-forget
-- from DashboardNav (page mount) and the outfit generation API route. login_count
-- is incremented atomically via the increment_login_count RPC on Supabase
-- SIGNED_IN events, throttled to once per browser tab via sessionStorage. All
-- three are best-effort signals — failures must never block user-facing flows.
alter table public.user_profiles
  add column if not exists last_visit       timestamptz,
  add column if not exists login_count      integer default 0,
  add column if not exists last_outfit_at   timestamptz;

create or replace function public.increment_login_count()
returns void language sql security definer set search_path = public as $$
  update public.user_profiles
    set login_count = coalesce(login_count, 0) + 1
    where user_id = auth.uid();
$$;

revoke all on function public.increment_login_count() from public;
grant execute on function public.increment_login_count() to authenticated;
