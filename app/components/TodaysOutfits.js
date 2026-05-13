"use client";

// Today's Outfits — two-slot daily AI generation rendered above the
// Style Profile / Your Wardrobe grid. Pulls from /api/daily-outfits:
//   GET  → fetch (auto-generates missing slots)
//   POST → /shuffle to regenerate a slot
//
// Empty-closet (<5 items) and insufficient-pieces-for-slot fallbacks are
// rendered inline. Shuffle limit (3/slot/day for free tier) comes from the
// API so we don't have to know about tiers on the client.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SHUFFLE_LIMIT_FALLBACK = 3;

function todayLocalForDailyOutfits() {
  // The day boundary for "today's outfits" is 4am local time — before 4am we
  // still show yesterday's. After 4am we show today's. Honors the spec.
  const now = new Date();
  if (now.getHours() < 4) now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function firstSentence(text) {
  if (!text) return "";
  const t = text.trim();
  const match = t.match(/^[^.!?]+[.!?]/);
  return (match ? match[0] : t).trim();
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

// ── Collage ─────────────────────────────────────────────────────────────────
// Up to 4 wardrobe images in an asymmetric layout: 1 hero left, up to 3
// stacked thumbs right. Matches the visual pattern from /outfits index.
function Collage({ urls }) {
  const safe = (urls ?? []).filter(Boolean);
  if (safe.length === 0) {
    return (
      <div className="aspect-[4/3] bg-[#EDE7D6] flex items-center justify-center text-[#2A3D2E]/20 text-3xl select-none">✦</div>
    );
  }
  if (safe.length === 1) {
    return (
      <div className="aspect-[4/3] overflow-hidden bg-[#EDE7D6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safe[0]} alt="" className="w-full h-full object-cover"/>
      </div>
    );
  }
  if (safe.length === 2) {
    return (
      <div className="aspect-[4/3] grid grid-cols-2 gap-px bg-[#EDE7D6]">
        {safe.map((u, i) => (
          <div key={i} className="overflow-hidden bg-[#EDE7D6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover"/>
          </div>
        ))}
      </div>
    );
  }
  const right = safe.slice(1, 4);
  return (
    <div className="aspect-[4/3] grid grid-cols-3 gap-px bg-[#EDE7D6]">
      <div className="col-span-2 overflow-hidden bg-[#EDE7D6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safe[0]} alt="" className="w-full h-full object-cover"/>
      </div>
      <div className="flex flex-col gap-px">
        {right.map((u, i) => (
          <div key={i} className="flex-1 overflow-hidden bg-[#EDE7D6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover"/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slot card ──────────────────────────────────────────────────────────────

function SlotCard({ label, slot, payload, onShuffle, shuffling, signedItemUrls }) {
  if (!payload) {
    return <SlotSkeleton label={label}/>;
  }

  const outfit          = payload.outfit;
  const selectedItems   = outfit?.generated_outfit?.selected_items ?? [];
  const shuffleCount    = payload.shuffle_count ?? 0;
  const shuffleLimit    = payload.shuffle_limit ?? SHUFFLE_LIMIT_FALLBACK;
  const shufflesLeft    = Math.max(0, shuffleLimit - shuffleCount);
  const atLimit         = shuffleCount >= shuffleLimit;

  // Insufficient-items-for-slot fallback: AI returned < 3 selected items.
  if (selectedItems.length < 3) {
    return (
      <div
        className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6 flex flex-col gap-4"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest">{label}</p>
        <p className="text-sm text-[#2A3D2E]/70 leading-relaxed">
          You don&apos;t have enough {label.toLowerCase()} pieces yet — Perene needs a few more options to style this slot.
        </p>
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          <Link
            href="/wardrobe#upload"
            className="px-4 py-2.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-xs hover:bg-[#d4f562] transition-colors"
          >
            Add to closet →
          </Link>
          <Link
            href={`/outfits/${payload.outfit_id}`}
            className="px-4 py-2.5 rounded-full border border-[#2A3D2E]/15 text-[#2A3D2E]/65 font-semibold text-xs hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] transition-colors"
          >
            Shop the look →
          </Link>
        </div>
      </div>
    );
  }

  const description   = firstSentence(outfit?.generated_outfit?.styling_reasoning);
  const collageUrls   = selectedItems
    .slice(0, 4)
    .map((s) => signedItemUrls[s.item_id])
    .filter(Boolean);

  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white overflow-hidden flex flex-col"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <Collage urls={collageUrls}/>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest">{label}</p>
          {outfit?.generated_outfit?.overall_vibe && (
            <span className="text-[10px] italic text-[#2A3D2E]/45 truncate ml-2">
              {outfit.generated_outfit.overall_vibe}
            </span>
          )}
        </div>
        <p className="text-sm text-[#2A3D2E]/70 leading-relaxed line-clamp-3 flex-1">
          {description || `Today's ${label.toLowerCase()} look from your closet.`}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
          <Link
            href={`/outfits/${payload.outfit_id}`}
            className="px-4 py-2.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-xs hover:bg-[#d4f562] transition-colors"
          >
            See full look →
          </Link>
          <button
            type="button"
            onClick={() => onShuffle(slot)}
            disabled={atLimit || shuffling}
            title={atLimit ? `You've used your shuffles for today — come back tomorrow.` : `${shufflesLeft} shuffle${shufflesLeft === 1 ? "" : "s"} left`}
            className="px-4 py-2.5 rounded-full border border-[#2A3D2E]/15 text-[#2A3D2E]/65 font-semibold text-xs hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {shuffling ? "Shuffling…" : atLimit ? "No shuffles left" : `Shuffle (${shufflesLeft})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SlotSkeleton({ label }) {
  return (
    <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[#2A3D2E]/6"/>
      <div className="p-5 flex flex-col gap-2.5">
        <div className="h-3 w-20 rounded-full bg-[#C9A87C]/30"/>
        <div className="h-3 w-3/4 rounded-full bg-[#2A3D2E]/8"/>
        <div className="h-3 w-2/3 rounded-full bg-[#2A3D2E]/8"/>
        <div className="flex gap-2 pt-2">
          <div className="h-7 w-24 rounded-full bg-[#C4E552]/30"/>
          <div className="h-7 w-20 rounded-full bg-[#2A3D2E]/8"/>
        </div>
      </div>
    </div>
  );
}

// ── Empty-closet fallback ──────────────────────────────────────────────────

function EmptyClosetCard({ count, minimum }) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed border-[#C9A87C]/40 bg-white p-8 flex flex-col items-start gap-4"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest">Today&apos;s outfits</p>
      <h3 className="text-xl font-bold text-[#2A3D2E] leading-snug" style={{ fontFamily: "var(--font-playfair)" }}>
        Upload {minimum - count} more {minimum - count === 1 ? "piece" : "pieces"} to unlock your daily outfits.
      </h3>
      <p className="text-sm text-[#2A3D2E]/55 leading-relaxed">
        Perene needs at least {minimum} items in your closet to start styling looks for you each day.
      </p>
      <Link
        href="/wardrobe#upload"
        className="px-5 py-2.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] transition-colors"
      >
        Add to closet →
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TodaysOutfits({ user }) {
  const [data,           setData]           = useState(null); // null = loading
  const [shufflingSlot,  setShufflingSlot]  = useState(null);
  const [error,          setError]          = useState("");
  const [signedItemUrls, setSignedItemUrls] = useState({});

  const dateStr = todayLocalForDailyOutfits();

  // Resolve signed URLs for all selected items across both slots
  const resolveItemUrls = useCallback(async (payloadData) => {
    const itemIds = new Set();
    for (const slot of ["daytime", "evening"]) {
      const sel = payloadData?.[slot]?.outfit?.generated_outfit?.selected_items ?? [];
      for (const s of sel) {
        if (s?.item_id) itemIds.add(s.item_id);
      }
    }
    if (itemIds.size === 0) {
      setSignedItemUrls({});
      return;
    }
    const { data: items } = await supabase
      .from("wardrobe_items")
      .select("id, image_url")
      .in("id", Array.from(itemIds));
    if (!items?.length) return;
    const { data: signed } = await supabase.storage
      .from("wardrobe")
      .createSignedUrls(items.map((i) => i.image_url), 3600);
    const urlMap = Object.fromEntries(
      (signed ?? []).map(({ path, signedUrl }) => [path, signedUrl])
    );
    setSignedItemUrls(
      Object.fromEntries(items.map((i) => [i.id, urlMap[i.image_url] ?? null]))
    );
  }, []);

  const load = useCallback(async () => {
    try {
      const auth = await getAuthHeader();
      const res  = await fetch(`/api/daily-outfits?date=${dateStr}`, { headers: { ...auth } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const payload = await res.json();
      setData(payload);
      resolveItemUrls(payload);
    } catch (err) {
      console.error("[TodaysOutfits] load failed:", err);
      setError("Couldn't load today's outfits — please refresh.");
    }
  }, [dateStr, resolveItemUrls]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  async function handleShuffle(slot) {
    if (shufflingSlot) return;
    setShufflingSlot(slot);
    try {
      const auth = await getAuthHeader();
      const res  = await fetch("/api/daily-outfits", {
        method:  "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body:    JSON.stringify({ slot, date: dateStr }),
      });
      if (res.status === 429) {
        // Limit reached — refresh state so the button locks
        await load();
        return;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { slot: updated } = await res.json();
      setData((prev) => prev ? { ...prev, [slot]: updated } : prev);
      resolveItemUrls({ ...data, [slot]: updated });
    } catch (err) {
      console.error(`[TodaysOutfits] shuffle ${slot} failed:`, err);
    } finally {
      setShufflingSlot(null);
    }
  }

  // Loading skeleton
  if (data === null) {
    return (
      <section className="mb-8" style={{ fontFamily: "var(--font-inter)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest">Today&apos;s outfits</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SlotSkeleton label="Daytime"/>
          <SlotSkeleton label="Evening"/>
        </div>
      </section>
    );
  }

  // Empty closet
  if ((data.closet_count ?? 0) < (data.closet_minimum ?? 5)) {
    return (
      <section className="mb-8">
        <EmptyClosetCard count={data.closet_count ?? 0} minimum={data.closet_minimum ?? 5}/>
      </section>
    );
  }

  return (
    <section className="mb-8" style={{ fontFamily: "var(--font-inter)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest">Today&apos;s outfits</h2>
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#2A3D2E]/12">
          <span className="text-sm">⚠</span>
          <p className="text-sm text-[#2A3D2E] font-medium">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SlotCard
          label="Daytime"
          slot="daytime"
          payload={data.daytime}
          signedItemUrls={signedItemUrls}
          onShuffle={handleShuffle}
          shuffling={shufflingSlot === "daytime"}
        />
        <SlotCard
          label="Evening"
          slot="evening"
          payload={data.evening}
          signedItemUrls={signedItemUrls}
          onShuffle={handleShuffle}
          shuffling={shufflingSlot === "evening"}
        />
      </div>
    </section>
  );
}
