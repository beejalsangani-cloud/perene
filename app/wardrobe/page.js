"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardNav from "@/app/components/DashboardNav";
import UploadModal, { COLORS } from "./UploadModal";

// ── Colour dot helper ─────────────────────────────────────────────────────────
const COLOR_HEX = Object.fromEntries(COLORS.map(({ id, hex }) => [id, hex]));

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onEdit, onDelete, deleting }) {
  return (
    <div className="group relative rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white flex flex-col">
      {/* Photo */}
      <div className="aspect-square relative overflow-hidden bg-[#EDE7D6]">
        {item.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.signedUrl}
            alt={item.category ?? "Clothing item"}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#2A3D2E]/20 text-3xl select-none">
            ✦
          </div>
        )}

        {/* Hover action overlay (desktop only — touch devices use the action row below) */}
        <div className="hidden sm:flex absolute inset-0 bg-[#2A3D2E]/55 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3">
          <button
            onClick={() => onEdit(item)}
            className="px-4 py-2 rounded-full bg-[#F5F1E8] text-[#2A3D2E] text-xs font-bold hover:bg-white transition-colors cursor-pointer"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            disabled={deleting === item.id}
            className="px-4 py-2 rounded-full bg-white/20 text-white text-xs font-bold hover:bg-white/35 transition-colors cursor-pointer disabled:opacity-50"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {deleting === item.id ? "…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Tags row */}
      <div className="px-3 py-2.5 flex items-center gap-2 flex-wrap" style={{ fontFamily: "var(--font-inter)" }}>
        {item.category && (
          <span className="px-2.5 py-0.5 rounded-full bg-[#2A3D2E]/8 text-[#2A3D2E] text-[11px] font-semibold">
            {item.category}
          </span>
        )}
        {item.color && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2A3D2E]/5 text-[#2A3D2E]/70 text-[11px]">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
              style={{ background: COLOR_HEX[item.color] ?? "#ccc" }}
            />
            {item.color}
          </span>
        )}
        {item.season?.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-[#C4E552]/25 text-[#2A3D2E]/70 text-[11px]">
            {item.season.join(", ")}
          </span>
        )}
      </div>

      {/* Mobile action row — hover overlay isn't reachable on touch devices */}
      <div className="sm:hidden flex gap-2 px-3 pb-3" style={{ fontFamily: "var(--font-inter)" }}>
        <button
          onClick={() => onEdit(item)}
          className="flex-1 px-3 py-3 rounded-lg border border-[#2A3D2E]/15 text-[#2A3D2E]/80 text-sm font-semibold hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] transition-colors cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item)}
          disabled={deleting === item.id}
          className="flex-1 px-3 py-3 rounded-lg border border-[#E84848]/30 text-[#E84848]/85 text-sm font-semibold hover:border-[#E84848]/55 hover:text-[#E84848] transition-colors cursor-pointer disabled:opacity-50"
        >
          {deleting === item.id ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 text-center"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="w-20 h-20 rounded-full bg-[#2A3D2E]/6 flex items-center justify-center text-[#2A3D2E]/25 mb-6">
        <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
          <path d="M8 14c0-3.3 2.7-6 6-6h4l2 4H28l2-4h4c3.3 0 6 2.7 6 6v22c0 3.3-2.7 6-6 6H14c-3.3 0-6-2.7-6-6V14z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
          <circle cx="24" cy="27" r="7" stroke="currentColor" strokeWidth="2.5"/>
          <path d="M24 23v4l2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
        Your closet is empty
      </h3>
      <p className="text-[#2A3D2E]/50 text-sm mb-8 max-w-xs leading-relaxed">
        Start building your digital wardrobe. Upload your first piece and let Perene get to know your style.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-95 transition-all cursor-pointer"
      >
        Add your first piece →
      </button>
    </div>
  );
}

