import { supabaseAdmin } from "@/lib/supabase-admin";
import Anthropic from "@anthropic-ai/sdk";

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
    // ── 1. Geocode ────────────────────────────────────────────────────────────
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) return null;

    const geoData = await geoRes.json();
    const place   = geoData.results?.[0];
    if (!place) return null;

    const { latitude, longitude, name, country_code } = place;

    // ── 2. Guard: only fetch if date is within the 16-day forecast window ─────
    const targetDate = new Date(dateStr + "T12:00:00Z");
    const today      = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const diffDays   = Math.floor((targetDate - today) / 86_400_000);
    if (diffDays < 0 || diffDays > 16) return null;

    // ── 3. Fetch forecast ─────────────────────────────────────────────────────
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
    console.error("[outfits/generate] weather fetch error:", err);
    return null;
  }
}

function formatDateForPrompt(dateStr) {
  // "2025-05-15" → "May 15, 2025"
  try {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  const { userId, eventDescription, location, date } = await request.json();

  if (!userId || !eventDescription?.trim()) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Fetch wardrobe + profile + weather in parallel
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
    // Weather only attempted when both location and a parseable date are present
    location && date ? fetchWeather(location, date) : Promise.resolve(null),
  ]);

  if (wardrobeRes.error) console.error("[outfits/generate] wardrobe error:", wardrobeRes.error);
  if (profileRes.error)  console.error("[outfits/generate] profile error:",  profileRes.error);

  const items   = wardrobeRes.data ?? [];
  const profile = profileRes.data;

  // ── Build prompt context ──────────────────────────────────────────────────
  const profileLines = profile
    ? [
        profile.gender                    && `Gender: ${profile.gender}`,
        profile.age_range                 && `Age range: ${profile.age_range}`,
        profile.body_type                 && `Body type: ${profile.body_type}`,
        profile.style_descriptors?.length && `Style keywords: ${profile.style_descriptors.join(", ")}`,
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

  // Weather block only injected when we have real data
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
${weatherBlock}
STYLE PROFILE:
${profileLines.join("\n")}

WARDROBE (${items.length} item${items.length === 1 ? "" : "s"}):
${wardrobeLines.join("\n")}

Return exactly this JSON structure:
{
  "selected_items": [
    { "item_id": "<uuid>", "role": "<top|bottom|dress|outerwear|shoes|accessory|bag>", "styling_note": "<one sentence on why this piece works>" }
  ],
  "styling_reasoning": "<2–3 sentences describing the overall look and why it suits the occasion>",
  "overall_vibe": "<3–5 words e.g. 'relaxed coastal chic'>",
  "missing_items": [
    { "item": "<item name>", "category": "<category>", "why": "<why it would elevate the look>", "price_range": "<e.g. $50–$150>" }
  ],
  "confidence_level": "<high|medium|low>",
  "human_review_recommended": <true|false>
}

Rules:
- Only use item_ids that appear in the wardrobe list above
- If wardrobe is empty, selected_items must be []
- List 1–3 missing_items that would complete or elevate the look
- confidence_level is "high" when every key role is filled, "medium" when 1–2 are missing, "low" when wardrobe is very sparse
- human_review_recommended is true when confidence_level is "low" or wardrobe has < 3 items`;

  // ── Call Claude ───────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    console.error("[outfits/generate] Claude API error:", err);
    return Response.json({ error: "AI generation failed", details: err.message }, { status: 500 });
  }

  // ── Parse response ────────────────────────────────────────────────────────
  let parsed;
  try {
    const raw     = message.content[0]?.text ?? "";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error("[outfits/generate] JSON parse error:", err, message.content[0]?.text);
    return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  // ── Save to database ──────────────────────────────────────────────────────
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
      missing_items: parsed.missing_items ?? [],
      confidence:    parsed.confidence_level ?? "medium",
    })
    .select()
    .single();

  if (dbErr) {
    console.error("[outfits/generate] DB insert error:", JSON.stringify(dbErr));
    return Response.json({ error: dbErr.message, code: dbErr.code }, { status: 500 });
  }

  return Response.json({ id: outfit.id });
}
