// Outfit generation core. Extracted from app/api/outfits/generate/route.js so
// it can be called two ways without an in-process HTTP round-trip:
//   1. The HTTP route (app/api/outfits/generate/route.js) — authenticates the
//      caller via Bearer token, then calls generateOutfit({ userId, ... }).
//   2. Today's Suggestions (app/api/daily-outfits/route.js) — already has the
//      authenticated userId and calls generateOutfit({ userId, ... }) directly.
//
// The userId passed in is ALWAYS a server-trusted value (from a verified token
// or an already-authenticated request) — never raw client input.
import { supabaseAdmin } from "@/lib/supabase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { RETAILER_PROMPT_LINES, findRetailer } from "@/lib/affiliate";

// ── Weather helpers ───────────────────────────────────────────────────────────

const WMO_LABELS = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Light snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Rain showers", 81: "Moderate showers", 82: "Heavy showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
};

function labelFromCode(code) {
  if (WMO_LABELS[code]) return WMO_LABELS[code];
  if (code <= 3)  return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  return "Thunderstorm";
}

// Returns a weather object or null (never throws)
async function fetchWeather(location, dateStr) {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) return null;

    const geoData = await geoRes.json();
    const place   = geoData.results?.[0];
    if (!place) return null;

    const { latitude, longitude, name, country_code } = place;

    const targetDate = new Date(dateStr + "T12:00:00Z");
    const today      = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const diffDays   = Math.floor((targetDate - today) / 86_400_000);
    if (diffDays < 0 || diffDays > 16) return null;

    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&temperature_unit=fahrenheit&timezone=auto` +
      `&start_date=${dateStr}&end_date=${dateStr}`
    );
    if (!wxRes.ok) return null;

    const wxData = await wxRes.json();
    const d      = wxData.daily;
    if (d?.temperature_2m_max?.[0] == null) return null;

    const code = d.weathercode?.[0] ?? 0;

    return {
      location:             `${name}${country_code ? `, ${country_code}` : ""}`,
      date:                 dateStr,
      temperature_high:     Math.round(d.temperature_2m_max[0]),
      temperature_low:      Math.round(d.temperature_2m_min[0]),
      precipitation_chance: d.precipitation_probability_max?.[0] ?? 0,
      weather_code:         code,
      condition:            labelFromCode(code),
    };
  } catch (err) {
    console.error("[generate-outfit] weather fetch error:", err);
    return null;
  }
}

// ── Retailer suggestion sanitization ──────────────────────────────────────────
function sanitizeRetailers(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out  = [];
  for (const r of raw) {
    if (!r || typeof r.search_query !== "string") continue;
    const canonical = findRetailer(r.name);
    if (!canonical) continue;
    if (seen.has(canonical.name)) continue;
    const query = r.search_query.trim();
    if (!query) continue;
    seen.add(canonical.name);
    out.push({ name: canonical.name, search_query: query });
    if (out.length >= 3) break;
  }
  return out;
}

function sanitizeMissingItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => ({
    item:        m?.item        ?? "",
    category:    m?.category    ?? "",
    why:         m?.why         ?? "",
    price_range: m?.price_range ?? "",
    retailers:   sanitizeRetailers(m?.retailers),
  }));
}

// ── Inspiration-image URL validation ──────────────────────────────────────────
const INSPIRATION_HOST_ALLOWLIST = ["images.unsplash.com", "plus.unsplash.com"];

function sanitizeInspirationUrl(url) {
  if (typeof url !== "string" || !url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (!INSPIRATION_HOST_ALLOWLIST.includes(u.hostname.toLowerCase())) return null;
    return u.href;
  } catch {
    return null;
  }
}

function formatDateForPrompt(dateStr) {
  try {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate (and persist) an outfit for an authenticated user.
 *
 * @param {Object}   args
 * @param {string}   args.userId             server-trusted user id
 * @param {string}   args.eventDescription   required, non-empty
 * @param {string}  [args.location]
 * @param {string}  [args.date]              YYYY-MM-DD
 * @param {string}  [args.inspirationImageUrl]
 * @param {string[]}[args.excludeItemIds]
 * @param {string}  [args.aestheticEmphasis]
 * @returns {Promise<{ ok: true, id: string } | { ok: false, status: number, error: string, details?: string }>}
 */
export async function generateOutfit({
  userId,
  eventDescription,
  location,
  date,
  inspirationImageUrl,
  excludeItemIds,
  aestheticEmphasis,
}) {
  if (!userId || !eventDescription?.trim()) {
    return { ok: false, status: 400, error: "Missing required fields" };
  }

  const inspirationUrl = sanitizeInspirationUrl(inspirationImageUrl);

  const [wardrobeRes, profileRes, weather] = await Promise.all([
    supabaseAdmin
      .from("wardrobe_items")
      .select("id, category, color, season, notes")
      .eq("user_id", userId),
    supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    location && date ? fetchWeather(location, date) : Promise.resolve(null),
  ]);

  if (wardrobeRes.error) console.error("[generate-outfit] wardrobe error:", wardrobeRes.error);
  if (profileRes.error)  console.error("[generate-outfit] profile error:",  profileRes.error);

  const items   = wardrobeRes.data ?? [];
  const profile = profileRes.data;

  const profileLines = profile
    ? [
        profile.gender                    && `Gender: ${profile.gender}`,
        profile.age_range                 && `Age range: ${profile.age_range}`,
        profile.body_type                 && `Body type: ${profile.body_type}`,
        profile.style_descriptors?.length && `Style keywords: ${profile.style_descriptors.join(", ")}`,
        profile.lifestyle?.length         && `Lifestyle: ${profile.lifestyle.join(", ")}`,
        profile.typical_events?.length    && `Typical occasions: ${profile.typical_events.join(", ")}`,
        profile.color_preferences?.length && `Colour preferences: ${profile.color_preferences.join(", ")}`,
        profile.budget_range              && `Budget per item: ${profile.budget_range}`,
      ].filter(Boolean)
    : ["No style profile available — use general best-practice styling."];

  const wardrobeLines = items.length
    ? items.map((item, i) =>
        `${i + 1}. item_id=${item.id} | category=${item.category ?? "Unknown"} | color=${item.color ?? "Unknown"} | seasons=${(item.season ?? []).join(", ") || "All"} | notes=${item.notes || "—"}`
      )
    : ["(Wardrobe is empty — no items to select from.)"];

  const stylingLines = [
    aestheticEmphasis && typeof aestheticEmphasis === "string"
      ? `- Lean into the ${aestheticEmphasis.toLowerCase()} side of this user's style for today's look.`
      : null,
    Array.isArray(excludeItemIds) && excludeItemIds.length > 0
      ? `- Avoid these specific item_ids — the user just saw them and wants something visually different: ${excludeItemIds.join(", ")}`
      : null,
  ].filter(Boolean);
  const stylingDirectionBlock = stylingLines.length > 0
    ? `\nTODAY'S STYLING DIRECTION:\n${stylingLines.join("\n")}\n`
    : "";

  const inspirationBlock = inspirationUrl
    ? `\nINSPIRATION IMAGE:
An image is attached. Treat it as the user's visual reference for the look they want.
- Identify each visible garment in the image: top, bottom or dress, footwear, outerwear, accessories. Note color, silhouette, and material.
- Build the outfit by matching each visible garment to the CLOSEST wardrobe item by category and color. If two wardrobe items could fit a role, pick the one whose color most closely matches the image.
- For any piece clearly visible in the image that has no reasonable wardrobe match, list THAT specific piece in missing_items (e.g. "rust silk blouse", "cream wide-leg trouser") — not generic wardrobe gaps.
- Do NOT invent missing_items for pieces not visible in the image. If the image shows no jewelry, do not suggest jewelry.
- overall_vibe should describe the image's look, not the wardrobe.
- When an inspiration image is present, this overrides the generic "missing_items would complete or elevate the look" rule below — missing_items strictly mirrors what's in the image that the wardrobe lacks.\n`
    : "";

  const weatherBlock = weather
    ? `\nWEATHER FOR ${weather.location.toUpperCase()} ON ${formatDateForPrompt(date)}:
${weather.condition} · ${weather.temperature_high}°F high / ${weather.temperature_low}°F low · ${weather.precipitation_chance}% chance of precipitation

Factor this weather into your outfit selection:
- Below 50°F: prioritise warm layers and outerwear
- 50–65°F: light layers work well; a jacket is smart
- 65–80°F: most fabrics are comfortable; light cardigan optional
- Above 80°F: breathable, lightweight fabrics; avoid heavy materials
- Precipitation chance above 40%: prefer water-resistant outerwear; avoid suede and delicate fabrics
- Snow: waterproof footwear essential; warm insulating layers required\n`
    : "";

  const systemPrompt =
    "You are a world-class personal stylist. Analyse the user's wardrobe, style profile, and occasion — and account for weather when provided — to build the best possible outfit. Always respond with a single, valid JSON object — no markdown fences, no extra text.";

  const userPrompt = `Build an outfit for this occasion: "${eventDescription.trim()}"${
    location ? `\nLocation: ${location}` : ""
  }${date ? `\nDate: ${formatDateForPrompt(date)}` : ""}
${weatherBlock}${inspirationBlock}${stylingDirectionBlock}
STYLE PROFILE:
${profileLines.join("\n")}

WARDROBE (${items.length} item${items.length === 1 ? "" : "s"}):
${wardrobeLines.join("\n")}

RETAILER ROSTER — for each missing_item, pick 2–3 retailers from this list ranked by aesthetic match first, price fit second:
${RETAILER_PROMPT_LINES.join("\n")}

Return exactly this JSON structure:
{
  "selected_items": [
    { "item_id": "<uuid>", "role": "<top|bottom|dress|outerwear|shoes|accessory|bag>", "styling_note": "<one sentence on why this piece works>" }
  ],
  "styling_reasoning": "<2–3 sentences describing the overall look and why it suits the occasion>",
  "overall_vibe": "<3–5 words e.g. 'relaxed coastal chic'>",
  "missing_items": [
    {
      "item": "<item name>",
      "category": "<category>",
      "why": "<why it would elevate the look>",
      "price_range": "<e.g. $50–$150>",
      "retailers": [
        { "name": "<exact name from the roster above>", "search_query": "<2–6 keywords a shopper would type>" }
      ]
    }
  ],
  "confidence_level": "<high|medium|low>",
  "human_review_recommended": <true|false>
}

Rules:
- Only use item_ids that appear in the wardrobe list above
- If wardrobe is empty, selected_items must be []
- List 1–3 missing_items that would complete or elevate the look
- Each missing_item must include 2–3 retailers from the roster, ordered best match first
- Retailer "name" must be spelled exactly as in the roster (e.g. "Saks Fifth Avenue", "Net-a-Porter", "Free People")
- "search_query" is 2–6 plain keywords (no brand names, no quotes, no punctuation)
- Match retailer to item type — each retailer is narrow, respect the fit:
  - Reformation: dresses, romantic tops, occasion pieces, Parisian-style polished casual, knits, blouses; never blazers, suits, workwear, or heavy outerwear
  - Free People: boho, festival, casual layers; never formal/black-tie or polished workwear
  - Anthropologie: bohemian-eclectic, romantic, occasion-friendly; avoid streetwear or athletic pieces
  - Net-a-Porter and Saks Fifth Avenue: luxury/designer investment pieces ($300+), elevated knits and blouses, and fine jewelry; never for items the user wants under $200
  - Aritzia: elevated minimalist contemporary basics, workwear, knits, polished casual, blouses; avoid boho, festival, or super-formal occasion wear
  - Revolve: contemporary trend-forward going-out clothes, dresses, statement pieces; avoid minimalist basics or workwear
  - Nordstrom: broad department-store fallback; strong for shoes, denim, fine jewelry, mainstream brands; use as default when nothing else fits
  - ASOS: trendy, younger price points, fast-fashion-adjacent; use for trend pieces under $150
- If no retailer confidently fits an item, prefer 1–2 strong matches over forcing a third weak one — 2 confident retailers beat 3 with one that won't carry the item
- confidence_level is "high" when every key role is filled, "medium" when 1–2 are missing, "low" when wardrobe is very sparse
- human_review_recommended is true when confidence_level is "low" or wardrobe has < 3 items`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessageContent = inspirationUrl
    ? [
        { type: "image", source: { type: "url", url: inspirationUrl } },
        { type: "text",  text: userPrompt },
      ]
    : userPrompt;

  let message;
  try {
    message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessageContent }],
    });
  } catch (err) {
    // Image attachment can fail independently (Anthropic couldn't fetch the
    // URL, format rejected, size limits) — retry text-only so the user still
    // gets an outfit.
    if (inspirationUrl) {
      console.error("[generate-outfit] image attach failed, retrying text-only:", err.message);
      try {
        message = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
      } catch (err2) {
        console.error("[generate-outfit] Claude API error (text-only retry also failed):", err2);
        return { ok: false, status: 500, error: "AI generation failed", details: err2.message };
      }
    } else {
      console.error("[generate-outfit] Claude API error:", err);
      return { ok: false, status: 500, error: "AI generation failed", details: err.message };
    }
  }

  let parsed;
  try {
    const raw     = message.content[0]?.text ?? "";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error("[generate-outfit] JSON parse error:", err, message.content[0]?.text);
    return { ok: false, status: 500, error: "Failed to parse AI response" };
  }

  const { data: outfit, error: dbErr } = await supabaseAdmin
    .from("outfits")
    .insert({
      user_id:           userId,
      event_description: eventDescription.trim(),
      location:          location ?? null,
      date:              date     ?? null,
      weather:           weather  ?? null,
      generated_outfit: {
        selected_items:           parsed.selected_items           ?? [],
        styling_reasoning:        parsed.styling_reasoning        ?? "",
        overall_vibe:             parsed.overall_vibe             ?? "",
        confidence_level:         parsed.confidence_level         ?? "medium",
        human_review_recommended: parsed.human_review_recommended ?? false,
      },
      missing_items: sanitizeMissingItems(parsed.missing_items),
      confidence:    parsed.confidence_level ?? "medium",
    })
    .select()
    .single();

  if (dbErr) {
    console.error("[generate-outfit] DB insert error:", JSON.stringify(dbErr));
    return { ok: false, status: 500, error: dbErr.message };
  }

  // Stats: stamp last_outfit_at. Best-effort — never block on it.
  try {
    await supabaseAdmin
      .from("user_profiles")
      .update({ last_outfit_at: new Date().toISOString() })
      .eq("user_id", userId);
  } catch (err) {
    console.error("[generate-outfit] last_outfit_at update error:", err);
  }

  return { ok: true, id: outfit.id };
}
