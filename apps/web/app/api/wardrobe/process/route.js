import { supabaseAdmin } from "@/lib/supabase-admin";
import Anthropic from "@anthropic-ai/sdk";

// ── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessory", "Bag", "Other"];
const SEASONS    = ["Spring", "Summer", "Fall", "Winter", "All-season"];
const COLORS     = ["Black", "White", "Cream", "Beige", "Brown", "Gray", "Navy", "Forest", "Pastels", "Bold", "Other"];

const DAILY_UPLOAD_LIMIT = 20;
const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

// ── Throttle ─────────────────────────────────────────────────────────────────
async function checkThrottle(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("wardrobe_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) {
    console.error("[wardrobe/process] throttle query error:", error);
    return { allowed: true, count: null }; // fail-open on query errors
  }
  return { allowed: (count ?? 0) < DAILY_UPLOAD_LIMIT, count: count ?? 0 };
}

// ── Background removal (remove.bg) ───────────────────────────────────────────
// Returns { ok, base64?, mediaType? } — never throws. Caller falls back to original.
async function removeBackground(base64) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-api-key" };

  let res;
  try {
    res = await fetch(REMOVE_BG_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Api-Key":    apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_file_b64: base64,
        size:           "auto",
        format:         "png",
      }),
    });
  } catch (err) {
    console.error("[wardrobe/process] remove.bg fetch error:", err);
    return { ok: false, reason: "network" };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[wardrobe/process] remove.bg http", res.status, text.slice(0, 300));
    return { ok: false, reason: `http-${res.status}` };
  }

  const buffer = await res.arrayBuffer();
  const out    = Buffer.from(buffer).toString("base64");
  return { ok: true, base64: out, mediaType: "image/png" };
}

// ── Garment metadata detection (Claude vision) ───────────────────────────────
// Returns { category, color, seasons } with whitelist validation, or null on failure.
async function detectMetadata(base64, mediaType) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type:   "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analyse this clothing item photo and return a JSON object with exactly these three fields:

"category": pick the single best match from ${JSON.stringify(CATEGORIES)}
"color": pick the single best match from ${JSON.stringify(COLORS)} based on the dominant colour
"seasons": an array of the most appropriate values from ${JSON.stringify(SEASONS)}

Return only the raw JSON object — no markdown, no explanation.`,
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[wardrobe/process] Claude error:", err);
    return null;
  }

  try {
    const raw     = message.content[0]?.text?.trim() ?? "";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed  = JSON.parse(jsonStr);
    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : null,
      color:    COLORS.includes(parsed.color)         ? parsed.color    : null,
      seasons:  (parsed.seasons ?? []).filter((s) => SEASONS.includes(s)),
    };
  } catch (err) {
    console.error("[wardrobe/process] Claude parse error:", err);
    return null;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────
// Pipeline: throttle → remove.bg (with fallback to original) → Claude vision → return.
// Never deletes the user's local photo on failure — every failure returns *something*
// the client can save with.
export async function POST(request) {
  const { imageBase64, mediaType, userId } = await request.json();

  if (!imageBase64 || !mediaType || !userId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1. Daily upload throttle (counts saved items in the last 24h)
  const throttle = await checkThrottle(userId);
  if (!throttle.allowed) {
    return Response.json({
      error:   "daily-limit",
      message: `You've added ${throttle.count} items in the last 24 hours. Daily limit is ${DAILY_UPLOAD_LIMIT} — try again tomorrow.`,
      limit:   DAILY_UPLOAD_LIMIT,
    }, { status: 429 });
  }

  const warnings = [];

  // 2. Background removal — fall back to original on any failure
  let processedBase64    = imageBase64;
  let processedMediaType = mediaType;
  let bgRemoved          = false;

  const bg = await removeBackground(imageBase64);
  if (bg.ok) {
    processedBase64    = bg.base64;
    processedMediaType = bg.mediaType;
    bgRemoved          = true;
  } else {
    warnings.push("Background removal unavailable — your photo is saved as-is.");
  }

  // 3. AI metadata detection — uses bg-removed image when available (cleaner signal)
  const metadata = (await detectMetadata(processedBase64, processedMediaType)) ?? {
    category: null,
    color:    null,
    seasons:  [],
  };
  if (!metadata.category && !metadata.color && !metadata.seasons?.length) {
    warnings.push("Auto-detection didn't find clear matches — please fill in the fields manually.");
  }

  return Response.json({
    processedImage: { base64: processedBase64, mediaType: processedMediaType },
    metadata,
    bgRemoved,
    warnings,
  });
}
