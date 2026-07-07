// Native device push token storage (foundation only — no notifications sent yet).
// POST   → upsert the caller's Expo push token into device_push_tokens.
// DELETE → remove a token (e.g. on sign-out or when permission is revoked).
//
// The mobile app registers for push via expo-notifications and gets an Expo
// push token (ExponentPushToken[…]). This is distinct from the Web Push
// subscription stored by /api/push/subscribe, so it lives in its own table.
// Auth mirrors the other routes: the Supabase access token in the Authorization
// header identifies the user; we then write with the service-role client scoped
// to that verified user_id. token is UNIQUE, so a re-register from the same
// device upserts rather than duplicating (and re-points to the current user).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/auth";

export async function POST(request) {
  const { userId, response } = await requireUser(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body?.token === "string" ? body.token.trim() : null;
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const platform = body?.platform === "ios" || body?.platform === "android"
    ? body.platform
    : null;

  const { error } = await supabaseAdmin.from("device_push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      device_name:
        typeof body?.deviceName === "string" ? body.deviceName.slice(0, 200) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    console.error("[push/device-token] upsert error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const { userId, response } = await requireUser(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const token = typeof body?.token === "string" ? body.token.trim() : null;
  if (!token) return Response.json({ error: "Missing token" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("device_push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("token", token);

  if (error) {
    console.error("[push/device-token] delete error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
