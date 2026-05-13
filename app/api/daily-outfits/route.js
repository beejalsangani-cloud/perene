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
// AI factors it in (e.g., Sunday brunch vs. Tuesday office). The "casual"
// framing keeps daily outfits from feeling like event styling.
function eventDescriptionForSlot(slot, dateStr) {
  const day = dayName(dateStr);
  if (slot === "daytime") {
    return `Daytime outfit for everyday wear on ${day} — office, errands, or casual daytime activities. Keep it practical and wearable rather than dressed-up.`;
  }
  return `Evening outfit for casual dinner, drinks, or relaxed social outing on ${day} evening. Slightly elevated from daytime but not formal.`;
}

// Generates a daily outfit by calling the existing /api/outfits/generate
// handler directly (no HTTP round-trip). Returns { outfitId } or null.
async function generateDailyOutfit({ userId, slot, dateStr, location }) {
  const eventDescription = eventDescriptionForSlot(slot, dateStr);
  const body = { userId, eventDescription, location: location || undefined, date: dateStr };
  const req  = new Request("http://internal/api/outfits/generate", {
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
  const userId = await userIdFromAuthHeader(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url     = new URL(request.url);
  const dateStr = url.searchParams.get("date") ?? todayUtc();
  const limit   = shuffleLimitForUser(userId);

  // Closet size — drives the < 5 items fallback on the client
  const { count: closetCount } = await supabaseAdmin
    .from("wardrobe_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const closet = closetCount ?? 0;
  if (closet < CLOSET_MINIMUM_FOR_DAILY) {
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
  const { data: rows } = await supabaseAdmin
    .from("daily_outfits")
    .select("*, outfit:outfits(*)")
    .eq("user_id", userId)
    .eq("generated_for_date", dateStr);

  const bySlot = Object.fromEntries((rows ?? []).map((r) => [r.slot, r]));

  // Generate any missing slots in parallel
  const missing = ["daytime", "evening"].filter((s) => !bySlot[s]);
  if (missing.length > 0) {
    const location = await getUserLocation(userId);
    const generated = await Promise.all(
      missing.map((slot) => generateDailyOutfit({ userId, slot, dateStr, location }))
    );

    for (let i = 0; i < missing.length; i++) {
      const slot = missing[i];
      const gen  = generated[i];
      if (!gen) continue;
      const { data: inserted } = await supabaseAdmin
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
      if (inserted) bySlot[slot] = inserted;
    }
  }

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

  // Fetch the current row for this slot/date
  const { data: existing } = await supabaseAdmin
    .from("daily_outfits")
    .select("*")
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

  // Generate a fresh outfit
  const location = await getUserLocation(userId);
  const gen      = await generateDailyOutfit({ userId, slot, dateStr, location });
  if (!gen) {
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }

  // Update existing row or insert new one
  let saved;
  if (existing) {
    const { data } = await supabaseAdmin
      .from("daily_outfits")
      .update({ outfit_id: gen.outfitId, shuffle_count: currentCount + 1 })
      .eq("id", existing.id)
      .select("*, outfit:outfits(*)")
      .single();
    saved = data;
  } else {
    const { data } = await supabaseAdmin
      .from("daily_outfits")
      .insert({
        user_id:            userId,
        outfit_id:          gen.outfitId,
        generated_for_date: dateStr,
        slot,
        shuffle_count:      1, // first generation via shuffle counts as 1
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
