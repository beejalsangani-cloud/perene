"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LocationSetup({ user, onLocationSaved }) {
  const [cityInput, setCityInput] = useState("");
  const [status,    setStatus]    = useState("idle"); // idle | locating | saving
  const [error,     setError]     = useState("");

  // ── Save location to Supabase (upsert so it works with or without existing row)
  async function persist(location) {
    setStatus("saving");
    const { error: dbErr } = await supabase
      .from("user_profiles")
      .upsert({ user_id: user.id, default_location: location }, { onConflict: "user_id" });

    if (dbErr) {
      console.error("[LocationSetup] upsert error:", dbErr);
      setError("Could not save location. Try again.");
      setStatus("idle");
      return;
    }
    onLocationSaved(location);
  }

  // ── Browser geolocation path ───────────────────────────────────────────────
  function useGeolocation() {
    if (!navigator?.geolocation) {
      setError("Geolocation isn't supported by your browser. Enter a city below.");
      return;
    }
    setStatus("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res  = await fetch(`/api/weather?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          await persist({ city: data.city, lat: latitude, lng: longitude });
        } catch {
          setError("Couldn't detect your city. Enter it manually below.");
          setStatus("idle");
        }
      },
      () => {
        setError("Location access was denied. Enter a city below.");
        setStatus("idle");
      },
      { timeout: 10_000 }
    );
  }

  // ── Manual city path ───────────────────────────────────────────────────────
  async function handleCitySubmit(e) {
    e.preventDefault();
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setStatus("saving");
    setError("");
    try {
      const res  = await fetch(`/api/weather?city=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "City not found");
      await persist({ city: data.city, lat: data.latitude, lng: data.longitude });
    } catch (err) {
      setError(err.message === "City not found" ? "City not found — try a different name." : "Something went wrong. Try again.");
      setStatus("saving");
      setStatus("idle");
    }
  }

  const busy = status === "locating" || status === "saving";

  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-7 flex flex-col gap-5"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F5F1E8] flex items-center justify-center flex-shrink-0 text-[#2A3D2E]">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-0.5">
            Weather-aware outfits
          </p>
          <h3 className="text-base font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
            Where are you based?
          </h3>
          <p className="text-xs text-[#2A3D2E]/50 mt-0.5 leading-relaxed">
            Set your default city so Perene can factor real weather into every outfit.
          </p>
        </div>
      </div>

      {/* Geolocation button */}
      <button
        type="button"
        onClick={useGeolocation}
        disabled={busy}
        className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/12 text-[#2A3D2E]/70 text-sm font-medium hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] transition-all disabled:opacity-50 cursor-pointer text-left"
      >
        {status === "locating" ? (
          <>
            <div className="w-4 h-4 border-2 border-[#2A3D2E]/20 border-t-[#C4E552] rounded-full animate-spin flex-shrink-0"/>
            <span>Detecting your location…</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0 text-[#C9A87C]">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Use my current location</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#2A3D2E]/8"/>
        <span className="text-[10px] font-semibold text-[#2A3D2E]/35 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-[#2A3D2E]/8"/>
      </div>

      {/* Manual city input */}
      <form onSubmit={handleCitySubmit} className="flex gap-2">
        <input
          type="text"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="e.g. Miami, FL"
          disabled={busy}
          className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[#2A3D2E]/12 bg-[#F5F1E8] text-[#2A3D2E] placeholder-[#2A3D2E]/30 text-sm outline-none focus:border-[#C4E552] transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !cityInput.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#C4E552] text-[#2A3D2E] text-sm font-bold hover:bg-[#d4f562] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex-shrink-0"
        >
          {status === "saving" ? "…" : "Set"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="text-xs text-[#2A3D2E]/55 flex items-start gap-1.5">
          <span className="mt-0.5">⚠</span> {error}
        </p>
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={() => onLocationSaved(null)}
        className="text-xs text-[#2A3D2E]/35 hover:text-[#2A3D2E]/55 transition-colors text-left"
      >
        Maybe later →
      </button>
    </div>
  );
}
