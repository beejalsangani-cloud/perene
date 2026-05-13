"use client";

// Did You Wear This — soft prompt asking about yesterday's outfits.
// Renders nothing when:
//   - the user has skipped this prompt for today (localStorage flag)
//   - no outfits from the last 48h need a response
//
// 👍 → records worn=true and removes the row from the banner
// 👎 → reveals a reason picker; selection records worn=false + reason
// Skip → sets the per-day localStorage flag and hides the banner

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const REASONS = [
  { key: "wrong_vibe",         label: "Wrong vibe" },
  { key: "weather_changed",    label: "Weather changed" },
  { key: "didnt_feel_like_it", label: "Didn't feel like it" },
  { key: "other",              label: "Other" },
];

function todayLocal() {
  const now = new Date();
  if (now.getHours() < 4) now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function skipKeyFor(dateStr) {
  return `perene:wear-prompt-skip:${dateStr}`;
}

function sourceLabel(source) {
  if (source === "today_daytime") return "Daytime";
  if (source === "today_evening") return "Evening";
  return "Generated outfit";
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

// ── Individual row ──────────────────────────────────────────────────────────

function PromptRow({ item, onAnswer }) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function thumbsUp() {
    if (submitting) return;
    setSubmitting(true);
    await onAnswer(item.outfit_id, true, null);
    // Parent removes the item from state, so we don't reset submitting locally
  }

  async function thumbsDown() {
    if (submitting) return;
    setReasonOpen(true);
  }

  async function chooseReason(reasonKey) {
    if (submitting) return;
    setSubmitting(true);
    await onAnswer(item.outfit_id, false, reasonKey);
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#2A3D2E]/8"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#EDE7D6] flex-shrink-0 flex items-center justify-center">
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover"/>
        ) : (
          <span className="text-[#2A3D2E]/20 text-xl select-none">✦</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest">
          {sourceLabel(item.source)}
        </p>
        {item.vibe && (
          <p className="text-xs text-[#2A3D2E]/55 italic truncate">{item.vibe}</p>
        )}
      </div>

      {!reasonOpen ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={thumbsUp}
            disabled={submitting}
            aria-label="I wore it"
            className="w-9 h-9 rounded-full bg-[#C4E552]/20 hover:bg-[#C4E552]/40 text-[#2A3D2E] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4-7a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v5h5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 19 18h-8.5L7 20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={thumbsDown}
            disabled={submitting}
            aria-label="I didn't wear it"
            className="w-9 h-9 rounded-full bg-[#2A3D2E]/8 hover:bg-[#2A3D2E]/15 text-[#2A3D2E] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Zm0 0-4 7a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v-5H4a2 2 0 0 1-2-2.3l1-6A2 2 0 0 1 5 6h8.5L17 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 justify-end">
          {REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => chooseReason(r.key)}
              disabled={submitting}
              className="px-2.5 py-1.5 rounded-full bg-[#2A3D2E]/5 hover:bg-[#2A3D2E]/12 text-[#2A3D2E]/75 text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function WearPrompt({ user }) {
  const [items,   setItems]   = useState(null); // null = loading, [] = nothing to show
  const [skipped, setSkipped] = useState(false);

  const dateStr = todayLocal();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSkipped(localStorage.getItem(skipKeyFor(dateStr)) === "1");
  }, [dateStr]);

  const load = useCallback(async () => {
    try {
      const auth = await getAuthHeader();
      const res  = await fetch(`/api/wear-log?date=${dateStr}`, { headers: { ...auth } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setItems(data?.outfits ?? []);
    } catch (err) {
      console.error("[WearPrompt] load failed:", err);
      setItems([]); // fail-silent; banner just doesn't appear
    }
  }, [dateStr]);

  useEffect(() => {
    if (!user || skipped) return;
    load();
  }, [user, skipped, load]);

  async function handleAnswer(outfitId, worn, reason) {
    try {
      const auth = await getAuthHeader();
      const res  = await fetch("/api/wear-log", {
        method:  "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body:    JSON.stringify({ outfitId, worn, reason }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (err) {
      console.error("[WearPrompt] answer failed:", err);
      // Optimistic remove anyway — next mount will re-fetch and surface
      // anything still unanswered.
    }
    setItems((prev) => (prev ?? []).filter((it) => it.outfit_id !== outfitId));
  }

  function handleSkip() {
    if (typeof window !== "undefined") {
      localStorage.setItem(skipKeyFor(dateStr), "1");
    }
    setSkipped(true);
  }

  if (skipped) return null;
  if (items === null || items.length === 0) return null;

  return (
    <section
      className="mb-8 rounded-2xl border border-[#C9A87C]/30 bg-[#C9A87C]/8 p-5"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mb-0.5">Yesterday&apos;s looks</p>
          <h3 className="text-lg font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
            Did you wear them?
          </h3>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-semibold text-[#2A3D2E]/50 hover:text-[#2A3D2E]/75 underline underline-offset-2 transition-colors cursor-pointer flex-shrink-0"
        >
          Skip
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <PromptRow key={item.outfit_id} item={item} onAnswer={handleAnswer}/>
        ))}
      </div>
    </section>
  );
}
