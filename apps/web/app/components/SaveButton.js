"use client";

// Heart-icon save toggle. Two visual variants:
//   variant="icon"   — small floating overlay (top-right of outfit cards)
//   variant="button" — pill button with "Save / Saved" label (detail / new pages)
//
// Optimistic UI: state flips instantly on tap; reverts only if the API
// errors. Auth via Supabase access token. Click bubbling is blocked so
// hearts on linked cards don't navigate.

import { useState } from "react";
import { supabase } from "@/lib/supabase";

function HeartIcon({ filled, className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      className={className}
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SaveButton({ outfitId, initialSaved = false, variant = "icon", onChange }) {
  const [saved,   setSaved]   = useState(!!initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (pending || !outfitId) return;

    const next = !saved;
    setSaved(next); // optimistic
    setPending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("no_session");
      const res = await fetch("/api/outfits/save", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ outfitId, saved: next }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      if (typeof onChange === "function") onChange(next);
    } catch (err) {
      console.error("[SaveButton] toggle failed:", err);
      setSaved(!next); // revert
    } finally {
      setPending(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={saved ? "Unsave outfit" : "Save outfit"}
        title={saved ? "Saved — tap to unsave" : "Save this look"}
        className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer disabled:cursor-wait ${
          saved
            ? "bg-[#E84848]/90 text-white hover:bg-[#E84848]"
            : "bg-white/85 text-[#2A3D2E]/70 hover:bg-white hover:text-[#2A3D2E]"
        }`}
      >
        <HeartIcon filled={saved} className="w-4 h-4"/>
      </button>
    );
  }

  // variant === "button"
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs transition-colors cursor-pointer disabled:cursor-wait ${
        saved
          ? "bg-[#E84848] text-white hover:bg-[#d23a3a]"
          : "border border-[#2A3D2E]/15 text-[#2A3D2E]/70 hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E]"
      }`}
    >
      <HeartIcon filled={saved} className="w-3.5 h-3.5"/>
      {saved ? "Saved" : "Save this look"}
    </button>
  );
}
