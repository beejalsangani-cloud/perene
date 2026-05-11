"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardNav from "@/app/components/DashboardNav";
import WeatherIcon from "@/app/components/WeatherIcon";
import { buildShopUrl, OUTBOUND_LINK_REL } from "@/lib/affiliate";

// ── Weather card (prominent, full-width) ──────────────────────────────────────

function formatDate(dateStr) {
  try {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    });
  } catch { return dateStr; }
}

function ProminentWeatherCard({ weather }) {
  if (!weather) return null;
  return (
    <div
      className="rounded-2xl bg-[#2A3D2E] text-[#F5F1E8] p-8 md:p-10 mb-8 shadow-lg"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
        {/* Icon + main temp */}
        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-[#C4E552]">
            <WeatherIcon code={weather.weather_code ?? 0} className="w-full h-full"/>
          </div>
          <div>
            <p
              className="text-6xl md:text-7xl font-bold text-[#F5F1E8] leading-none"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {weather.temperature_high}°
            </p>
            <p className="text-sm text-[#F5F1E8]/60 mt-1">
              Feels like {weather.temperature_low}° low
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-20 bg-[#F5F1E8]/10"/>

        {/* Details */}
        <div className="flex-1">
          <p className="text-xl font-semibold text-[#F5F1E8] mb-1">{weather.condition}</p>
          <p className="text-sm text-[#F5F1E8]/50 mb-4">{weather.city} · {formatDate(weather.date)}</p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-[#F5F1E8]/40 text-xs uppercase tracking-wide">High</span>
              <p className="font-semibold text-[#F5F1E8]">{weather.temperature_high}°F</p>
            </div>
            <div>
              <span className="text-[#F5F1E8]/40 text-xs uppercase tracking-wide">Low</span>
              <p className="font-semibold text-[#F5F1E8]">{weather.temperature_low}°F</p>
            </div>
            {weather.precipitation_chance > 0 && (
              <div>
                <span className="text-[#F5F1E8]/40 text-xs uppercase tracking-wide">Rain</span>
                <p className="font-semibold text-[#F5F1E8]">{weather.precipitation_chance}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Editorial tag */}
        <div className="hidden lg:flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-[#C4E552] text-2xl">✦</span>
          <p className="text-xs text-[#F5F1E8]/35 text-right leading-relaxed max-w-[120px]">
            Outfit tailored for today&apos;s conditions
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ level }) {
  const map = {
    high:   { label: "High confidence",   classes: "bg-[#C4E552]/25 text-[#2A3D2E]" },
    medium: { label: "Medium confidence", classes: "bg-[#C9A87C]/20 text-[#C9A87C]" },
    low:    { label: "Low confidence",    classes: "bg-[#2A3D2E]/8 text-[#2A3D2E]/55" },
  };
  const { label, classes } = map[level] ?? map.medium;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${classes}`}
      style={{ fontFamily: "var(--font-inter)" }}>
      {label}
    </span>
  );
}

// ── Wardrobe item card ────────────────────────────────────────────────────────
function ItemCard({ item, role, stylingNote }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#2A3D2E]/8 bg-white flex flex-col"
      style={{ fontFamily: "var(--font-inter)" }}>
      <div className="aspect-square relative overflow-hidden bg-[#EDE7D6]">
        {item?.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.signedUrl} alt={item.category ?? role} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#2A3D2E]/20 text-3xl select-none">✦</div>
        )}
        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#2A3D2E]/70 text-white text-[10px] font-semibold capitalize backdrop-blur-sm">
          {role}
        </span>
      </div>
      <div className="px-3 py-3 flex flex-col gap-1">
        {item?.category && <span className="text-xs font-semibold text-[#2A3D2E]">{item.category}</span>}
        {stylingNote    && <p className="text-[11px] text-[#2A3D2E]/55 leading-relaxed">{stylingNote}</p>}
      </div>
    </div>
  );
}

// ── Missing item row ──────────────────────────────────────────────────────────
// validUrlSet === null means validation hasn't returned yet — show every link
// (option (a): fail-open / no perceived delay). Once validation resolves the
// set, we filter to only verified URLs; dead retailers silently disappear.
function MissingItem({ item: { item, category, why, price_range, retailers }, validUrlSet }) {
  const [expanded, setExpanded] = useState(false);

  const shopLinks = (retailers ?? [])
    .map((r) => ({ name: r.name, url: buildShopUrl({ retailer: r.name, query: r.search_query }) }))
    .filter((r) => r.url)
    .filter((r) => validUrlSet === null || validUrlSet.has(r.url));

  return (
    <div className="flex items-start gap-4 py-4 border-b border-[#2A3D2E]/6 last:border-0"
      style={{ fontFamily: "var(--font-inter)" }}>
      <div className="w-10 h-10 rounded-xl bg-[#2A3D2E]/6 flex-shrink-0 flex items-center justify-center text-[#2A3D2E]/30">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#2A3D2E]">{item}</span>
          {category   && <span className="px-2 py-0.5 rounded-full bg-[#2A3D2E]/6 text-[#2A3D2E]/60 text-[10px] font-semibold">{category}</span>}
          {price_range && <span className="text-[11px] text-[#C9A87C] font-medium">{price_range}</span>}
        </div>
        {why && <p className="text-xs text-[#2A3D2E]/50 mt-0.5 leading-relaxed">{why}</p>}

        {shopLinks.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] transition-colors"
            >
              Shop the look
              <svg viewBox="0 0 12 12" fill="none"
                className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}>
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {expanded && (
              <div className="mt-3 flex flex-col gap-1.5">
                {shopLinks.map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel={OUTBOUND_LINK_REL}
                    className="group inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#2A3D2E]/10 hover:border-[#C9A87C]/45 bg-white transition-colors"
                  >
                    <span className="text-xs font-medium text-[#2A3D2E]">{r.name}</span>
                    <svg viewBox="0 0 12 12" fill="none"
                      className="w-3 h-3 text-[#2A3D2E]/30 group-hover:text-[#C9A87C] transition-colors">
                      <path d="M3.5 8.5l5-5M4 3.5h4.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                ))}
                <p className="mt-2 text-xs text-[#2A3D2E]/60">
                  Browse similar items at these retailers — exact matches not guaranteed.
                </p>
                <p className="mt-1 text-[10px] italic text-[#2A3D2E]/45">
                  Affiliate links — Perene may earn a commission.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OutfitResultPage({ params }) {
  const { id }  = use(params);
  const router  = useRouter();

  const [user,          setUser]          = useState(null);
  const [authReady,     setAuthReady]     = useState(false);
  const [outfit,        setOutfit]        = useState(null);
  const [items,         setItems]         = useState({});
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  // null = validation in flight (show all retailer links). Set of valid URLs
  // once /api/affiliate/validate responds; filtered Set on fail-open errors.
  const [validUrlSet,   setValidUrlSet]   = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      setAuthReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (!authReady || !user) return;
    async function load() {
      const { data: outfitRow, error: err } = await supabase
        .from("outfits").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();

      if (err || !outfitRow) { setNotFound(true); setLoading(false); return; }
      setOutfit(outfitRow);

      const itemIds = (outfitRow.generated_outfit?.selected_items ?? []).map((s) => s.item_id).filter(Boolean);
      if (!itemIds.length) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from("wardrobe_items").select("*").in("id", itemIds).eq("user_id", user.id);
      if (!rows?.length) { setLoading(false); return; }

      const { data: signed } = await supabase.storage.from("wardrobe")
        .createSignedUrls(rows.map((r) => r.image_url), 3600);
      const urlMap = Object.fromEntries((signed ?? []).map(({ path, signedUrl }) => [path, signedUrl]));

      setItems(Object.fromEntries(rows.map((r) => [r.id, { ...r, signedUrl: urlMap[r.image_url] ?? null }])));
      setLoading(false);
    }
    load();
  }, [authReady, user, id]);

  // Validate all retailer URLs in one round trip. Fails open everywhere — any
  // error path leaves validUrlSet null OR a permissive Set, so the user always
  // sees something rather than a stripped-down list.
  useEffect(() => {
    if (!outfit) return;
    const allLinks = [];
    const seen = new Set();
    for (const m of outfit.missing_items ?? []) {
      for (const r of m.retailers ?? []) {
        const url = buildShopUrl({ retailer: r.name, query: r.search_query });
        if (url && !seen.has(url)) {
          seen.add(url);
          allLinks.push({ url, retailer: r.name });
        }
      }
    }
    if (allLinks.length === 0) {
      setValidUrlSet(new Set());
      return;
    }

    let cancelled = false;
    (async () => {
      const allUrls = new Set(allLinks.map((l) => l.url));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (!cancelled) setValidUrlSet(allUrls); // fail open: show everything
          return;
        }
        const res = await fetch("/api/affiliate/validate", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({ items: allLinks }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const { results } = await res.json();
        if (cancelled) return;
        setValidUrlSet(new Set(results.filter((r) => r.valid).map((r) => r.url)));
      } catch (err) {
        console.error("[outfit] retailer validation error:", err);
        if (!cancelled) setValidUrlSet(allUrls); // fail open
      }
    })();
    return () => { cancelled = true; };
  }, [outfit]);

  if (!authReady || loading) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin"/>
      </main>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F5F1E8]">
        <DashboardNav user={user}/>
        <main className="max-w-2xl mx-auto px-6 py-20 text-center" style={{ fontFamily: "var(--font-inter)" }}>
          <p className="text-[#2A3D2E]/50 text-sm mb-4">Outfit not found.</p>
          <Link href="/outfits/new" className="text-sm font-semibold text-[#C9A87C] underline underline-offset-2">
            Generate a new outfit →
          </Link>
        </main>
      </div>
    );
  }

  const generated     = outfit.generated_outfit ?? {};
  const selectedItems = generated.selected_items ?? [];
  const missingItems  = outfit.missing_items ?? [];
  const confidence    = generated.confidence_level ?? outfit.confidence ?? "medium";
  const reviewNeeded  = generated.human_review_recommended;
  const weather       = outfit.weather ?? null;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <DashboardNav user={user}/>

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14" style={{ fontFamily: "var(--font-inter)" }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-start gap-3 flex-wrap mb-3">
            <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mt-0.5">Your outfit</p>
            <ConfidenceBadge level={confidence}/>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#2A3D2E] leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
            {outfit.event_description}
          </h1>
          {generated.overall_vibe && (
            <p className="mt-2 text-sm font-medium text-[#2A3D2E]/55 italic">
              &ldquo;{generated.overall_vibe}&rdquo;
            </p>
          )}
        </header>

        {/* ── Prominent weather card (above outfit grid) ────────────────── */}
        <ProminentWeatherCard weather={weather}/>

        {/* ── Two-column content ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Outfit grid */}
          <section className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest">Your look</h2>
            {selectedItems.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#2A3D2E]/12 p-10 flex flex-col items-center gap-3 text-center">
                <p className="text-[#2A3D2E]/45 text-sm">No wardrobe items were selected — your closet may be empty.</p>
                <Link href="/wardrobe" className="text-xs font-semibold text-[#C9A87C] underline underline-offset-2 hover:text-[#2A3D2E] transition-colors">
                  Add items to your closet →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedItems.map((s) => (
                  <ItemCard key={s.item_id} item={items[s.item_id] ?? null} role={s.role ?? "piece"} stylingNote={s.styling_note}/>
                ))}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-1 flex flex-col gap-6">

            {generated.styling_reasoning && (
              <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6">
                <h3 className="text-base font-bold text-[#2A3D2E] mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
                  Why this works
                </h3>
                <p className="text-sm text-[#2A3D2E]/65 leading-relaxed">{generated.styling_reasoning}</p>
              </div>
            )}

            {reviewNeeded && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border border-[#C9A87C]/30 bg-[#C9A87C]/6">
                <span className="text-[#C9A87C] text-base mt-0.5">✦</span>
                <p className="text-xs text-[#2A3D2E]/60 leading-relaxed">
                  <span className="font-semibold text-[#2A3D2E]/75">Stylist tip:</span>{" "}
                  Your closet is still growing. Adding more pieces will unlock better outfit matches.
                </p>
              </div>
            )}

            {missingItems.length > 0 && (
              <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6">
                <h3 className="text-base font-bold text-[#2A3D2E] mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                  What you&apos;re missing
                </h3>
                <p className="text-xs text-[#2A3D2E]/45 mb-4">Pieces that would elevate this look.</p>
                <div>
                  {missingItems.map((m, i) => <MissingItem key={i} item={m} validUrlSet={validUrlSet}/>)}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Footer actions */}
        <div className="mt-10 flex items-center gap-4 flex-wrap">
          <Link href="/outfits/new" className="px-6 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm hover:bg-[#d4f562] active:scale-[0.98] transition-all">
            Generate another outfit ✦
          </Link>
          <Link href="/wardrobe" className="px-6 py-3 rounded-full border border-[#2A3D2E]/15 text-[#2A3D2E]/65 font-semibold text-sm hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] transition-all">
            Back to closet
          </Link>
        </div>
      </main>
    </div>
  );
}
