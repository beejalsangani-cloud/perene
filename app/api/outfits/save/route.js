// Toggle the is_saved flag on a user's outfit. Service-role write keeps the
// attack surface tight — without an UPDATE RLS policy on `outfits`, the only
// path to mutating an outfit is via this endpoint, scoped to the caller's
// user_id by the auth token check.

import { supabaseAdmin } from "@/lib/supabase-admin";

async function userIdFromAuthHeader(request) {
  const header = request.headers.get("authorization") ?? "";
  const token  = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

export async function POST(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { outfitId, saved } = body ?? {};
  if (typeof outfitId !== "string" || !outfitId) {
    return Response.json({ error: "Missing outfitId" }, { status: 400 });
  }
  if (typeof saved !== "boolean") {
    return Response.json({ error: "saved must be boolean" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("outfits")
    .update({
      is_saved: saved,
      saved_at: saved ? new Date().toISOString() : null,
    })
    .eq("id", outfitId)
    .eq("user_id", userId);

  if (error) {
    console.error("[outfits/save] error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, saved });
}
