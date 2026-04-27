"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardNav from "@/app/components/DashboardNav";

const QUOTES = [
  "Consulting your wardrobe…",
  "Checking the forecast…",
  "Studying your style DNA…",
  "Pairing colours with intention…",
  "Curating the perfect silhouette…",
  "Layering textures just so…",
  "Finalising your look…",
];

function LoadingOverlay() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-[#F5F1E8]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-[#2A3D2E]/10 border-t-[#C4E552] animate-spin"/>
        <div className="absolute inset-2 rounded-full border-2 border-[#2A3D2E]/5 border-b-[#C9A87C] animate-spin [animation-direction:reverse] [animation-duration:1.5s]"/>
      </div>
      <p key={idx} className="text-sm font-medium text-[#2A3D2E]/60 animate-pulse" style={{ fontFamily: "var(--font-inter)" }}>
        {QUOTES[idx]}
      </p>
    </div>
  );
}

export default function NewOutfitPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const textareaRef  = useRef(null);

  const [user,             setUser]             = useState(null);
  const [authReady,        setAuthReady]        = useState(false);
  const [eventDescription, setEventDescription] = useState(searchParams.get("occasion") ?? "");
  const [location,         setLocation]         = useState("");
  const [date,             setDate]             = useState(searchParams.get("date") ?? "");

  const [generating,       setGenerating]       = useState(false);
  const [error,            setError]            = useState("");

  // Auth gate + profile load (for default location pre-fill)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      setAuthReady(true);

      // Pre-fill location from saved default (only if not set already)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_location")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile?.default_location?.city) {
        setLocation((prev) => prev || profile.default_location.city);
      }
    });
  }, [router]);

  // Auto-focus textarea once ready
  useEffect(() => {
    if (authReady) textareaRef.current?.focus();
  }, [authReady]);

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin"/>
      </main>
    );
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!eventDescription.trim()) { setError("Tell us what you're dressing for."); return; }
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/outfits/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          eventDescription,
          location: location || undefined,
          date:     date     || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setGenerating(false); return; }
      router.push(`/outfits/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setGenerating(false);
    }
  }

  const today   = new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 16 * 86_400_000).toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {generating && <LoadingOverlay/>}
      <DashboardNav user={user}/>

      <main className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16" style={{ fontFamily: "var(--font-inter)" }}>
        <header className="mb-10">
          <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mb-2">AI Stylist</p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
            What are you{" "}
            <span className="italic text-[#C9A87C]">dressing for?</span>
          </h1>
          <p className="mt-2 text-[#2A3D2E]/55 text-base">
            Describe the occasion and Perene will build the best outfit from your closet.
          </p>
        </header>

        <form onSubmit={handleGenerate} className="flex flex-col gap-6">
          {/* Occasion */}
          <div>
            <label className="block text-xs font-semibold text-[#2A3D2E]/50 uppercase tracking-widest mb-2">Occasion</label>
            <textarea
              ref={textareaRef}
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={4}
              placeholder="e.g. First date at a rooftop bar on a warm Friday evening…"
              className="w-full px-5 py-4 rounded-2xl border-2 border-[#2A3D2E]/12 bg-white text-[#2A3D2E] placeholder-[#2A3D2E]/30 text-sm leading-relaxed outline-none focus:border-[#C4E552] resize-none transition-colors"
            />
          </div>

          {/* Location + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2A3D2E]/50 uppercase tracking-widest mb-2">
                Location{" "}
                <span className="normal-case tracking-normal font-normal text-[#2A3D2E]/35">(optional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Miami, FL"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/12 bg-white text-[#2A3D2E] placeholder-[#2A3D2E]/30 text-sm outline-none focus:border-[#C4E552] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2A3D2E]/50 uppercase tracking-widest mb-2">
                Date{" "}
                <span className="normal-case tracking-normal font-normal text-[#2A3D2E]/35">(optional · enables weather)</span>
              </label>
              <input
                type="date"
                value={date}
                min={today}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/12 bg-white text-[#2A3D2E] text-sm outline-none focus:border-[#C4E552] transition-colors"
              />
            </div>
          </div>

          {/* Subtle weather hint */}
          {location && !date && (
            <p className="text-xs text-[#C9A87C]/80 -mt-2">
              Add a date to pull live weather for {location}.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#2A3D2E]/12">
              <span className="text-sm">⚠</span>
              <p className="text-sm text-[#2A3D2E] font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={generating || !eventDescription.trim()}
            className="self-start px-8 py-4 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-sm tracking-wide hover:bg-[#d4f562] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Generate my outfit ✦
          </button>
        </form>

        <p className="mt-10 text-xs text-[#2A3D2E]/35 leading-relaxed">
          Tip: the more items you add to your{" "}
          <a href="/wardrobe" className="underline underline-offset-2 hover:text-[#2A3D2E]/60 transition-colors">closet</a>
          , the more accurate your outfits will be.
        </p>
      </main>
    </div>
  );
}
