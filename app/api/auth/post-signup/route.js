import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth";

// Persists optional first_name + marketing_opt_in to user_profiles right after
// signup. Uses the service-role client so it works even when email confirmation
// is on (the user isn't authenticated yet, so RLS would block a direct insert,
// and there's no session yet to send as a Bearer token).
//
// Because there's genuinely no token to verify in the pre-confirmation case,
// this route can't do a full requireUser() check like the others. Instead:
//   1. If a Bearer token IS present (confirmation off, or a session exists
//      for some other reason), verify it and require it to match the userId
//      the client is claiming — the strict, normal path.
//   2. If no token, fall back to a narrow check: the target auth user must
//      exist, must have been created in the last 10 minutes, and must not
//      already have a profile row. This still lets someone guess a live
//      userId and race the 10-minute window, but limits it to a single,
//      one-time, create-only write on a brand-new account — not an ongoing
//      read/overwrite vector on established users like the old unchecked
//      version was.
const FRESH_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request) {
  const { userId, firstName, marketingOptIn } = await request.json();

  if (!userId) {
    return Response.json({ error: "Missing userId" }, { status: 400 });
  }

  const tokenUserId = await getUserIdFromRequest(request);
  if (tokenUserId) {
    if (tokenUserId !== userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // No session yet — verify this is a genuinely fresh, unclaimed account.
    const { data: authUser, error: lookupErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (lookupErr || !authUser?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const createdAt = new Date(authUser.user.created_at).getTime();
    if (Date.now() - createdAt > FRESH_ACCOUNT_WINDOW_MS) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: existingProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existingProfile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
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
