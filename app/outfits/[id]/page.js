"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardNav from "@/app/components/DashboardNav";

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ level }) {
  const map = {
    high:   { label: "High confidence",   classes: "bg-[#C4E552]/25 text-[#2A3D2E]" },
    medium: { label: "Medium confidence", classes: "bg-[#C9A87C]/20 text-[#C9A87C]" },
    low:    { label: "Low confidence",    classes: "bg-[#2A3D2E]/8 text-[#2A3D2E]/55" },
  };
  const { label, classes } = map[level] ?? map.medium;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${classes}`}
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {label}
    </span>
  );
}

// ── Wardrobe item card ────────────────────────────────────────────────────────
function ItemCard({ item, role, stylingNote }) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white flex flex-col"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="aspect-square relative overflow-hidden bg-[#EDE7D6]">
        {item?.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.signedUrl}
            alt={item.category ?? role}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#2A3D2E]/20 text-3xl select-none">
            ✦
          </div>
        )}
        {/* Role pill */}
        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#2A3D2E]/70 text-white text-[10px] font-semibold capitalize backdrop-blur-sm">
          {role}
        </span>
      </div>
      <div className="px-3 py-3 flex flex-col gap-1">
        {item?.category && (
          <span className="text-xs font-semibold text-[#2A3D2E]">{item.category}</span>
        )}
        {stylingNote && (
          <p className="text-[11px] text-[#2A3D2E]/55 leading-relaxed">{stylingNote}</p>
        )}
      </div>
    </div>
  );
}

// ── Missing item row ──────────────────────────────────────────────────────────
function MissingItem({ item: { item, category, why, price_range } }) {
  return (
    <div
      className="flex items-start gap-4 py-4 border-b border-[#2A3D2E]/6 last:border-0"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Icon placeholder */}
      <div className="w-10 h-10 rounded-xl bg-[#2A3D2E]/6 flex-shrink-0 flex items-center justify-center text-[#2A3D2E]/30">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#2A3D2E]">{item}</span>
          {category && (
            <span className="px-2 py-0.5 rounded-full bg-[#2A3D2E]/6 text-[#2A3D2E]/60 text-[10px] font-semibold">
              {category}
            </span>
          )}
          {price_range && (
            <span className="text-[11px] text-[#C9A87C] font-medium">{price_range}</span>
          )}
        </div>
        {why && <p className="text-xs text-[#2A3D2E]/50 mt-0.5 leading-relaxed">{why}</p>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OutfitResultPage({ params }) {
  const { id } = use(params);
  const router  = useRouter();

  const [user,      setUser]      = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [outfit,    setOutfit]    = useState(null);
  const [items,     setItems]     = useState({}); // itemId → enriched item
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  // Auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      setAuthReady(true);
    });
  }, [router]);

  // Fetch outfit + wardrobe items once auth is confirmed
  useEffect(() => {
    if (!authReady || !user) return;

    async function load() {
      // Fetch the outfit row
      const { data: outfitRow, error: outfitErr } = await supabase
        .from("outfits")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (outfitErr || !outfitRow) {
        console.error("[outfit result] fetch error:", outfitErr);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOutfit(outfitRow);

      // Fetch wardrobe items referenced in the outfit
      const selectedItems = outfitRow.generated_outfit?.selected_items ?? [];
      const itemIds = selectedItems.map((s) => s.item_id).filter(Boolean);

      if (!itemIds.length) { setLoading(false); return; }

      const { data: wardrobeRows } = await supabase
        .from("wardrobe_items")
        .select("*")
        .in("id", itemIds)
        .eq("user_id", user.id);

      if (!wardrobeRows?.length) { setLoading(false); return; }

      // Batch sign URLs
      const { data: signed } = await supabase.storage
        .from("wardrobe")
        .createSignedUrls(wardrobeRows.map((r) => r.image_url), 3600);

      const urlMap = Object.fromEntries(
        (signed ?? []).map(({ path, signedUrl }) => [path, signedUrl])
      );

      const itemMap = Object.fromEntries(
        wardrobeRows.map((r) => [r.id, { ...r, signedUrl: urlMap[r.image_url] ?? null }])
      );

      setItems(itemMap);
      setLoading(false);
    }

    load();
  }, [authReady, user, id]);

  // ── Loading / not found ────────────────────────────────────────────────────
  if (!authReady || loading) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin" />
      </main>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F5F1E8]">
        <DashboardNav user={user} />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center" style={{ fontFamily: "var(--font-inter)" }}>
          <p className="text-[#2A3D2E]/50 text-sm mb-4">Outfit not found.</p>
          <Link href="/outfits/new" className="text-sm font-semibold text-[#C9A87C] underline underline-offset-2">
            Generate a new outfit →
          </Link>
        </main>
      </div>
    );
  }

  const generated      = outfit.generated_outfit ?? {};
  const selectedItems  = generated.selected_items ?? [];
  const missingItems   = outfit.missing_items ?? [];
  const confidence     = generated.confidence_level ?? outfit.confidence ?? "medium";
  const reviewNeeded   = generated.human_review_recommended;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <DashboardNav user={user} />

      <main
        className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex items-start gap-3 flex-wrap mb-3">
            <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mt-0.5">
              Your outfit
            </p>
            <ConfidenceBadge level={confidence} />
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold text-[#2A3D2E] leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {outfit.event_description}
          </h1>
          {(outfit.location || outfit.date) && (
            <p className="mt-1.5 text-[#2A3D2E]/45 text-sm">
              {[outfit.location, outfit.date].filter(Boolean).join(" · ")}
            </p>
          )}
          {generated.overall_vibe && (
            <p className="mt-3 text-sm font-medium text-[#2A3D2E]/60 italic">
              "{generated.overall_vibe}"
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Outfit grid ──────────────────────────────────────────── */}
          <section className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest">
              Your look
            </h2>
            {selectedItems.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#2A3D2E]/12 p-10 flex flex-col items-center gap-3 text-center">
                <p className="text-[#2A3D2E]/45 text-sm">
                  No wardrobe items were selected — your closet may be empty.
                </p>
                <Link
                  href="/wardrobe"
                  className="text-xs font-semibold text-[#C9A87C] underline underline-offset-2 hover:text-[#2A3D2E] transition-colors"
                >
                  Add items to your closet →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedItems.map((s) => (
                  <ItemCard
                    key={s.item_id}
                    item={items[s.item_id] ?? null}
                    role={s.role ?? "piece"}
                    stylingNote={s.styling_note}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside className="lg:col-span-1 flex flex-col gap-6">

            {/* Why this works */}
            {generated.styling_reasoning && (
              <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6">
                <h3
                  className="text-base font-bold text-[#2A3D2E] mb-3"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Why this works
                </h3>
                <p className="text-sm text-[#2A3D2E]/65 leading-relaxed">
                  {generated.styling_reasoning}
                </p>
              </div>
            )}

            {/* Human review note */}
            {reviewNeeded && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border border-[#C9A87C]/30 bg-[#C9A87C]/6">
                <span className="text-[#C9A87C] text-base mt-0.5">✦</span>
                <p className="text-xs text-[#2A3D2E]/60 leading-relaxed">
                  <span className="font-semibold text-[#2A3D2E]/75">Stylist tip:</span> Your closet is still growing. Adding more pieces will unlock better outfit matches.
                </p>
              </div>
            )}

            {/* What you're missing */}
            {missingItems.length > 0 && (
              <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6">
                <h3
                  className="text-base font-bold text-[#2A3D2E] mb-1"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  What you&apos;re missing
                </h3>
                <p className="text-xs text-[#2A3D2E]/45 mb-4">
                  Pieces that would elevate this look.
                </p>
                <div>
                  {missingItems.map((m, i) => (
                    <MissingItem key={i} item={m} />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── Footer actions ────────────────────────────────────────────── */}
        <div className="mt-10 flex items-center gap-4 flex-wrap">
          <Link
            href="/outfits/new"
            className="px-6 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-[0.98] transition-all"
          >
            Generate another outfit ✦
          </Link>
          <Link
            href="/wardrobe"
            className="px-6 py-3 rounded-full border border-[#2A3D2E]/15 text-[#2A3D2E]/65 font-semibold text-sm hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] transition-all"
          >
            Back to closet
          </Link>
        </div>
      </main>
    </div>
  );
}
