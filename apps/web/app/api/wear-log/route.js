// Did You Wear This — yesterday's outfit prompts.
//
// GET  → returns yesterday's outfits the user hasn't responded to yet, with
//        signed thumbnail URLs for the banner. Lazily creates an outfit_wear_log
//        row (worn=null, prompted_at=now) for each outfit shown so we can
//        distinguish "auto-filed no response" from "never prompted" later.
// POST → records the user's response. Body:
//          { outfitId, worn: true | false, reason?: 'wrong_vibe' | ... }
//        worn=false without a reason is allowed (transient state between
//        the 👎 tap and the reason picker selection).
//
// Outfits prompted include:
//   - The daytime + evening slots from daily_outfits for yesterday
//   - Any manually-generated outfits from yesterday (in `outfits` but not
//     pointed to by daily_outfits)
//
// 48-hour cutoff: GET only ever asks about outfits within the last 48h.

import { supabaseAdmin } from "@/lib/supabase-admin";

const PROMPT_WINDOW_HOURS = 48;
const VALID_REASONS       = new Set(["wrong_vibe", "weather_changed", "didnt_feel_like_it", "other"]);

async function userIdFromAuthHeader(request) {
  const header = request.headers.get("authorization") ?? "";
  const token  = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

function todayUtc() { return new Date().toISOString().slice(0, 10); }

function dayBefore(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url      = new URL(request.url);
  const todayStr = url.searchParams.get("date") ?? todayUtc();
  const yStr     = dayBefore(todayStr);
  const cutoffMs = Date.now() - PROMPT_WINDOW_HOURS * 60 * 60 * 1000;

  // 1. Yesterday's daily_outfits (daytime + evening)
  const { data: dailyRows } = await supabaseAdmin
    .from("daily_outfits")
    .select("outfit_id, slot, outfit:outfits(id, generated_outfit, created_at)")
    .eq("user_id", userId)
    .eq("generated_for_date", yStr);

  const dailyOutfitIds = new Set((dailyRows ?? []).map((r) => r.outfit_id));

  // 2. Manually-generated outfits from yesterday, NOT in the daily set.
  // We bound by created_at because manual outfits don't have a "for this day"
  // notion — we treat them as "for the day they were generated".
  const yesterdayStart = yStr + "T00:00:00Z";
  const todayStart     = todayStr + "T00:00:00Z";
  const { data: manualRows } = await supabaseAdmin
    .from("outfits")
    .select("id, generated_outfit, created_at")
    .eq("user_id", userId)
    .gte("created_at", yesterdayStart)
    .lt("created_at", todayStart);

  const manualOnly = (manualRows ?? []).filter((o) => !dailyOutfitIds.has(o.id));

  // 3. Assemble candidate list — those within the 48h prompt window
  const candidates = [];
  for (const r of dailyRows ?? []) {
    if (!r.outfit) continue;
    candidates.push({
      outfit_id: r.outfit_id,
      source:    r.slot === "daytime" ? "today_daytime" : "today_evening",
      outfit:    r.outfit,
    });
  }
  for (const o of manualOnly) {
    if (new Date(o.created_at).getTime() < cutoffMs) continue; // older than 48h, skip
    candidates.push({
      outfit_id: o.id,
      source:    "manual",
      outfit:    { id: o.id, generated_outfit: o.generated_outfit, created_at: o.created_at },
    });
  }

  if (candidates.length === 0) {
    return Response.json({ outfits: [], target_date: yStr });
  }

  // 4. Existing wear log rows for these outfits
  const { data: existing } = await supabaseAdmin
    .from("outfit_wear_log")
    .select("outfit_id, worn, responded_at")
    .eq("user_id", userId)
    .in("outfit_id", candidates.map((c) => c.outfit_id));

  const byOutfit = Object.fromEntries((existing ?? []).map((r) => [r.outfit_id, r]));

  // 5. Lazy-create wear log rows for outfits that don't have one
  const toCreate = candidates
    .filter((c) => !byOutfit[c.outfit_id])
    .map((c) => ({
      user_id:       userId,
      outfit_id:     c.outfit_id,
      outfit_date:   yStr,
      outfit_source: c.source,
      prompted_at:   new Date().toISOString(),
    }));

  if (toCreate.length > 0) {
    const { error } = await supabaseAdmin.from("outfit_wear_log").insert(toCreate);
    if (error) console.error("[wear-log] insert error:", error);
  }

  // 6. Filter to "still needs response" set (no row yet OR worn=null)
  const unanswered = candidates.filter((c) => {
    const ex = byOutfit[c.outfit_id];
    return !ex || ex.worn === null;
  });

  if (unanswered.length === 0) {
    return Response.json({ outfits: [], target_date: yStr });
  }

  // 7. Fetch first-item thumbnails for each unanswered outfit
  const firstItemIds = unanswered
    .map((c) => c.outfit?.generated_outfit?.selected_items?.[0]?.item_id)
    .filter(Boolean);

  let thumbnailByItemId = {};
  if (firstItemIds.length > 0) {
    const { data: items } = await supabaseAdmin
      .from("wardrobe_items")
      .select("id, image_url")
      .in("id", firstItemIds)
      .eq("user_id", userId);

    if (items?.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("wardrobe")
        .createSignedUrls(items.map((i) => i.image_url), 3600);
      const urlMap = Object.fromEntries(
        (signed ?? []).map(({ path, signedUrl }) => [path, signedUrl])
      );
      thumbnailByItemId = Object.fromEntries(
        items.map((i) => [i.id, urlMap[i.image_url] ?? null])
      );
    }
  }

  const out = unanswered.map((c) => {
    const firstItemId = c.outfit?.generated_outfit?.selected_items?.[0]?.item_id ?? null;
    return {
      outfit_id:     c.outfit_id,
      source:        c.source,
      thumbnail_url: firstItemId ? (thumbnailByItemId[firstItemId] ?? null) : null,
      vibe:          c.outfit?.generated_outfit?.overall_vibe ?? null,
    };
  });

  return Response.json({ outfits: out, target_date: yStr });
}

// ── POST ────────────────────────────────────────────────────────────────────

export async function POST(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { outfitId, worn, reason } = body ?? {};
  if (typeof outfitId !== "string" || !outfitId) {
    return Response.json({ error: "Missing outfitId" }, { status: 400 });
  }
  if (worn !== true && worn !== false) {
    return Response.json({ error: "worn must be true or false" }, { status: 400 });
  }

  // CHECK constraint on the table requires reason is null unless worn=false.
  // We also normalize: reason on worn=true is silently ignored.
  const normalizedReason = worn === false && typeof reason === "string" && VALID_REASONS.has(reason) ? reason : null;

  const { error } = await supabaseAdmin
    .from("outfit_wear_log")
    .update({
      worn,
      not_worn_reason: normalizedReason,
      responded_at:    new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("outfit_id", outfitId);

  if (error) {
    console.error("[wear-log] POST update error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
