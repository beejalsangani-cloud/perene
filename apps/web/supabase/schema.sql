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

-- ── 2026-05-12: discover photo description cache ──────────────────────────────
-- Backs /api/describe-look. When a user clicks "Get this look" on a Discover
-- inspiration photo, the route calls Claude Haiku with the image and stores
-- the resulting "[occasion vibe] — [outfit description]" string here, keyed
-- by Unsplash photo_id. Used to replace the broken Unsplash alt_description
-- (which describes the photo subject, not the outfit) on the outfit-generator
-- occasion pre-fill.
--
-- No TTL — Unsplash photo IDs are immutable and the look in a photo doesn't
-- change, so a row is valid forever. To force re-generation after a prompt
-- change, run `truncate public.discover_descriptions;` once.
--
-- RLS is on with no policies — service-role-only access. The route uses
-- supabaseAdmin which bypasses RLS.
create table if not exists public.discover_descriptions (
  photo_id     text primary key,
  description  text not null,
  created_at   timestamptz default now()
);

alter table public.discover_descriptions enable row level security;

-- ── 2026-05-12: Today's Outfits + "Did you wear this" prompt ─────────────────
-- Two coupled tables for the daily-outfit feature:
--
-- daily_outfits is a pointer table — for each (user, date, slot) it points at
-- the current outfit. On shuffle, the outfit_id is replaced and shuffle_count
-- increments. The shuffle ceiling is enforced application-side (free tier = 3
-- per slot per day) so we can lift it per user tier without a DB change. The
-- unique constraint guarantees exactly one daytime + one evening row per day.
create table if not exists public.daily_outfits (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  outfit_id           uuid references public.outfits(id) on delete cascade not null,
  generated_for_date  date not null,
  slot                text not null check (slot in ('daytime', 'evening')),
  shuffle_count       integer default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id, generated_for_date, slot)
);

create index if not exists daily_outfits_user_date_idx
  on public.daily_outfits(user_id, generated_for_date);

create or replace trigger daily_outfits_updated_at
  before update on public.daily_outfits
  for each row execute procedure public.set_updated_at();

alter table public.daily_outfits enable row level security;

-- outfit_wear_log captures "did you wear it" responses. One row per (user,
-- outfit). Created lazily when the user is first shown the morning prompt;
-- worn stays NULL after 48h with no response (the prompt query filters to
-- the 48h window, so older outfits never resurface). The CHECK ensures
-- not_worn_reason is only populated when worn=false; the brief transient
-- (worn=false, reason=null) state is allowed so the UI doesn't have to
-- write both fields in one transaction.
create table if not exists public.outfit_wear_log (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  outfit_id           uuid references public.outfits(id) on delete cascade not null,
  outfit_date         date not null,
  outfit_source       text not null check (outfit_source in ('today_daytime', 'today_evening', 'manual')),
  worn                boolean,
  not_worn_reason     text check (not_worn_reason in ('wrong_vibe', 'weather_changed', 'didnt_feel_like_it', 'other')),
  prompted_at         timestamptz,
  responded_at        timestamptz,
  created_at          timestamptz default now(),
  unique (user_id, outfit_id),
  check (not_worn_reason is null or worn = false)
);

create index if not exists outfit_wear_log_user_date_idx
  on public.outfit_wear_log(user_id, outfit_date);

alter table public.outfit_wear_log enable row level security;

-- ── 2026-05-27: PWA push notification subscriptions (foundation only) ─────────
-- Plumbing for Web Push — we are NOT sending notifications yet. One row per
-- browser/device subscription; a single user can have many (phone, laptop, …).
-- Values come straight from the browser's PushSubscription.toJSON():
--   endpoint → the unique push-service URL for that browser
--   p256dh   → the client's public encryption key
--   auth     → the client's auth secret
-- endpoint is UNIQUE so re-subscribing the same browser upserts (onConflict
-- 'endpoint', see /api/push/subscribe) and re-points the row at the current
-- user instead of duplicating. user_agent is best-effort device labeling for a
-- future "manage notifications" screen. RLS mirrors user_profiles: a user only
-- sees/writes their own rows; the service role (supabaseAdmin) bypasses RLS for
-- future server-side sending.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

create or replace trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute procedure public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "users: read own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "users: insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "users: update own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "users: delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
