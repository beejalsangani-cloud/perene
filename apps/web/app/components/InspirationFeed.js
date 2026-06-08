"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Profile → Unsplash query helpers ─────────────────────────────────────────
// Discover personalizes search by mapping quiz answers to keywords:
//   - gender             → menswear / womenswear / androgynous fashion (or skip)
//   - style_descriptors  → first 2 words verbatim (caps query length)
//   - typical_events     → one query PER occasion, results pooled
//
// The fan-out below in `load(p)` means a user with N occasions triggers N
// parallel Unsplash calls per dashboard load. Each bucket returns 12 photos;
// we take only `quotas[i]` from each and gap-fill from leftovers if a bucket
// is short. Final list is deduped by photo id and shuffled so occasions
// appear interleaved, not in rigid blocks.

function genderTerm(g) {
  if (g === "Man")        return "menswear";
  if (g === "Woman")      return "womenswear";
  if (g === "Non-binary") return "androgynous fashion";
  return null; // "Prefer not to say" or unset → no gender keyword
}

function buildOccasionQuery(profile, occasion) {
  const parts = [
    genderTerm(profile?.gender),
    ...(profile?.style_descriptors ?? []).slice(0, 2),
    occasion ?? "editorial",
  ].filter(Boolean);
  return parts.join(" ") + " outfit";
}

// Distribute `total` items across `n` buckets as evenly as possible.
// e.g. (12, 5) → [3, 3, 2, 2, 2]; (12, 7) → [2, 2, 2, 2, 2, 1, 1].
function planQuotas(total, n) {
  if (n <= 0) return [];
  const base  = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

// Fisher-Yates, in place.
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Image modal ───────────────────────────────────────────────────────────────
// The "Get this look" button doesn't navigate directly anymore. Unsplash's
// alt_description describes the photo subject (often the person, not the
// outfit), which used to land in the occasion field and confuse outfit
// generation. We now POST to /api/describe-look first to get a Claude-written
// "[vibe] — [outfit]" description, then navigate to /outfits/new with that
// as the occasion. Falls back to a generic string if the API is unavailable
// so the user still gets to the generator.
function PhotoModal({ photo, onClose }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleGetThisLook() {
    if (loading) return;
    setLoading(true);

    let description = "everyday outfit inspiration";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token && photo.id && photo.url) {
        const res = await fetch("/api/describe-look", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({ photoId: photo.id, imageUrl: photo.url }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.description) description = data.description;
        }
      }
    } catch (err) {
      console.error("[PhotoModal] describe-look failed:", err);
      // description stays at fallback
    }

    const params = new URLSearchParams({ occasion: description });
    if (photo.url) params.set("inspiration", photo.url);
    router.push(`/outfits/new?${params.toString()}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2A3D2E]/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-[#F5F1E8] rounded-3xl overflow-hidden shadow-2xl max-w-md w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#EDE7D6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.alt} className="w-full h-full object-cover"/>
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#2A3D2E]/60 text-white flex items-center justify-center hover:bg-[#2A3D2E] transition-colors backdrop-blur-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-xs text-[#2A3D2E]/40 mb-0.5">Photo by{" "}
              <a href={photo.profileUrl} target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#2A3D2E]/60 transition-colors">
                {photo.credit}
              </a>{" "}on Unsplash
            </p>
            {photo.alt && (
              <p className="text-sm font-medium text-[#2A3D2E] leading-snug capitalize">{photo.alt}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleGetThisLook}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] disabled:opacity-60 disabled:cursor-wait transition-colors cursor-pointer"
          >
            {loading ? "Reading the look…" : "Get this look ✦"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function InspirationSkeleton() {
  const heights = [220, 280, 200, 300, 250, 210, 290, 240];
  return (
    <div className="columns-2 md:columns-4 gap-3">
      {heights.map((h, i) => (
        <div
          key={i}
          className="break-inside-avoid mb-3 rounded-2xl bg-[#2A3D2E]/6 animate-pulse"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InspirationFeed({ profile }) {
  const [photos,  setPhotos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [active,  setActive]  = useState(null); // open modal photo

  const load = useCallback(async (p) => {
    setLoading(true);
    const events = profile?.typical_events ?? [];
    const PHOTOS = 12;

    // No occasions on profile → single generic query (preserves prior behavior,
    // now with the gender keyword prepended if available).
    if (events.length === 0) {
      try {
        const q    = buildOccasionQuery(profile, null);
        const res  = await fetch(`/api/inspiration?q=${encodeURIComponent(q)}&page=${p}`);
        const data = await res.json().catch(() => ({}));
        if (data.photos) {
          setPhotos(p === 1 ? data.photos : (prev) => [...prev, ...data.photos]);
        }
      } catch { /* silent */ }
      setLoading(false);
      return;
    }

    // Fan out: one Unsplash query per occasion, in parallel. A bucket that
    // errors contributes 0 photos; the gap-fill loop below recovers from
    // adjacent buckets that returned surplus.
    const buckets = await Promise.all(events.map(async (occasion) => {
      try {
        const q   = buildOccasionQuery(profile, occasion);
        const res = await fetch(`/api/inspiration?q=${encodeURIComponent(q)}&page=${p}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        return data.photos ?? [];
      } catch (err) {
        console.error(`[inspiration] failed for occasion "${occasion}":`, err);
        return [];
      }
    }));

    // Quota-balanced pick, then gap-fill from leftovers if any bucket fell short.
    const quotas = planQuotas(PHOTOS, events.length);
    const picked = [];
    for (let i = 0; i < buckets.length; i++) {
      picked.push(...buckets[i].slice(0, quotas[i]));
    }
    let shortfall = PHOTOS - picked.length;
    if (shortfall > 0) {
      for (let i = 0; i < buckets.length && shortfall > 0; i++) {
        const leftover = buckets[i].slice(quotas[i]);
        const take = Math.min(shortfall, leftover.length);
        picked.push(...leftover.slice(0, take));
        shortfall -= take;
      }
    }

    // Dedupe by photo id (same image can surface across related queries),
    // then shuffle so occasions appear interleaved rather than in blocks.
    const seen = new Set();
    const deduped = picked.filter((ph) => seen.has(ph.id) ? false : (seen.add(ph.id), true));
    shuffleInPlace(deduped);

    setPhotos((prev) => p === 1 ? deduped : [...prev, ...deduped]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(1); }, [load]);

  function handleSeeMore() {
    const next = page + 1;
    setPage(next);
    load(next);
  }

  return (
    <section style={{ fontFamily: "var(--font-inter)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-0.5">
            Discover
          </p>
          <h2 className="text-xl font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
            Style inspiration, curated for you
          </h2>
        </div>
        {!loading && photos.length > 0 && (
          <button
            onClick={handleSeeMore}
            className="text-xs font-semibold text-[#C9A87C] hover:text-[#2A3D2E] transition-colors underline underline-offset-2 flex-shrink-0"
          >
            See more →
          </button>
        )}
      </div>

      {/* Grid */}
      {loading && photos.length === 0 ? (
        <InspirationSkeleton />
      ) : photos.length === 0 ? null : (
        <>
          <div className="columns-2 md:columns-4 gap-3">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setActive(photo)}
                className="break-inside-avoid mb-3 w-full block rounded-2xl overflow-hidden bg-[#EDE7D6] group cursor-pointer focus:outline-none"
                style={{ background: photo.color ?? "#EDE7D6" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumb}
                  alt={photo.alt}
                  className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin"/>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {active && <PhotoModal photo={active} onClose={() => setActive(null)}/>}
    </section>
  );
}
