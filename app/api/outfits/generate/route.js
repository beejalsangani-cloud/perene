import { supabaseAdmin } from "@/lib/supabase-admin";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  const { userId, eventDescription, location, date } = await request.json();

  if (!userId || !eventDescription?.trim()) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Fetch wardrobe + style profile in parallel
  const [wardrobeRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from("wardrobe_items")
      .select("id, category, color, season, notes")
      .eq("user_id", userId),
    supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (wardrobeRes.error) {
    console.error("[outfits/generate] wardrobe fetch error:", wardrobeRes.error);
  }
  if (profileRes.error) {
    console.error("[outfits/generate] profile fetch error:", profileRes.error);
  }

  const items   = wardrobeRes.data ?? [];
  const profile = profileRes.data;

  // ── Build prompt context ──────────────────────────────────────────────────
  const profileLines = profile
    ? [
        profile.gender        && `Gender: ${profile.gender}`,
        profile.age_range     && `Age range: ${profile.age_range}`,
        profile.body_type     && `Body type: ${profile.body_type}`,
        profile.style_descriptors?.length  && `Style keywords: ${profile.style_descriptors.join(", ")}`,
        profile.typical_events?.length     && `Typical occasions: ${profile.typical_events.join(", ")}`,
        profile.color_preferences?.length  && `Colour preferences: ${profile.color_preferences.join(", ")}`,
        profile.budget_range  && `Budget per item: ${profile.budget_range}`,
      ].filter(Boolean)
    : ["No style profile available — use general best-practice styling."];

  const wardrobeLines = items.length
    ? items.map((item, i) =>
        `${i + 1}. item_id=${item.id} | category=${item.category ?? "Unknown"} | color=${item.color ?? "Unknown"} | seasons=${(item.season ?? []).join(", ") || "All"} | notes=${item.notes || "—"}`
      )
    : ["(Wardrobe is empty — no items to select from.)"];

  const systemPrompt =
    "You are a world-class personal stylist. Analyse the user's wardrobe and style profile, then build the best possible outfit for their occasion. Always respond with a single, valid JSON object — no markdown fences, no extra text.";

  const userPrompt = `Build an outfit for this occasion: "${eventDescription.trim()}"${
    location ? `\nLocation: ${location}` : ""
  }${date ? `\nDate / time: ${date}` : ""}

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
    const raw = message.content[0]?.text ?? "";
    // Strip any accidental markdown code fences
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
      user_id:          userId,
      event_description: eventDescription.trim(),
      location:         location ?? null,
      date:             date     ?? null,
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
