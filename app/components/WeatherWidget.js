"use client";

// Compact horizontal weather strip — quiet status row, not a hero block.
// ~64px tall on mobile, ~80px on desktop. Single line that prioritizes
// temp + condition + city + CTA; high/low collapse out on narrow screens.

import { useEffect, useState } from "react";
import Link from "next/link";
import WeatherIcon from "./WeatherIcon";

function WeatherSkeleton() {
  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white px-4 sm:px-5 py-3 sm:py-4 animate-pulse"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2A3D2E]/6 flex-shrink-0"/>
        <div className="h-6 w-14 rounded bg-[#2A3D2E]/8"/>
        <div className="h-3 w-24 rounded-full bg-[#2A3D2E]/5"/>
        <div className="ml-auto h-8 w-24 rounded-full bg-[#C4E552]/30"/>
      </div>
    </div>
  );
}

export default function WeatherWidget({ defaultLocation }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

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
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white px-4 sm:px-5 py-3 sm:py-4"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Icon */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F5F1E8] flex items-center justify-center text-[#2A3D2E] flex-shrink-0">
          <WeatherIcon code={weather.weather_code} className="w-5 h-5 sm:w-6 sm:h-6"/>
        </div>

        {/* Temp + condition (always shown) */}
        <div className="flex items-baseline gap-2 flex-shrink-0">
          <p className="text-xl sm:text-2xl font-bold text-[#2A3D2E] leading-none"
             style={{ fontFamily: "var(--font-playfair)" }}>
            {displayTemp}°
          </p>
          <p className="text-xs sm:text-sm text-[#2A3D2E]/55 truncate max-w-[110px] sm:max-w-none">
            {weather.condition}
          </p>
        </div>

        {/* Metadata (high/low hidden on mobile, city always shown) */}
        <div className="flex-1 min-w-0 flex items-center gap-x-2 sm:gap-x-3 text-[10px] sm:text-xs text-[#2A3D2E]/50 overflow-hidden">
          <span className="hidden sm:inline">H {weather.temperature_high}°</span>
          <span className="hidden sm:inline text-[#2A3D2E]/20">·</span>
          <span className="hidden sm:inline">L {weather.temperature_low}°</span>
          <span className="hidden sm:inline text-[#2A3D2E]/20">·</span>
          <span className="font-medium text-[#2A3D2E]/60 truncate">{weather.city}</span>
        </div>

        {/* CTA */}
        <Link
          href={`/outfits/new?date=${today}`}
          className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#C4E552] text-[#2A3D2E] text-[11px] sm:text-xs font-bold hover:bg-[#d4f562] transition-colors flex-shrink-0"
        >
          Style today ✦
        </Link>
      </div>
    </div>
  );
}
