"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardNav from "@/app/components/DashboardNav";

// ── Date helpers ──────────────────────────────────────────────────────────────
// Two formatters, in priority order: an explicit occasion date wins ("For
// Saturday"); otherwise we fall back to a relative-time stamp on the row's
// created_at ("Generated 3 days ago"). Both return null when their input is
// unusable so the caller can decide between them.

function formatOccasionDate(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00Z");
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.floor((target - today) / 86_400_000);

  if (diffDays === 0)  return "For today";
  if (diffDays === 1)  return "For tomorrow";
  if (diffDays === -1) return "For yesterday";
  if (diffDays > 1 && diffDays <= 6) {
    const day = target.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    return `For ${day}`;
  }
  if (diffDays < -1 && diffDays >= -6) {
    const day = target.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    return `Last ${day}`;
  }
  const formatted = target.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return diffDays > 0 ? `For ${formatted}` : `On ${formatted}`;
}

function formatRelativeGenerated(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1)   return "Generated today";
  if (days === 1) return "Generated yesterday";
  if (days < 7)   return `Generated ${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Generated ${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  const m = Math.floor(days / 30);
  return `Generated ${m} ${m === 1 ? "month" : "months"} ago`;
}

function getDateLabel(outfit) {
  return formatOccasionDate(outfit.date) ?? formatRelativeGenerated(outfit.created_at);
}

// ── Collage ───────────────────────────────────────────────────────────────────
// Asymmetric layout: 1 large hero image + up to 3 stacked thumbs to the right.
// Falls back gracefully for outfits with fewer items, deleted wardrobe pieces,
// or signed-URL failures (any null URL is filtered out before render).
function Collage({ items }) {
  const urls = (items ?? []).map((i) => i?.signedUrl).filter(Boolean);
  const count = urls.length;

  if (count === 0) {
    return (
      <div className="aspect-[4/3] bg-[#EDE7D6] flex items-center justify-center text-[#2A3D2E]/20 text-3xl select-none">
        ✦
      </div>
    );
  }

  if (count === 1) {
    return (
      <div className="aspect-[4/3] overflow-hidden bg-[#EDE7D6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="aspect-[4/3] grid grid-cols-2 gap-px bg-[#EDE7D6]">
        {urls.map((url, i) => (
          <div key={i} className="overflow-hidden bg-[#EDE7D6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </div>
        ))}
      </div>
    );
  }

  // 3+ items: 2-col-wide hero on the left, evenly stacked thumbs on the right
  // (capped at 3 so the right column doesn't get too thin).
  const right = urls.slice(1, 4);
  return (
    <div className="aspect-[4/3] grid grid-cols-3 gap-px bg-[#EDE7D6]">
      <div className="col-span-2 overflow-hidden bg-[#EDE7D6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="flex flex-col gap-px">
        {right.map((url, i) => (
          <div key={i} className="flex-1 overflow-hidden bg-[#EDE7D6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Outfit card ───────────────────────────────────────────────────────────────
function OutfitCard({ outfit }) {
  const occasion  = outfit.event_description?.trim();
  const dateLabel = getDateLabel(outfit);

  return (
    <Link
      href={`/outfits/${outfit.id}`}
      className="group rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white flex flex-col hover:border-[#C4E552]/60 hover:shadow-md transition-all"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <Collage items={outfit.items} />
      <div className="px-4 py-4 flex flex-col gap-1.5">
        {occasion && (
          <p
            className="text-sm font-semibold text-[#2A3D2E] line-clamp-2 leading-snug"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {occasion}
          </p>
        )}
        {dateLabel && (
          <p className="text-[11px] text-[#2A3D2E]/45">
            {dateLabel}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 text-center"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="w-20 h-20 rounded-full bg-[#2A3D2E]/6 flex items-center justify-center text-[#2A3D2E]/25 mb-6">
        <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
          <path d="M24 6l3.09 9.26H38l-7.27 5.27 2.78 8.54L24 24.1l-7.51 5.07 2.78-8.54L8 15.26h8.91L24 6z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
        No outfits yet
      </h3>
      <p className="text-[#2A3D2E]/50 text-sm mb-8 max-w-xs leading-relaxed">
        Tell Perene what you&apos;re dressing for and we&apos;ll style you from your closet.
      </p>
      <Link
        href="/outfits/new"
        className="px-6 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-95 transition-all"
      >
        Generate your first outfit →
      </Link>
    </div>
  );
}

// ── Grid skeleton ─────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white animate-pulse">
          <div className="aspect-[4/3] bg-[#2A3D2E]/6"/>
          <div className="p-4 flex flex-col gap-2">
            <div className="h-4 w-3/4 rounded-full bg-[#2A3D2E]/8"/>
            <div className="h-3 w-1/3 rounded-full bg-[#2A3D2E]/5"/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OutfitsPage() {
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

  // Fetch outfits + their wardrobe items + signed URLs in three batched calls
  // (one per kind of resource), then attach items to each outfit by id. Items
  // that no longer exist in wardrobe_items (deleted by the user) silently drop
  // out of the collage instead of breaking the row.
  const loadOutfits = useCallback(async (uid) => {
    const { data: outfitRows, error: outfitErr } = await supabase
      .from("outfits")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (outfitErr) {
      console.error("[outfits] fetch error:", outfitErr);
      setOutfits([]);
      return;
    }
    if (!outfitRows?.length) {
      setOutfits([]);
      return;
    }

    // Collect every item id referenced across all outfits' selected_items
    const allItemIds = new Set();
    for (const o of outfitRows) {
      const sel = o.generated_outfit?.selected_items ?? [];
      for (const s of sel) {
        if (s?.item_id) allItemIds.add(s.item_id);
      }
    }

    let itemsById = {};
    if (allItemIds.size > 0) {
      const { data: itemRows } = await supabase
        .from("wardrobe_items")
        .select("id, image_url, category")
        .in("id", Array.from(allItemIds))
        .eq("user_id", uid);

      if (itemRows?.length) {
        const { data: signed } = await supabase.storage
          .from("wardrobe")
          .createSignedUrls(itemRows.map((r) => r.image_url), 3600);

        const urlMap = Object.fromEntries(
          (signed ?? []).map(({ path, signedUrl }) => [path, signedUrl])
        );
        itemsById = Object.fromEntries(
          itemRows.map((r) => [r.id, { ...r, signedUrl: urlMap[r.image_url] ?? null }])
        );
      }
    }

    setOutfits(
      outfitRows.map((o) => ({
        ...o,
        items: (o.generated_outfit?.selected_items ?? [])
          .map((s) => itemsById[s.item_id])
          .filter(Boolean),
      }))
    );
  }, []);

  useEffect(() => {
    if (authReady && user) loadOutfits(user.id);
  }, [authReady, user, loadOutfits]);

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
              Your outfits
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              Your Looks
            </h1>
            <p className="mt-1.5 text-[#2A3D2E]/50 text-sm">
              {outfits === null
                ? "Loading…"
                : count === 0
                ? "No outfits yet"
                : `${count} look${count === 1 ? "" : "s"}`}
            </p>
          </div>
          {(outfits === null || count > 0) && (
            <Link
              href="/outfits/new"
              className="px-5 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-95 transition-all"
            >
              Generate an outfit →
            </Link>
          )}
        </div>

        {/* ── Grid / empty / skeleton ──────────────────────────────────── */}
        {outfits === null ? (
          <GridSkeleton />
        ) : count === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outfits.map((o) => (
              <OutfitCard key={o.id} outfit={o} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
