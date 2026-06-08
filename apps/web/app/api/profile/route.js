import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request) {
  const body = await request.json();
  const { userId, answers } = body;

  if (!userId) {
    return Response.json({ error: "Missing userId" }, { status: 400 });
  }

  const payload = {
    user_id: userId,
    gender: answers.gender ?? null,
    age_range: answers.age_range ?? null,
    body_type: answers.body_type ?? null,
    style_descriptors: answers.style_descriptors ?? [],
    lifestyle: answers.lifestyle ?? [],
    typical_events: answers.typical_events ?? [],
    budget_range: answers.budget_range ?? null,
    color_preferences: answers.color_preferences ?? [],
    updated_at: new Date().toISOString(),
  };

  console.log("[profile] upserting for user:", userId);

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[profile] Supabase error:", JSON.stringify(error, null, 2));
    return Response.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 }
    );
  }

  console.log("[profile] saved successfully");
  return Response.json({ ok: true }, { status: 200 });
}