// ── Closet stats strip ────────────────────────────────────────────────────────
// Six tiles: tops, bottoms, dresses, shoes, outerwear, accessories. The
// underlying CATEGORIES list (UploadModal.js) is Title-Case singular and
// includes "Bag" + "Other" beyond these six — Bag rolls into Accessory for
// display, Other is counted in totalItems only.
const STAT_TILES = [
  {
    key: "Top",
    label: "tops",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">
        <path d="M9 3 5 5v4h3v12h8V9h3V5l-4-2a3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "Bottom",
    label: "bottoms",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">
        <path d="M5 3h14l-1 8-1 10h-4l-1-9-1 9H7L6 11 5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "Dress",
    label: "dresses",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">
        <path d="M9 3h6l1 4-2 2 4 12H6l4-12-2-2 1-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "Shoes",
    label: "shoes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">
        <path d="M2 17h5l3-4 3 1 4 1 5 2v2H2v-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M10 13l-1-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "Outerwear",
    label: "outerwear",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">
        <path d="M7 4 4 6v4h3v11h10V10h3V6l-3-2-2 2h-6l-2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 10v11" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    key: "Accessory",
    label: "accessories",
    mergeKeys: ["Bag"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">
        <path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function formatLastVisit(iso) {
  if (iso === undefined) return "…";
  if (iso === null)      return "First visit";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1)   return "today";
  if (days === 1) return "yesterday";
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ClosetStats({ totalItems, byCategory, outfitsStyled, lastVisitIso }) {
  const safeTotal = Math.max(0, Math.round(totalItems ?? 0));
  return (
    <div
      className="mb-8 rounded-2xl border border-[#2A3D2E]/8 bg-white p-5"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Top row — total / outfits / last visit */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-6 text-sm">
        <p className="text-[#2A3D2E]/70">
          <span className="text-[#2A3D2E]/45">Your closet ·</span>{" "}
          <span className="font-semibold text-[#2A3D2E]">
            {safeTotal} item{safeTotal === 1 ? "" : "s"}
          </span>
        </p>
        <p className="text-[#2A3D2E]/70">
          <span className="text-[#2A3D2E]/45">Outfits styled ·</span>{" "}
          <span className="font-semibold text-[#2A3D2E]">
            {outfitsStyled === null ? "…" : Math.max(0, Math.round(outfitsStyled))}
          </span>
        </p>
        <p className="text-[#2A3D2E]/70">
          <span className="text-[#2A3D2E]/45">Last visit ·</span>{" "}
          <span className="font-semibold text-[#2A3D2E]">{formatLastVisit(lastVisitIso)}</span>
        </p>
      </div>

      {/* Bottom row — six category tiles, single 6-col grid at every breakpoint */}
      <div className="mt-4 pt-4 border-t border-[#2A3D2E]/6 grid grid-cols-6 gap-2 sm:gap-4">
        {STAT_TILES.map(({ key, label, icon, mergeKeys = [] }) => {
          const raw = (byCategory[key] ?? 0) + mergeKeys.reduce((s, k) => s + (byCategory[k] ?? 0), 0);
          const count = Math.max(0, Math.round(raw));
          return (
            <div key={key} className="flex flex-col items-center gap-1 sm:gap-1.5 text-center">
              <div className="text-[#2A3D2E]/65">{icon}</div>
              <span className="text-base sm:text-xl font-bold text-[#2A3D2E] leading-none">
                {count}
              </span>
              <span className="text-[10px] sm:text-xs text-[#2A3D2E]/50 leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function countByCategory(items) {
  const acc = { Top: 0, Bottom: 0, Dress: 0, Shoes: 0, Outerwear: 0, Accessory: 0, Bag: 0 };
  for (const item of items ?? []) {
    if (item.category && acc[item.category] !== undefined) acc[item.category]++;
  }
  return acc;
}

// ── Grid skeleton ─────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white animate-pulse">
          <div className="aspect-square bg-[#2A3D2E]/6" />
          <div className="p-3 flex gap-2">
            <div className="h-5 w-14 rounded-full bg-[#2A3D2E]/8" />
            <div className="h-5 w-10 rounded-full bg-[#2A3D2E]/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WardrobePage() {
  const router = useRouter();
  const [user,           setUser]           = useState(null);
  const [authReady,      setAuthReady]      = useState(false);
  const [items,          setItems]          = useState(null); // null = loading
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editItem,       setEditItem]       = useState(null);
  const [deleting,       setDeleting]       = useState(null); // id of item being deleted
  const [outfitsStyled,  setOutfitsStyled]  = useState(null); // null = loading
  const [lastVisitIso,   setLastVisitIso]   = useState(undefined); // undefined = loading, null = no value yet

  // ── Auth gate ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      setAuthReady(true);
    });
  }, [router]);

  // ── Fetch items with signed URLs ────────────────────────────────────────────
  const loadItems = useCallback(async (uid) => {
    const { data, error } = await supabase
      .from("wardrobe_items")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) { console.error("[wardrobe] fetch error:", error); setItems([]); return; }
    if (!data?.length) { setItems([]); return; }

    // Batch-generate signed URLs (1 h expiry)
    const { data: signed } = await supabase.storage
      .from("wardrobe")
      .createSignedUrls(data.map((i) => i.image_url), 3600);

    const urlMap = Object.fromEntries(
      (signed ?? []).map(({ path, signedUrl }) => [path, signedUrl])
    );

    setItems(data.map((item) => ({ ...item, signedUrl: urlMap[item.image_url] ?? null })));
  }, []);

  useEffect(() => {
    if (authReady && user) loadItems(user.id);
  }, [authReady, user, loadItems]);

  // Stats: outfits styled (count) + last visit (timestamp). Fetched in parallel
  // alongside items; failures fall back to 0 / null so the strip still renders.
  useEffect(() => {
    if (!authReady || !user) return;
    Promise.all([
      supabase.from("outfits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase.from("user_profiles")
        .select("last_visit")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]).then(([countRes, profileRes]) => {
      setOutfitsStyled(countRes.count ?? 0);
      setLastVisitIso(profileRes.data?.last_visit ?? null);
    }).catch(() => {
      setOutfitsStyled(0);
      setLastVisitIso(null);
    });
  }, [authReady, user]);

  // Hash-based auto-open: /wardrobe#upload lands the user directly in the
  // upload modal. Used by /welcome and the dashboard soft-gate banner so the
  // path from "I should add an item" to "the camera is open" is one tap.
  useEffect(() => {
    if (!authReady) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#upload") return;
    setEditItem(null);
    setModalOpen(true);
    // Strip the hash so a manual reload doesn't re-open the modal.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [authReady]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(item) {
    if (!confirm(`Delete this ${item.category ?? "item"}? This can't be undone.`)) return;
    setDeleting(item.id);
    await supabase.storage.from("wardrobe").remove([item.image_url]);
    await supabase.from("wardrobe_items").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setDeleting(null);
  }

  // ── Modal callbacks ─────────────────────────────────────────────────────────
  function openCreate() { setEditItem(null); setModalOpen(true); }
  function openEdit(item) { setEditItem(item); setModalOpen(true); }

  async function handleSaved(savedRow) {
    // Regenerate a signed URL for the new/updated row
    const { data: signed } = await supabase.storage
      .from("wardrobe")
      .createSignedUrls([savedRow.image_url], 3600);
    const signedUrl = signed?.[0]?.signedUrl ?? null;
    const enriched  = { ...savedRow, signedUrl };

    setItems((prev) => {
      if (!prev) return [enriched];
      const exists = prev.some((i) => i.id === savedRow.id);
      return exists
        ? prev.map((i) => (i.id === savedRow.id ? enriched : i))
        : [enriched, ...prev];
    });
    setModalOpen(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin" />
      </main>
    );
  }

  const count = items?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <DashboardNav user={user} />

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14" style={{ fontFamily: "var(--font-inter)" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-start sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mb-2">
              Your wardrobe
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              Your Closet
            </h1>
            <p className="mt-1.5 text-[#2A3D2E]/50 text-sm">
              {items === null
                ? "Loading…"
                : count === 0
                ? "No items yet"
                : `${count} item${count === 1 ? "" : "s"}`}
            </p>
          </div>
          {(items === null || count > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {items === null || count >= 5 ? (
                <Link
                  href="/outfits/new"
                  className="px-5 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-95 transition-all"
                >
                  Generate an outfit →
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Add at least 5 items to start generating outfits"
                  className="px-5 py-3 rounded-full bg-[#2A3D2E]/8 text-[#2A3D2E]/45 font-bold text-sm cursor-not-allowed"
                >
                  Generate an outfit →
                </button>
              )}
              <button
                onClick={openCreate}
                className="px-5 py-3 rounded-full border border-[#2A3D2E]/15 text-[#2A3D2E]/65 font-bold text-sm hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] active:scale-95 transition-all cursor-pointer"
              >
                + Add new item
              </button>
            </div>
          )}
        </div>

        {/* ── Stats strip (hidden while loading and on empty state) ─────── */}
        {items !== null && count > 0 && (
          <ClosetStats
            totalItems={count}
            byCategory={countByCategory(items)}
            outfitsStyled={outfitsStyled}
            lastVisitIso={lastVisitIso}
          />
        )}

        {/* ── Grid / empty / skeleton ──────────────────────────────────── */}
        {items === null ? (
          <GridSkeleton />
        ) : count === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Upload / edit modal ─────────────────────────────────────────── */}
      <UploadModal
        key={editItem?.id ?? "new"}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        user={user}
        editItem={editItem}
      />
    </div>
  );
}
