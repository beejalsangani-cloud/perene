"use client";

// Full grid of the user's saved outfits, newest-saved first. Each card links
// to the outfit detail page and has a heart toggle to unsave in place.
// Empty state mirrors the dashboard SavedLooksCard messaging plus a CTA
// back to the dashboard.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardNav from "@/app/components/DashboardNav";
import SaveButton from "@/app/components/SaveButton";

function formatSavedDate(iso) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1)  return "Saved today";
  if (days === 1) return "Saved yesterday";
  if (days < 7)  return `Saved ${days} days ago`;
  if (days < 30) return `Saved ${Math.floor(days / 7)}w ago`;
  return `Saved ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// ── Collage (matches /outfits index pattern) ──────────────────────────────

function Collage({ urls }) {
  const safe = (urls ?? []).filter(Boolean);
  if (safe.length === 0) {
    return <div className="aspect-[4/3] bg-[#EDE7D6] flex items-center justify-center text-[#2A3D2E]/20 text-3xl select-none">✦</div>;
  }
  if (safe.length === 1) {
    return (
      <div className="aspect-[4/3] overflow-hidden bg-[#EDE7D6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safe[0]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
      </div>
    );
  }
  if (safe.length === 2) {
    return (
      <div className="aspect-[4/3] grid grid-cols-2 gap-px bg-[#EDE7D6]">
        {safe.map((u, i) => (
          <div key={i} className="overflow-hidden bg-[#EDE7D6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
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
        <img src={safe[0]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
      </div>
      <div className="flex flex-col gap-px">
        {right.map((u, i) => (
          <div key={i} className="flex-1 overflow-hidden bg-[#EDE7D6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Saved outfit card ──────────────────────────────────────────────────────

function SavedCard({ outfit, onUnsave }) {
  // Slot label comes from the daily_outfit row joined in; if none, this was
  // a manually-generated outfit.
  const slotLabel = outfit.daily_slot === "daytime"
    ? "Daytime suggestion"
    : outfit.daily_slot === "evening"
      ? "Evening suggestion"
      : "Generated outfit";

  const event = outfit.event_description?.trim();

  return (
    <Link
      href={`/outfits/${outfit.id}`}
      className="group relative rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white flex flex-col hover:border-[#C4E552]/60 hover:shadow-md transition-all"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="relative">
        <Collage urls={outfit.collage_urls}/>
        <div className="absolute top-2.5 right-2.5">
          <SaveButton
            outfitId={outfit.id}
            initialSaved={true}
            variant="icon"
            onChange={(next) => { if (!next) onUnsave(); }}
          />
        </div>
      </div>
      <div className="px-4 py-4 flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-[#C9A87C] uppercase tracking-widest">
          {slotLabel}
        </p>
        {event && (
          <p className="text-sm font-semibold text-[#2A3D2E] line-clamp-2 leading-snug"
             style={{ fontFamily: "var(--font-playfair)" }}>
            {event}
          </p>
        )}
        <p className="text-[11px] text-[#2A3D2E]/45">{formatSavedDate(outfit.saved_at)}</p>
      </div>
    </Link>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 text-center"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="w-20 h-20 rounded-full bg-[#2A3D2E]/6 flex items-center justify-center text-[#2A3D2E]/25 mb-6">
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
        No saved looks yet
      </h3>
      <p className="text-[#2A3D2E]/50 text-sm mb-8 max-w-xs leading-relaxed">
        Tap the heart on any outfit to save it here.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-95 transition-all"
      >
        Back to dashboard →
      </Link>
    </div>
  );
}

// ── Grid skeleton ──────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white animate-pulse">
          <div className="aspect-[4/3] bg-[#2A3D2E]/6"/>
          <div className="p-4 flex flex-col gap-2">
            <div className="h-3 w-1/2 rounded-full bg-[#C9A87C]/30"/>
            <div className="h-4 w-3/4 rounded-full bg-[#2A3D2E]/8"/>
            <div className="h-3 w-1/3 rounded-full bg-[#2A3D2E]/5"/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const router = useRouter();
  const [user,      setUser]      = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [outfits,   setOutfits]   = useState(null); // null = loading

  // Auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      setAuthReady(true);
    });
  }, [router]);

  // Load all saved outfits + slot labels + collage thumbs
  const load = useCallback(async (uid) => {
    // 1. All saved outfits, newest-saved first
    const { data: outfitRows, error } = await supabase
      .from("outfits")
      .select("*")
      .eq("user_id", uid)
      .eq("is_saved", true)
      .order("saved_at", { ascending: false });
    if (error || !outfitRows?.length) { setOutfits([]); return; }

    // 2. Daily-outfit slot labels for whichever of these are daily-generated
    const { data: dailyRows } = await supabase
      .from("daily_outfits")
      .select("outfit_id, slot")
      .in("outfit_id", outfitRows.map((o) => o.id));
    const slotByOutfit = Object.fromEntries((dailyRows ?? []).map((r) => [r.outfit_id, r.slot]));

    // 3. Collect every referenced wardrobe item id
    const allItemIds = new Set();
    for (const o of outfitRows) {
      for (const s of (o.generated_outfit?.selected_items ?? [])) {
        if (s?.item_id) allItemIds.add(s.item_id);
      }
    }

    let urlByItem = {};
    if (allItemIds.size > 0) {
      const { data: items } = await supabase
        .from("wardrobe_items")
        .select("id, image_url")
        .in("id", Array.from(allItemIds))
        .eq("user_id", uid);
      if (items?.length) {
        const { data: signed } = await supabase.storage
          .from("wardrobe")
          .createSignedUrls(items.map((i) => i.image_url), 3600);
        const byPath = Object.fromEntries((signed ?? []).map(({ path, signedUrl }) => [path, signedUrl]));
        urlByItem = Object.fromEntries(items.map((i) => [i.id, byPath[i.image_url] ?? null]));
      }
    }

    // 4. Attach slot label + collage URLs to each outfit
    setOutfits(outfitRows.map((o) => ({
      ...o,
      daily_slot:   slotByOutfit[o.id] ?? null,
      collage_urls: (o.generated_outfit?.selected_items ?? [])
        .slice(0, 4)
        .map((s) => urlByItem[s.item_id])
        .filter(Boolean),
    })));
  }, []);

  useEffect(() => {
    if (authReady && user) load(user.id);
  }, [authReady, user, load]);

  // When a card is un-hearted (SaveButton fires its toggle), the API has
  // already cleared is_saved. We refresh the page state by removing the
  // card optimistically. The SaveButton itself owns the API call.
  function handleUnsave(outfitId) {
    setOutfits((prev) => (prev ?? []).filter((o) => o.id !== outfitId));
  }

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin"/>
      </main>
    );
  }

  const count = outfits?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <DashboardNav user={user}/>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14" style={{ fontFamily: "var(--font-inter)" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-start sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mb-2">
              Your saved looks
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              Saved Looks
            </h1>
            <p className="mt-1.5 text-[#2A3D2E]/50 text-sm">
              {outfits === null
                ? "Loading…"
                : count === 0
                ? "Nothing saved yet"
                : `${count} look${count === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {/* ── Grid / empty / skeleton ─────────────────────────────────── */}
        {outfits === null ? (
          <GridSkeleton/>
        ) : count === 0 ? (
          <EmptyState/>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outfits.map((o) => (
              <SavedCard key={o.id} outfit={o} onUnsave={() => handleUnsave(o.id)}/>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
