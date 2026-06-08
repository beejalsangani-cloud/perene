"use client";

// Right-column dashboard card showing saved outfits. Two states:
//   - 0 saved → empty-state prompt
//   - 1+ saved → count + last 3 thumbnails + "View all →" link to /saved
//
// Fetches the user's saved outfits + first-item signed URL per outfit
// for the thumbnail tile. Self-contained so the dashboard just mounts it.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function SavedSkeleton() {
  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6 animate-pulse min-h-[200px]"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="h-3 w-24 bg-[#C9A87C]/30 rounded-full mb-4"/>
      <div className="h-4 w-32 bg-[#2A3D2E]/8 rounded-full mb-5"/>
      <div className="flex gap-2">
        <div className="w-14 h-14 rounded-xl bg-[#2A3D2E]/6"/>
        <div className="w-14 h-14 rounded-xl bg-[#2A3D2E]/6"/>
        <div className="w-14 h-14 rounded-xl bg-[#2A3D2E]/6"/>
      </div>
    </div>
  );
}

export default function SavedLooksCard({ userId }) {
  const [data, setData] = useState(null); // null = loading; { count, thumbs }

  const load = useCallback(async () => {
    if (!userId) return;

    // Last 3 saved outfits, newest first
    const { data: outfits, error } = await supabase
      .from("outfits")
      .select("id, generated_outfit, saved_at")
      .eq("user_id", userId)
      .eq("is_saved", true)
      .order("saved_at", { ascending: false })
      .limit(3);
    if (error) { setData({ count: 0, thumbs: [] }); return; }

    // Total count (separate head query — cheap)
    const { count } = await supabase
      .from("outfits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_saved", true);

    if (!outfits?.length) {
      setData({ count: count ?? 0, thumbs: [] });
      return;
    }

    // Collect each outfit's first item id, fetch wardrobe rows, sign URLs
    const firstItemIds = outfits
      .map((o) => o.generated_outfit?.selected_items?.[0]?.item_id)
      .filter(Boolean);

    let urlMap = {};
    if (firstItemIds.length > 0) {
      const { data: items } = await supabase
        .from("wardrobe_items")
        .select("id, image_url")
        .in("id", firstItemIds);
      if (items?.length) {
        const { data: signed } = await supabase.storage
          .from("wardrobe")
          .createSignedUrls(items.map((i) => i.image_url), 3600);
        const byPath = Object.fromEntries(
          (signed ?? []).map(({ path, signedUrl }) => [path, signedUrl])
        );
        urlMap = Object.fromEntries(items.map((i) => [i.id, byPath[i.image_url] ?? null]));
      }
    }

    const thumbs = outfits.map((o) => {
      const firstId = o.generated_outfit?.selected_items?.[0]?.item_id ?? null;
      return { outfit_id: o.id, thumb: firstId ? (urlMap[firstId] ?? null) : null };
    });

    setData({ count: count ?? outfits.length, thumbs });
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (data === null) return <SavedSkeleton/>;

  // Empty state
  if (data.count === 0) {
    return (
      <div
        className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6 flex flex-col items-center justify-center gap-4 min-h-[200px] text-center"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] flex items-center justify-center text-[#2A3D2E]">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>Saved Looks</p>
          <p className="text-xs text-[#2A3D2E]/55 mt-1 max-w-[240px] leading-relaxed">
            No saved looks yet — tap the heart on any outfit to save it.
          </p>
        </div>
      </div>
    );
  }

  // Has saves
  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6 flex flex-col gap-4 min-h-[200px]"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest">Saved Looks</p>
          <p className="text-lg font-bold text-[#2A3D2E] mt-0.5" style={{ fontFamily: "var(--font-playfair)" }}>
            {data.count} saved
          </p>
        </div>
        <Link
          href="/saved"
          className="text-xs font-semibold text-[#C9A87C] hover:text-[#2A3D2E] underline underline-offset-2 transition-colors"
        >
          View all →
        </Link>
      </div>
      <div className="flex gap-2">
        {data.thumbs.map((t) => (
          <Link
            key={t.outfit_id}
            href={`/outfits/${t.outfit_id}`}
            className="w-16 h-16 rounded-xl overflow-hidden bg-[#EDE7D6] flex-shrink-0 flex items-center justify-center hover:opacity-85 transition-opacity"
          >
            {t.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.thumb} alt="" className="w-full h-full object-cover"/>
            ) : (
              <span className="text-[#2A3D2E]/20 text-2xl select-none">✦</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
