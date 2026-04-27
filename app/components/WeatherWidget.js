"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WeatherIcon from "./WeatherIcon";

// Skeleton shimmer
function WeatherSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-7 animate-pulse" style={{ fontFamily: "var(--font-inter)" }}>
      <div className="h-3 w-36 bg-[#2A3D2E]/8 rounded-full mb-5"/>
      <div className="flex items-end gap-4 mb-4">
        <div className="w-14 h-14 bg-[#2A3D2E]/6 rounded-2xl"/>
        <div>
          <div className="h-10 w-20 bg-[#2A3D2E]/8 rounded-xl mb-1.5"/>
          <div className="h-3 w-28 bg-[#2A3D2E]/6 rounded-full"/>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-16 bg-[#2A3D2E]/6 rounded-full"/>
        <div className="h-3 w-14 bg-[#2A3D2E]/6 rounded-full"/>
        <div className="h-3 w-12 bg-[#2A3D2E]/6 rounded-full"/>
      </div>
    </div>
  );
}

export default function WeatherWidget({ defaultLocation }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  // Today's date for the CTA link
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!defaultLocation) { setLoading(false); return; }

    const params = (defaultLocation.lat != null && defaultLocation.lng != null)
      ? `lat=${defaultLocation.lat}&lng=${defaultLocation.lng}`
      : `city=${encodeURIComponent(defaultLocation.city)}`;

    fetch(`/api/weather?${params}`)
      .then((r) => r.json())
      .then((data) => { setWeather(data.error ? null : data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [defaultLocation]);

  if (loading) return <WeatherSkeleton />;
  if (!weather) return null;

  const displayTemp = weather.temperature_current ?? weather.temperature_high;

  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-7"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Label */}
      <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-5">
        Today&apos;s forecast for your wardrobe
      </p>

      {/* Main row: icon + temp + condition */}
      <div className="flex items-center gap-5 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-[#F5F1E8] flex items-center justify-center text-[#2A3D2E] flex-shrink-0">
          <WeatherIcon code={weather.weather_code} className="w-8 h-8"/>
        </div>
        <div>
          <p className="text-4xl font-bold text-[#2A3D2E] leading-none" style={{ fontFamily: "var(--font-playfair)" }}>
            {displayTemp}°
          </p>
          <p className="text-sm text-[#2A3D2E]/55 mt-1">{weather.condition}</p>
        </div>
      </div>

      {/* Detail row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#2A3D2E]/50 mb-5">
        <span>H: {weather.temperature_high}°F</span>
        <span className="text-[#2A3D2E]/20">·</span>
        <span>L: {weather.temperature_low}°F</span>
        {weather.precipitation_chance > 0 && (
          <>
            <span className="text-[#2A3D2E]/20">·</span>
            <span>{weather.precipitation_chance}% rain</span>
          </>
        )}
        <span className="text-[#2A3D2E]/20">·</span>
        <span className="font-medium text-[#2A3D2E]/60">{weather.city}</span>
      </div>

      {/* CTA */}
      <Link
        href={`/outfits/new?date=${today}`}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C4E552] text-[#2A3D2E] text-xs font-bold hover:bg-[#d4f562] transition-colors"
      >
        Style today ✦
      </Link>
    </div>
  );
}
