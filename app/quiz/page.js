"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Wordmark from "@/app/components/Wordmark";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    id: "gender",
    title: "How do you identify?",
    subtitle: "This helps us personalise your recommendations.",
    type: "single",
    options: ["Woman", "Man", "Non-binary", "Prefer not to say"],
  },
  {
    id: "age_range",
    title: "What's your age range?",
    subtitle: "We'll match styles that suit your life stage.",
    type: "single",
    options: ["18–24", "25–34", "35–44", "45–54", "55+"],
  },
  {
    id: "body_type",
    title: "What's your body type?",
    subtitle: "This is optional — you can skip and update it later.",
    type: "single",
    skippable: true,
    options: ["Petite", "Tall", "Athletic", "Curvy", "Plus-size", "Straight / Rectangle"],
  },
  {
    id: "style_descriptors",
    title: "What words describe your style?",
    subtitle: "Select everything that resonates.",
    type: "multi",
    options: ["Classic", "Edgy", "Romantic", "Minimalist", "Bohemian", "Sporty", "Glamorous", "Casual"],
  },
  {
    id: "lifestyle",
    title: "What's your lifestyle like?",
    subtitle: "Select all that apply.",
    type: "multi",
    options: ["Office worker", "Creative professional", "Stay-at-home", "Student", "Entrepreneur", "Retired", "Other"],
  },
  {
    id: "typical_events",
    title: "What do you typically dress for?",
    subtitle: "Select all that apply.",
    type: "multi",
    options: ["Work", "Date nights", "Weekend brunches", "Parties", "Travel", "Workouts", "Errands"],
  },
  {
    id: "budget_range",
    title: "What's your typical budget per item?",
    subtitle: "We'll suggest shopping options that fit your price point.",
    type: "single",
    options: ["Under $50", "$50–$150", "$150–$300", "$300+"],
  },
  {
    id: "color_preferences",
    title: "What colours do you gravitate toward?",
    subtitle: "Select all that apply.",
    type: "multi",
    options: ["Neutrals", "Pastels", "Earth tones", "Bold colors", "Black & white", "Pink", "Green", "Blue", "Other"],
  },
];

// ── Option chip component ──────────────────────────────────────────────────────
function OptionChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-3 rounded-xl text-sm font-medium border-2 text-left transition-all duration-150 cursor-pointer ${
        selected
          ? "bg-[#C4E552] border-[#C4E552] text-[#2A3D2E] font-semibold"
          : "bg-white border-[#2A3D2E]/12 text-[#2A3D2E]/80 hover:border-[#C4E552]/60 hover:text-[#2A3D2E]"
      }`}
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? "bg-[#2A3D2E] border-[#2A3D2E]" : "border-[#2A3D2E]/25"
          }`}
        >
          {selected && (
            <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2">
              <path d="M1 4l2.5 2.5L9 1" stroke="#C4E552" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        {label}
      </span>
    </button>
  );
}

