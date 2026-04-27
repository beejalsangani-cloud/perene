"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

function buildQuery(profile) {
  if (!profile) return "fashion editorial";
  const descriptors = profile.style_descriptors ?? [];
  const events      = profile.typical_events ?? [];
  const combined    = [...descriptors.slice(0, 2), ...events.slice(0, 1)];
  if (!combined.length) return "fashion editorial";
  return combined.join(" ") + " outfit";
}

// ── Image modal ───────────────────────────────────────────────────────────────
function PhotoModal({ photo, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const occasion = photo.alt || "this look";

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
          <Link
            href={`/outfits/new?occasion=${encodeURIComponent(occasion)}`}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] transition-colors"
          >
            Get this look ✦
          </Link>
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
  const query = buildQuery(profile);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/inspiration?q=${encodeURIComponent(query)}&page=${p}`);
      const data = await res.json();
      if (data.photos) {
        setPhotos(p === 1 ? data.photos : (prev) => [...prev, ...data.photos]);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [query]);

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
