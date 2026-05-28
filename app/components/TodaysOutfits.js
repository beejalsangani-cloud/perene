"use client";

// Today's Outfits — two-slot daily AI generation rendered above the
// Style Profile / Your Wardrobe grid. Pulls from /api/daily-outfits (GET).
// Cards are image-first magazine covers: hero photo with the label, overall
// vibe, and a single "See full look" CTA overlaid via a bottom gradient.
//
// Empty-closet (<5 items) and insufficient-pieces-for-slot fallbacks are
// rendered inline.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SaveButton from "@/app/components/SaveButton";

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

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

// ── Collage ─────────────────────────────────────────────────────────────────
// Magazine-cover style — a single tall hero image (or asymmetric grid when 2+
// items are available). 4:5 portrait aspect makes each card feel like an
// editorial cover on mobile.
function Collage({ urls }) {
  const safe = (urls ?? []).filter(Boolean);
  if (safe.length === 0) {
    return (
      <div className="aspect-[4/5] bg-gradient-to-br from-[#EDE7D6] to-[#C9A87C]/25 flex items-center justify-center text-[#2A3D2E]/20 text-4xl select-none">✦</div>
    );
  }
  if (safe.length === 1) {
    return (
      <div className="aspect-[4/5] overflow-hidden bg-[#EDE7D6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safe[0]} alt="" className="w-full h-full object-cover"/>
      </div>
    );
  }
  if (safe.length === 2) {
    return (
      <div className="aspect-[4/5] grid grid-cols-2 gap-px bg-[#EDE7D6]">
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
    <div className="aspect-[4/5] grid grid-cols-3 gap-px bg-[#EDE7D6]">
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

function SlotCard({ label, payload, signedItemUrls }) {
  if (!payload) {
    return <SlotSkeleton label={label}/>;
  }

  const outfit        = payload.outfit;
  const selectedItems = outfit?.generated_outfit?.selected_items ?? [];

  // Insufficient-items-for-slot fallback: AI returned < 3 selected items.
  // Render as a placeholder card with the same magazine shape as a real card
  // (gradient fills the image area, CTAs overlay the bottom).
  if (selectedItems.length < 3) {
    return (
      <div
        className="rounded-2xl border border-[#2A3D2E]/8 overflow-hidden flex flex-col relative"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <div className="aspect-[4/5] bg-gradient-to-br from-[#EDE7D6] via-[#C9A87C]/20 to-[#2A3D2E]/12 flex items-center justify-center">
          <span className="text-[#C9A87C]/45 text-5xl select-none">✦</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 pt-12 bg-gradient-to-t from-[#2A3D2E]/85 via-[#2A3D2E]/55 to-transparent flex flex-col gap-2">
          <p className="text-[10px] font-bold text-[#C4E552] uppercase tracking-[0.18em]">{label}</p>
          <p className="text-sm text-[#F5F1E8] font-medium leading-snug mb-2">
            Not enough {label.toLowerCase()} pieces yet.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/wardrobe#upload"
              className="px-3.5 py-2 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-xs hover:bg-[#d4f562] transition-colors"
            >
              Add to closet →
            </Link>
            <Link
              href={`/outfits/${payload.outfit_id}`}
              className="px-3.5 py-2 rounded-full border border-[#F5F1E8]/35 text-[#F5F1E8] font-semibold text-xs hover:bg-[#F5F1E8]/10 transition-colors"
            >
              Shop the look →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const collageUrls = selectedItems
    .slice(0, 4)
    .map((s) => signedItemUrls[s.item_id])
    .filter(Boolean);
  const vibe = outfit?.generated_outfit?.overall_vibe;

  // Card is a div; an absolutely-positioned <Link> covers the full surface for
  // tap-to-navigate. The SaveButton renders as a SIBLING on a higher z-index
  // so it doesn't end up as a <button> nested inside an <a> (invalid HTML).
  return (
    <div
      className="group rounded-2xl border border-[#2A3D2E]/8 bg-white overflow-hidden relative"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <Collage urls={collageUrls}/>

      {/* Full-card tap target. inset-0 so any tap on the card navigates;
          z-0 keeps it below the SaveButton overlay. */}
      <Link
        href={`/outfits/${payload.outfit_id}`}
        aria-label={`See full ${label.toLowerCase()} look`}
        className="absolute inset-0 z-0 active:scale-[0.99] transition-transform"
      />

      {/* Save button — sibling of the Link, higher z-index */}
      <div className="absolute top-3 right-3 z-20">
        <SaveButton
          outfitId={payload.outfit_id}
          initialSaved={!!outfit?.is_saved}
          variant="icon"
        />
      </div>

      {/* Bottom gradient + magazine-cover overlay: label, vibe, single CTA chip.
          pointer-events-none on the overlay container lets the Link below it
          receive the tap; the chip itself is purely visual. */}
      <div className="absolute inset-x-0 bottom-0 p-5 pt-16 bg-gradient-to-t from-[#2A3D2E]/90 via-[#2A3D2E]/45 to-transparent flex flex-col gap-2.5 pointer-events-none z-10">
        <p className="text-[10px] font-bold text-[#C4E552] uppercase tracking-[0.18em]">{label}</p>
        {vibe && (
          <p className="text-base font-bold text-[#F5F1E8] leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
            {vibe}
          </p>
        )}
        <span className="self-start mt-1 px-3.5 py-1.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-xs">
          See full look →
        </span>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SlotSkeleton({ label }) {
  return (
    <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white overflow-hidden animate-pulse relative">
      <div className="aspect-[4/5] bg-[#2A3D2E]/6"/>
      <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col gap-2">
        <div className="h-2.5 w-16 rounded-full bg-[#C9A87C]/30"/>
        <div className="h-4 w-2/3 rounded-full bg-[#2A3D2E]/12"/>
        <div className="h-7 w-28 rounded-full bg-[#C4E552]/30 mt-1"/>
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
      <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest">Today&apos;s suggestions</p>
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

  // Loading skeleton
  if (data === null) {
    return (
      <section className="mb-8" style={{ fontFamily: "var(--font-inter)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest">Today&apos;s suggestions</h2>
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
        <h2 className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest">Today&apos;s suggestions</h2>
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
          payload={data.daytime}
          signedItemUrls={signedItemUrls}
        />
        <SlotCard
          label="Evening"
          payload={data.evening}
          signedItemUrls={signedItemUrls}
        />
      </div>
    </section>
  );
}
