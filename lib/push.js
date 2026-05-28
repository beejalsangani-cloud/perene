// Client-side Web Push helpers (foundation — we don't send anything yet).
// subscribeToPush() asks for notification permission, creates a PushManager
// subscription with our VAPID public key, and persists it to push_subscriptions
// via /api/push/subscribe. Called from NotificationOptIn after onboarding.

import { supabase } from "@/lib/supabase";

// VAPID public keys are base64url; PushManager wants a Uint8Array.
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Returns { ok: true } or { ok: false, reason }. reason is one of:
// "unsupported" | "no-vapid-key" | "denied" | "default" | "no-session" |
// "save-failed" | "error".
export async function subscribeToPush() {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, reason: "no-vapid-key" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: permission };

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { ok: false, reason: "no-session" };

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) return { ok: false, reason: "save-failed" };

    return { ok: true };
  } catch (err) {
    console.error("[push] subscribe failed:", err);
    return { ok: false, reason: "error" };
  }
}
