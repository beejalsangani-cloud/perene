// Today's Outfits — daily generation + shuffle.
//
// GET  → returns the two daily outfit slots for `?date=YYYY-MM-DD` (defaults
//        to UTC today). Auto-generates any missing slot. Returns closet size
//        so the client can render the < 5 items fallback when needed.
// POST → "/shuffle" — body `{ slot: 'daytime' | 'evening', date: 'YYYY-MM-DD' }`
//        Regenerates the slot's outfit and increments shuffle_count. Enforces
//        the per-tier shuffle ceiling (free tier = 3).
//
// Generation reuses the existing /api/outfits/generate handler by importing
// its POST function — keeps the prompt-building + Claude call in one place
// (no duplication, no behavior change to manual outfit generation).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { POST as generateOutfitPOST } from "@/app/api/outfits/generate/route";

const CLOSET_MINIMUM_FOR_DAILY = 5;
const SHUFFLE_LIMIT_FREE       = 3;

// Tier check — easy to flip per user later (look up user_profiles.tier or
// similar). For now every user is on the free tier.
function shuffleLimitForUser(/* userId */) {
  return SHUFFLE_LIMIT_FREE;
}

async function userIdFromAuthHeader(request) {
  const header = request.headers.get("authorization") ?? "";
  const token  = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function dayName(dateStr) {
  try {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  } catch { return ""; }
}

// Per-slot occasion description. Day name lands in the occasion text so the
// AI factors it in. The two descriptions are deliberately contrasted —
// daytime is flat/practical, evening is elevated/intentional — so the AI
// builds visually distinct outfits per slot rather than two similar looks.
function eventDescriptionForSlot(slot, dateStr) {
  const day = dayName(dateStr);
  if (slot === "daytime") {
    return `Daytime outfit for ${day}. Practical, comfortable, polished for daily activities — work, errands, casual social. Flat or low-heel footwear, layerable pieces, not statement-heavy. Should feel effortless and easy to move through the day in.`;
  }
  return `Evening outfit for ${day} night. Dressed up for dinner, drinks, or going out tonight. Heels or elevated footwear, a statement piece or sleeker silhouette, deeper or richer palette, more drama and intention than daytime. Should feel like the user wants to be seen.`;
}

// Pick which aesthetic tag to emphasize on this generation attempt. attemptIndex
// is 0-indexed: 0 = initial generation, 1 = first shuffle, 2 = second shuffle, …
// Cycles through the user's style_descriptors so each shuffle leans on a
// different facet of their style.
function aestheticEmphasisFor(profile, attemptIndex) {
  const tags = profile?.style_descriptors ?? [];
  if (tags.length === 0) return null;
  return tags[attemptIndex % tags.length];
}

// Generates a daily outfit by calling the existing /api/outfits/generate
// handler directly (no HTTP round-trip). Accepts optional shuffle-variety
// hints — excludeItemIds (don't re-use these) and aestheticEmphasis (which
// style tag to lean into). Returns { outfitId } or null.
async function generateDailyOutfit({ userId, slot, dateStr, location, excludeItemIds, aestheticEmphasis }) {
  const eventDescription = eventDescriptionForSlot(slot, dateStr);
  const body = {
    userId,
    eventDescription,
    location: location || undefined,
    date:     dateStr,
    excludeItemIds:    Array.isArray(excludeItemIds) && excludeItemIds.length > 0 ? excludeItemIds : undefined,
    aestheticEmphasis: aestheticEmphasis || undefined,
  };
  const req = new Request("http://internal/api/outfits/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  try {
    const res = await generateOutfitPOST(req);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error(`[daily-outfits] generate failed for slot=${slot}:`, errBody);
      return null;
    }
    const data = await res.json();
    return data?.id ? { outfitId: data.id } : null;
  } catch (err) {
    console.error(`[daily-outfits] generate threw for slot=${slot}:`, err);
    return null;
  }
}

// Read user's style_descriptors once per request — used to compute the
// per-shuffle aesthetic emphasis.
async function getUserStyleDescriptors(userId) {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("style_descriptors")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.style_descriptors ?? [];
}