// ── Main quiz component ───────────────────────────────────────────────────────
export default function QuizPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [done, setDone] = useState(false);

  // ── Auth gate ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
        setAuthLoading(false);
      }
    });
  }, [router]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/20 border-t-[#C4E552] rounded-full animate-spin" />
      </main>
    );
  }

  const current = STEPS[step];
  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  // ── Answer helpers ───────────────────────────────────────────────────────────
  function selectSingle(value) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function toggleMulti(value) {
    setAnswers((prev) => {
      const existing = prev[current.id] ?? [];
      const updated = existing.includes(value)
        ? existing.filter((v) => v !== value)
        : [...existing, value];
      return { ...prev, [current.id]: updated };
    });
  }

  function isSelected(value) {
    if (current.type === "single") return answers[current.id] === value;
    return (answers[current.id] ?? []).includes(value);
  }

  function canAdvance() {
    if (current.skippable) return true;
    if (current.type === "single") return !!answers[current.id];
    return (answers[current.id] ?? []).length > 0;
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function goNext() {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      await saveProfile();
    }
  }

  // ── Save to Supabase (via server API route) ──────────────────────────────────
  async function saveProfile() {
    setSaving(true);
    setSaveError("");

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, answers }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      console.error("[quiz] save failed:", data);
      setSaveError(`Save failed: ${data.error ?? "unknown error"} (code: ${data.code ?? "?"})`);
      return;
    }

    setDone(true);
  }

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center px-6" style={{ fontFamily: "var(--font-inter)" }}>
        <Link href="/" className="mb-10 text-2xl text-[#2A3D2E]">
          <Wordmark />
        </Link>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#2A3D2E]/8 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C4E552]/20 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#2A3D2E]">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-[#2A3D2E] mb-3 leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
            You&apos;re all set!
          </h2>
          <p className="text-[#2A3D2E]/60 text-base leading-relaxed mb-8">
            Your style profile has been saved. We&apos;ll use it to build your personal wardrobe and outfit recommendations.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3.5 rounded-xl bg-[#C4E552] text-[#2A3D2E] font-bold text-sm tracking-wide hover:bg-[#d4f562] active:scale-[0.98] transition-all cursor-pointer"
          >
            Go to my dashboard →
          </button>
        </div>
      </main>
    );
  }

  // ── Quiz card ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center px-6 py-12" style={{ fontFamily: "var(--font-inter)" }}>
      {/* Logo */}
      <Link href="/" className="mb-8 text-2xl text-[#2A3D2E]">
        <Wordmark />
      </Link>

      <div className="w-full max-w-xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#2A3D2E]/50 tracking-widest uppercase">
            Step {step + 1} of {totalSteps}
          </span>
          <span className="text-xs font-semibold text-[#C9A87C]">
            {Math.round(progress)}% complete
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#2A3D2E]/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-[#C4E552] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#2A3D2E]/8 p-8 md:p-10">
          {/* Question */}
          <h2
            className="text-2xl md:text-3xl font-bold text-[#2A3D2E] mb-2 leading-snug"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {current.title}
          </h2>
          <p className="text-sm text-[#2A3D2E]/55 mb-7 leading-relaxed">
            {current.type === "multi" ? "Select all that apply. " : ""}
            {current.subtitle}
          </p>

          {/* Options */}
          <div className={`grid gap-3 ${current.options.length <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {current.options.map((opt) => (
              <OptionChip
                key={opt}
                label={opt}
                selected={isSelected(opt)}
                onClick={() =>
                  current.type === "single" ? selectSingle(opt) : toggleMulti(opt)
                }
              />
            ))}
          </div>

          {/* Error */}
          {saveError && (
            <div className="mt-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F5F1E8] border border-[#2A3D2E]/15">
              <span className="text-sm">⚠</span>
              <p className="text-sm text-[#2A3D2E] font-medium">{saveError}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#2A3D2E]/8">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-xl border-2 border-[#2A3D2E]/15 text-[#2A3D2E]/60 text-sm font-semibold hover:border-[#2A3D2E]/30 hover:text-[#2A3D2E] transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3">
              {current.skippable && !answers[current.id] && (
                <button
                  type="button"
                  onClick={goNext}
                  className="text-sm text-[#2A3D2E]/45 hover:text-[#2A3D2E]/70 transition-colors underline underline-offset-2 cursor-pointer"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance() || saving}
                className="px-6 py-2.5 rounded-xl bg-[#C4E552] text-[#2A3D2E] font-bold text-sm tracking-wide hover:bg-[#d4f562] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving
                  ? "Saving…"
                  : step === totalSteps - 1
                  ? "Finish ✦"
                  : "Next →"}
              </button>
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-5 h-1.5 bg-[#2A3D2E]"
                  : i < step
                  ? "w-1.5 h-1.5 bg-[#C4E552]"
                  : "w-1.5 h-1.5 bg-[#2A3D2E]/15"
              }`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
