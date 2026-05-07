import { supabaseAdmin } from "@/lib/supabase-admin";

// Persists optional first_name + marketing_opt_in to user_profiles right after
// signup. Uses the service-role client so it works even when email confirmation
// is on (the user isn't authenticated yet, so RLS would block a direct insert).
export async function POST(request) {
  const { userId, firstName, marketingOptIn } = await request.json();

  if (!userId) {
    return Response.json({ error: "Missing userId" }, { status: 400 });
  }

  const payload = {
    user_id:          userId,
    first_name:       (firstName ?? "").trim() || null,
    marketing_opt_in: !!marketingOptIn,
    updated_at:       new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[auth/post-signup] upsert error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
