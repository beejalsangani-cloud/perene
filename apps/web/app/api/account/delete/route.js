// Account deletion (Apple App Store requirement: users must be able to delete
// their account from within the app). Irreversible.
//
// DELETE → removes the authenticated user entirely:
//   1. Deletes every object under the user's folder in the "wardrobe" storage
//      bucket (paths are `${userId}/…`, see apps/mobile/lib/wardrobe.ts). Storage
//      is NOT covered by the auth.users ON DELETE CASCADE, so we clear it first.
//   2. Deletes the auth.users row via the admin API, which cascades all
//      user-scoped tables (user_profiles, wardrobe_items, outfits, daily_outfits,
//      outfit_wear_log, push_subscriptions, device_push_tokens — every one has
//      `on delete cascade`).
//
// Identity comes only from the verified Bearer token (requireUser); a caller can
// only ever delete themselves.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/auth";

const BUCKET = "wardrobe";

// Remove every object under `${userId}/` in the wardrobe bucket. Paginates so a
// large closet is fully cleared. Best-effort: a storage failure is logged but
// does not block auth-user deletion (orphaned files can be swept later).
async function deleteUserStorage(userId) {
  const prefix = `${userId}`;
  let removed = 0;
  // Supabase list() caps at 100 by default; loop until a short page.
  for (let page = 0; ; page++) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, offset: page * 100 });
    if (error) {
      console.error("[account/delete] storage list error:", error);
      return { removed, error };
    }
    if (!data || data.length === 0) break;

    const paths = data.map((f) => `${prefix}/${f.name}`);
    const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
    if (rmErr) {
      console.error("[account/delete] storage remove error:", rmErr);
      return { removed, error: rmErr };
    }
    removed += paths.length;
    if (data.length < 100) break;
  }
  return { removed, error: null };
}

export async function DELETE(request) {
  const { userId, response } = await requireUser(request);
  if (response) return response;

  // 1. Storage (best-effort — logged, non-blocking).
  await deleteUserStorage(userId);

  // 2. Auth user → cascades all user-scoped tables.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account/delete] deleteUser error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log("[account/delete] deleted user:", userId);
  return Response.json({ ok: true });
}
