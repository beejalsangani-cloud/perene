"use client";

import { useEffect, useState } from "react";
import { authHeader } from "@/lib/supabase";

const CATEGORY_COLORS = {
  Color:       "bg-[#F4B8D0]/30 text-[#C050A0]",
  Fit:         "bg-[#C4E552]/30 text-[#2A3D2E]",
  Layering:    "bg-[#C9A87C]/20 text-[#C9A87C]",
  Accessories: "bg-[#B8895A]/15 text-[#B8895A]",
  Occasion:    "bg-[#4878C8]/15 text-[#4878C8]",
  Fabric:      "bg-[#4A8A50]/15 text-[#4A8A50]",
};

function TipCard({ tip, category, index }) {
  const colorClass = CATEGORY_COLORS[category] ?? "bg-[#2A3D2E]/8 text-[#2A3D2E]/60";
  return (
    <div
      className="flex items-start gap-4 py-4 border-b border-[#2A3D2E]/6 last:border-0"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <span
        className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2A3D2E] text-[#C4E552] text-xs font-bold flex items-center justify-center"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colorClass}`}>
            {category}
          </span>
        </div>
        <p className="text-sm text-[#2A3D2E]/70 leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

function TipsSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6 animate-pulse">
      <div className="h-4 w-36 bg-[#2A3D2E]/8 rounded-full mb-6"/>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 py-4 border-b border-[#2A3D2E]/6 last:border-0">
          <div className="w-7 h-7 rounded-full bg-[#2A3D2E]/8 flex-shrink-0"/>
          <div className="flex-1">
            <div className="h-2.5 w-16 bg-[#C4E552]/30 rounded-full mb-2"/>
            <div className="h-3 w-full bg-[#2A3D2E]/6 rounded-full mb-1.5"/>
            <div className="h-3 w-3/4 bg-[#2A3D2E]/6 rounded-full"/>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StyleTips({ userId }) {
  const [tips,    setTips]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch("/api/tips", {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...(await authHeader()) },
          body:    JSON.stringify({}),
        });
        const data = await res.json();
        if (data.tips) setTips(data.tips);
      } catch {
        /* non-blocking — tips are best-effort */
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading)       return <TipsSkeleton />;
  if (!tips?.length) return null;

  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-6"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Header */}
      <div className="mb-1">
        <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-0.5">
          Personalised
        </p>
        <h2 className="text-base font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
          Tips for your style
        </h2>
      </div>

      <div>
        {tips.map((t, i) => (
          <TipCard key={i} tip={t.tip} category={t.category} index={i}/>
        ))}
      </div>
    </div>
  );
}
