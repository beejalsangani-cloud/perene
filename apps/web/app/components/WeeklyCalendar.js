"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WeatherIcon from "./WeatherIcon";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  return { day: DAY_LABELS[d.getUTCDay()], date: d.getUTCDate(), month: MONTH_SHORT[d.getUTCMonth()] };
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split("T")[0];
}

function DayCard({ day, index }) {
  const { day: dayLabel, date, month } = formatDayLabel(day.date);
  const today = isToday(day.date);

  return (
    <Link
      href={`/outfits/new?date=${day.date}`}
      className={`flex-shrink-0 w-[140px] rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 group
        ${today
          ? "bg-[#2A3D2E] border-[#2A3D2E] text-[#F5F1E8]"
          : "bg-white border-[#2A3D2E]/8 text-[#2A3D2E]"
        }`}
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Day label */}
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${today ? "text-[#C4E552]" : "text-[#2A3D2E]/40"}`}>
          {today ? "Today" : dayLabel}
        </p>
        <p className={`text-lg font-bold leading-tight ${today ? "text-[#F5F1E8]" : "text-[#2A3D2E]"}`}
          style={{ fontFamily: "var(--font-playfair)" }}>
          {date} <span className="text-xs font-normal">{month}</span>
        </p>
      </div>

      {/* Weather icon */}
      <div className={`w-9 h-9 ${today ? "text-[#C4E552]" : "text-[#2A3D2E]/50"}`}>
        <WeatherIcon code={day.weather_code ?? 0} className="w-full h-full"/>
      </div>

      {/* Temps */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-sm font-bold ${today ? "text-[#F5F1E8]" : "text-[#2A3D2E]"}`}>
          {day.temperature_high}°
        </span>
        <span className={`text-xs ${today ? "text-[#F5F1E8]/50" : "text-[#2A3D2E]/35"}`}>
          {day.temperature_low}°
        </span>
      </div>

      {/* Condition */}
      <p className={`text-[11px] leading-snug ${today ? "text-[#F5F1E8]/65" : "text-[#2A3D2E]/45"}`}>
        {day.condition}
      </p>

      {/* CTA hint */}
      <p className={`text-[10px] font-semibold mt-auto opacity-0 group-hover:opacity-100 transition-opacity
        ${today ? "text-[#C4E552]" : "text-[#C9A87C]"}`}>
        Style this day →
      </p>
    </Link>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[140px] h-[180px] rounded-2xl bg-[#2A3D2E]/6 animate-pulse"/>
      ))}
    </div>
  );
}

export default function WeeklyCalendar({ defaultLocation }) {
  const [days,    setDays]    = useState(null);
  const [city,    setCity]    = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!defaultLocation) { setLoading(false); return; }

    const params = (defaultLocation.lat != null && defaultLocation.lng != null)
      ? `lat=${defaultLocation.lat}&lng=${defaultLocation.lng}`
      : `city=${encodeURIComponent(defaultLocation.city)}`;

    fetch(`/api/weather/week?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.days) { setDays(data.days); setCity(data.city); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [defaultLocation]);

  if (loading) return (
    <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6">
      <div className="h-4 w-40 bg-[#2A3D2E]/8 rounded-full mb-5 animate-pulse"/>
      <CalendarSkeleton />
    </div>
  );

  if (!days?.length) return null;

  return (
    <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6"
      style={{ fontFamily: "var(--font-inter)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-0.5">
            7-day forecast
          </p>
          <h2 className="text-base font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
            Your week, styled
            {city && <span className="text-sm font-normal text-[#2A3D2E]/40 ml-2">in {city}</span>}
          </h2>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#2A3D2E]/6 text-[#2A3D2E]/40 text-[10px] font-semibold">
          Click a day to style it
        </span>
      </div>

      {/* Scrollable row */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {days.map((day, i) => <DayCard key={day.date} day={day} index={i}/>)}
      </div>
    </div>
  );
}