// Given an outfit row joined into the daily_outfits result, extract the
// item_ids it selected. Used to build the exclude list for the next shuffle.
function selectedItemIdsFromOutfit(outfit) {
  const sel = outfit?.generated_outfit?.selected_items ?? [];
  return sel.map((s) => s?.item_id).filter(Boolean);
}

// Look up a user's default city for the weather block. Optional; missing is fine.
async function getUserLocation(userId) {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("default_location")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.default_location?.city ?? null;
}

// Build the rich `slot` payload the client expects. `existing` is the
// daily_outfits row joined to its outfit.
function buildSlotPayload(existing, shuffleLimit) {
  if (!existing) return null;
  const outfit  = existing.outfit ?? existing.outfits ?? null;
  return {
    daily_id:       existing.id,
    slot:           existing.slot,
    outfit_id:      existing.outfit_id,
    shuffle_count:  existing.shuffle_count,
    shuffle_limit:  shuffleLimit,
    outfit:         outfit,
  };
}

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request) {
  // [TIMING] temporary instrumentation — remove once slowness is diagnosed.
  const TIMING_TAG = "[daily-outfits TIMING]";
  const tStart = Date.now();
  const ms = (from) => `${Date.now() - from}ms`;

  let t = Date.now();
  const userId = await userIdFromAuthHeader(request);
  console.log(`${TIMING_TAG} auth.getUser → ${ms(t)}`);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url     = new URL(request.url);
  const dateStr = url.searchParams.get("date") ?? todayUtc();
  const limit   = shuffleLimitForUser(userId);
  console.log(`${TIMING_TAG} request → user=${userId} date=${dateStr}`);

  // Closet size — drives the < 5 items fallback on the client
  t = Date.now();
  const { count: closetCount } = await supabaseAdmin
    .from("wardrobe_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  console.log(`${TIMING_TAG} wardrobe count → ${ms(t)} (count=${closetCount ?? 0})`);

  const closet = closetCount ?? 0;
  if (closet < CLOSET_MINIMUM_FOR_DAILY) {
    console.log(`${TIMING_TAG} closet < minimum, short-circuit → total ${ms(tStart)}`);
    return Response.json({
      closet_count:    closet,
      closet_minimum:  CLOSET_MINIMUM_FOR_DAILY,
      shuffle_limit:   limit,
      date:            dateStr,
      daytime:         null,
      evening:         null,
    });
  }

  // Existing slots for this date
  t = Date.now();
  const { data: rows, error: selectErr } = await supabaseAdmin
    .from("daily_outfits")
    .select("*, outfit:outfits(*)")
    .eq("user_id", userId)
    .eq("generated_for_date", dateStr);
  console.log(`${TIMING_TAG} daily_outfits select → ${ms(t)} (rows=${rows?.length ?? 0}${selectErr ? ` err=${selectErr.message}` : ""})`);

  const bySlot = Object.fromEntries((rows ?? []).map((r) => [r.slot, r]));
  console.log(`${TIMING_TAG} cache state → daytime=${bySlot.daytime ? "HIT" : "MISS"} evening=${bySlot.evening ? "HIT" : "MISS"}`);

  // Generate any missing slots in parallel. Initial generation uses
  // aesthetic emphasis from the user's first style descriptor (attempt 0).
  const missing = ["daytime", "evening"].filter((s) => !bySlot[s]);
  if (missing.length > 0) {
    console.log(`${TIMING_TAG} CACHE MISS — generating slots: ${missing.join(", ")}`);
    t = Date.now();
    const [location, descriptors] = await Promise.all([
      getUserLocation(userId),
      getUserStyleDescriptors(userId),
    ]);
    console.log(`${TIMING_TAG} location + descriptors fetch → ${ms(t)}`);
    const initialEmphasis = aestheticEmphasisFor({ style_descriptors: descriptors }, 0);

    t = Date.now();
    const generated = await Promise.all(
      missing.map((slot) =>
        generateDailyOutfit({ userId, slot, dateStr, location, aestheticEmphasis: initialEmphasis })
      )
    );
    console.log(`${TIMING_TAG} Claude generation (${missing.length} parallel) → ${ms(t)} (results=${generated.map((g) => g ? "ok" : "null").join(",")})`);

    t = Date.now();
    let insertedCount = 0;
    for (let i = 0; i < missing.length; i++) {
      const slot = missing[i];
      const gen  = generated[i];
      if (!gen) continue;
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("daily_outfits")
        .insert({
          user_id:            userId,
          outfit_id:          gen.outfitId,
          generated_for_date: dateStr,
          slot,
          shuffle_count:      0,
        })
        .select("*, outfit:outfits(*)")
        .single();
      if (insertErr) console.log(`${TIMING_TAG} daily_outfits insert FAILED for slot=${slot}: ${insertErr.code} ${insertErr.message}`);
      if (inserted) { bySlot[slot] = inserted; insertedCount++; }
    }
    console.log(`${TIMING_TAG} daily_outfits inserts (${missing.length} sequential) → ${ms(t)} (inserted=${insertedCount}/${missing.length})`);
  } else {
    console.log(`${TIMING_TAG} CACHE HIT — both slots, no generation`);
  }

  console.log(`${TIMING_TAG} TOTAL → ${ms(tStart)}`);
  return Response.json({
    closet_count:   closet,
    closet_minimum: CLOSET_MINIMUM_FOR_DAILY,
    shuffle_limit:  limit,
    date:           dateStr,
    daytime:        buildSlotPayload(bySlot.daytime, limit),
    evening:        buildSlotPayload(bySlot.evening, limit),
  });
}

// ── POST (shuffle) ──────────────────────────────────────────────────────────

export async function POST(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const slot    = body?.slot;
  const dateStr = body?.date ?? todayUtc();
  if (!["daytime", "evening"].includes(slot)) {
    return Response.json({ error: "slot must be 'daytime' or 'evening'" }, { status: 400 });
  }

  const limit = shuffleLimitForUser(userId);

  // Fetch the current row + the outfit it points at (so we can extract its
  // items for the exclusion list passed to the next generation).
  const { data: existing } = await supabaseAdmin
    .from("daily_outfits")
    .select("*, outfit:outfits(*)")
    .eq("user_id", userId)
    .eq("generated_for_date", dateStr)
    .eq("slot", slot)
    .maybeSingle();

  const currentCount = existing?.shuffle_count ?? 0;
  if (currentCount >= limit) {
    return Response.json(
      { error: "shuffle_limit_reached", shuffle_count: currentCount, shuffle_limit: limit },
      { status: 429 }
    );
  }

  // Build the shuffle-variety hints:
  //   - excludeItemIds: items from the outfit being replaced (don't repeat)
  //   - aestheticEmphasis: cycle to the next style descriptor on each attempt
  const nextAttemptIndex = currentCount + 1; // 1 = first shuffle, 2 = second, ...
  const previousItemIds  = existing
    ? selectedItemIdsFromOutfit(existing.outfit)
    : [];

  const [location, descriptors] = await Promise.all([
    getUserLocation(userId),
    getUserStyleDescriptors(userId),
  ]);
  const emphasis = aestheticEmphasisFor({ style_descriptors: descriptors }, nextAttemptIndex);

  const gen = await generateDailyOutfit({
    userId,
    slot,
    dateStr,
    location,
    excludeItemIds:    previousItemIds,
    aestheticEmphasis: emphasis,
  });
  if (!gen) {
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }

  // Update existing row or insert new one. previous_outfit_item_ids records
  // the items we just excluded (the outfit being replaced) — both for
  // analytics and as a stored audit trail of what was suggested.
  let saved;
  if (existing) {
    const { data } = await supabaseAdmin
      .from("daily_outfits")
      .update({
        outfit_id:                gen.outfitId,
        shuffle_count:            currentCount + 1,
        previous_outfit_item_ids: previousItemIds,
      })
      .eq("id", existing.id)
      .select("*, outfit:outfits(*)")
      .single();
    saved = data;
  } else {
    const { data } = await supabaseAdmin
      .from("daily_outfits")
      .insert({
        user_id:                  userId,
        outfit_id:                gen.outfitId,
        generated_for_date:       dateStr,
        slot,
        shuffle_count:            1, // first generation via shuffle counts as 1
        previous_outfit_item_ids: [],
      })
      .select("*, outfit:outfits(*)")
      .single();
    saved = data;
  }

  if (!saved) {
    return Response.json({ error: "Failed to save daily outfit" }, { status: 500 });
  }

  return Response.json({ slot: buildSlotPayload(saved, limit) });
}
