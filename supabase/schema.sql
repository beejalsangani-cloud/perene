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

-- ── 2026-05-09: documenting wardrobe_items and outfits tables ─────────────────
-- These tables already exist in production. Their definitions below are
-- reconstructed from the application code that reads / writes them
-- (UploadModal.js, wardrobe/page.js, api/outfits/generate/route.js,
-- outfits/[id]/page.js). Wrapped in `if not exists` so re-running this file
-- against the live schema is a safe no-op. Treat the live Supabase definition
-- as canonical if there's any drift.

-- Wardrobe items: one row per uploaded clothing item. image_url stores the
-- storage path inside the "wardrobe" bucket, not a public URL — clients fetch
-- a signed URL at read time. category is one of the values in CATEGORIES
-- (UploadModal.js:7); season is a multi-select array.
create table if not exists public.wardrobe_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  image_url   text not null,
  category    text,
  color       text,
  season      text[] default '{}',
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create or replace trigger wardrobe_items_updated_at
  before update on public.wardrobe_items
  for each row execute procedure public.set_updated_at();

alter table public.wardrobe_items enable row level security;

-- Outfits: one row per AI-generated outfit. event_description is the user's
-- free-form prompt; date / location are optional occasion metadata; weather
-- captures the snapshot used at generation time. generated_outfit holds the
-- full Claude response (selected_items[], styling_reasoning, overall_vibe,
-- confidence_level, human_review_recommended). missing_items + confidence
-- are denormalized for index-page rendering.
create table if not exists public.outfits (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade not null,
  event_description  text not null,
  location           text,
  date               text,
  weather            jsonb,
  generated_outfit   jsonb,
  missing_items      jsonb default '[]'::jsonb,
  confidence         text,
  created_at         timestamptz default now()
);

alter table public.outfits enable row level security;

-- ── 2026-05-11: affiliate URL validation cache ────────────────────────────────
-- Backs server-side URL validation (lib/affiliate-validator.js, /api/affiliate/
-- validate). cache_key is sha256(retailer + '|' + url) so identical retailer/
-- URL pairs collapse to a single row; retailer + search_query stored alongside
-- for log queries ("which retailer is failing most?"). failure_reason is one
-- of: status_NNN, content_marker_missing — populated only when is_valid=false.
-- TTLs are enforced application-side (24h success / 1h failure) so a stale row
-- triggers a re-probe; the pg_cron job 'affiliate-url-checks-cleanup-7d'
-- handles physical row pruning at 04:15 UTC daily.
--
-- RLS is on with no policies — service-role-only access. The validator uses
-- supabaseAdmin which bypasses RLS; end users have no business reading this
-- internal cache.
create table if not exists public.affiliate_url_checks (
  cache_key       text primary key,
  retailer        text not null,
  search_query    text not null,
  is_valid        boolean not null,
  failure_reason  text,
  checked_at      timestamptz default now()
);

create index if not exists affiliate_url_checks_checked_at_idx
  on public.affiliate_url_checks(checked_at);

alter table public.affiliate_url_checks enable row level security;

-- Scheduled cleanup (run manually in Supabase dashboard — pg_cron schedule
-- declarations are kept out of this file to avoid re-creating the job on
-- every replay):
--   select cron.schedule(
--     'affiliate-url-checks-cleanup-7d',
--     '15 4 * * *',
--     $$ delete from public.affiliate_url_checks where checked_at < now() - interval '7 days' $$
--   );
