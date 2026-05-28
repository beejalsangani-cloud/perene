"use client";

// Post-onboarding notification opt-in (push foundation).
// The dashboard only mounts this once the user has completed onboarding (≥1
// closet item), satisfying "ask after signup + onboarding, not on first visit".
//
// We never call Notification.requestPermission() on mount — that's an instant
// browser-denied if it's a surprise. Instead we show a soft brand card; the
// native permission prompt only fires when the user taps "Enable". On success
// the subscription is stored via /api/push/subscribe. Nothing is sent yet.
//
// Renders nothing unless: push is supported, permission is still "default",
// and the card wasn't dismissed in the last 14 days.

import { useEffect, useState } from "react";
import { pushSupported, subscribeToPush } from "@/lib/push";

const DISMISS_KEY = "perene:push-optin-dismissed-at";
const DISMISS_DAYS = 14;

function dismissedRecently() {
  const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (!at) return false;
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function NotificationOptIn() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pushSupported()) return;
    if (Notification.permission !== "default") return; // already granted/denied
    if (dismissedRecently()) return;
    // Defer in a timeout (not a synchronous setState in the effect body) so the
    // dashboard paints before the card appears.
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  }

  async function enable() {
    if (busy) return;
    setBusy(true);
    const result = await subscribeToPush();
    setBusy(false);
    if (result.ok) {
      setDone(true);
      setTimeout(() => setVisible(false), 1800);
    } else {
      // Denied or failed — don't nag again for a while.
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <section
      className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-2xl border border-[#C9A87C]/30 bg-[#C9A87C]/8"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="flex items-start gap-3 flex-1">
        <span className="text-[#C9A87C] text-base flex-shrink-0 mt-0.5">✦</span>
        <p className="text-sm text-[#2A3D2E]/75 leading-relaxed">
          {done ? (
            <span className="font-semibold text-[#2A3D2E]">
              You&apos;re all set — we&apos;ll keep you posted.
            </span>
          ) : (
            <>
              <span className="font-semibold text-[#2A3D2E]">
                Never miss your daily look.
              </span>{" "}
              Turn on notifications and Perene can nudge you each morning.
            </>
          )}
        </p>
      </div>
      {!done && (
        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="px-5 py-2.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {busy ? "Enabling…" : "Enable"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="px-3 py-2.5 text-sm font-semibold text-[#2A3D2E]/55 hover:text-[#2A3D2E]/80 transition-colors cursor-pointer"
          >
            Not now
          </button>
        </div>
      )}
    </section>
  );
}
