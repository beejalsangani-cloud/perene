// Push subscription storage (foundation only — no notifications are sent yet).
// POST   → upsert the caller's browser PushSubscription into push_subscriptions.
// DELETE → remove a subscription by endpoint (e.g. on unsubscribe).
//
// Auth mirrors /api/daily-outfits: a Supabase access token in the Authorization
// header identifies the user; we then write with the service-role client
// (bypasses RLS) scoped to that verified user_id. endpoint is unique, so a
// re-subscribe from the same browser upserts rather than duplicating.

import { supabaseAdmin } from "@/lib/supabase-admin";

async function userIdFromAuthHeader(request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

export async function POST(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent:
        typeof body?.userAgent === "string" ? body.userAgent.slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/subscribe] upsert error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const endpoint = body?.endpoint;
  if (!endpoint) return Response.json({ error: "Missing endpoint" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[push/subscribe] delete error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
