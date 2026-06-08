import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase  = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request) {
  try {
    // User identity comes from the verified Bearer token, never the body.
    const { userId, response } = await requireUser(request);
    if (response) return response;

    // Fetch profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("style_descriptors, typical_events, color_preferences, gender, age_range, body_type, style_tips")
      .eq("user_id", userId)
      .maybeSingle();

    // Check cache
    if (profile?.style_tips?.tips && profile.style_tips.generated_at) {
      const age = Date.now() - new Date(profile.style_tips.generated_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({ tips: profile.style_tips.tips, cached: true });
      }
    }

    // Build prompt context
    const styleInfo = [
      profile?.style_descriptors?.length  && `Style: ${profile.style_descriptors.join(", ")}`,
      profile?.typical_events?.length     && `Occasions: ${profile.typical_events.join(", ")}`,
      profile?.color_preferences?.length  && `Colors: ${profile.color_preferences.join(", ")}`,
      profile?.gender                     && `Gender: ${profile.gender}`,
      profile?.age_range                  && `Age range: ${profile.age_range}`,
      profile?.body_type                  && `Body type: ${profile.body_type}`,
    ].filter(Boolean).join("\n");

    const prompt = styleInfo
      ? `You are a concise, expert personal stylist. Based on this person's style profile:\n${styleInfo}\n\nGive 4 short, practical styling tips personalized to them. Each tip should be 1-2 sentences max and immediately actionable.`
      : `You are a concise, expert personal stylist. Give 4 short, practical, universally helpful styling tips. Each tip should be 1-2 sentences max and immediately actionable.`;

    const msg = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role:    "user",
        content: `${prompt}\n\nRespond ONLY with a JSON array (no markdown, no explanation):\n[{"tip":"...","category":"..."},{"tip":"...","category":"..."},{"tip":"...","category":"..."},{"tip":"...","category":"..."}]\n\nCategory must be one of: Color, Fit, Layering, Accessories, Occasion, Fabric`,
      }],
    });

    let tips;
    try {
      let raw = msg.content[0].text.trim();
      raw = raw.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
      tips = JSON.parse(raw);
      if (!Array.isArray(tips)) throw new Error("not array");
    } catch {
      tips = [{ tip: "Invest in a few quality basics — they form the foundation of any great outfit.", category: "Fit" }];
    }

    // Cache in DB
    await supabase
      .from("user_profiles")
      .upsert(
        { user_id: userId, style_tips: { tips, generated_at: new Date().toISOString() } },
        { onConflict: "user_id" }
      );

    return NextResponse.json({ tips, cached: false });
  } catch (err) {
    console.error("[tips]", err);
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 });
  }
}
