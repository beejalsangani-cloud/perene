"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardNav from "@/app/components/DashboardNav";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFirstName(user) {
  const meta = user?.user_metadata;
  if (meta?.full_name) return meta.full_name.split(" ")[0];
  if (meta?.name)      return meta.name.split(" ")[0];
  const prefix = user?.email?.split("@")[0];
  if (prefix) {
    const clean = prefix.replace(/[._\-+]/g, " ").split(" ")[0];
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return "stylist";
}

// Hex approximations for each quiz colour option
const SWATCH = {
  "Neutrals":      "#C8C0B0",
  "Pastels":       "#F4B8D0",
  "Earth tones":   "#B8895A",
  "Bold colors":   "#E84848",
  "Black & white": "#2A2A2A",
  "Pink":          "#F080A8",
  "Green":         "#4A8A50",
  "Blue":          "#4878C8",
  "Other":         "#9888A8",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ label, variant = "lime" }) {
  const styles = {
    lime:  "bg-[#C4E552] text-[#2A3D2E]",
    forest:"bg-[#2A3D2E] text-[#F5F1E8]",
    gold:  "border border-[#C9A87C]/50 text-[#C9A87C]",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${styles[variant]}`}
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {label}
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-8 animate-pulse">
      <div className="h-5 w-40 bg-[#2A3D2E]/8 rounded-full mb-6" />
      <div className="flex flex-wrap gap-2 mb-6">
        {[80, 96, 72, 88, 64].map((w) => (
          <div key={w} className="h-7 rounded-full bg-[#C4E552]/30" style={{ width: w }} />
        ))}
      </div>
      <div className="h-px bg-[#2A3D2E]/6 mb-5" />
      <div className="flex flex-wrap gap-2">
        {[90, 110, 75, 95].map((w) => (
          <div key={w} className="h-7 rounded-full bg-[#2A3D2E]/8" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ profile }) {
  if (!profile) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#C9A87C]/40 bg-white p-8 flex flex-col items-start gap-4">
        <p className="text-[#2A3D2E]/55 text-sm leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
          You haven&apos;t completed your style quiz yet. It only takes two minutes.
        </p>
        <Link
          href="/quiz"
          className="px-5 py-2.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-semibold text-sm hover:bg-[#d4f562] transition-colors"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Take the style quiz →
        </Link>
      </div>
    );
  }

  const {
    style_descriptors = [],
    typical_events    = [],
    color_preferences = [],
    gender, age_range, body_type, budget_range,
  } = profile;

  const details = [
    { label: "Gender",    value: gender      },
    { label: "Age range", value: age_range   },
    { label: "Body type", value: body_type   },
    { label: "Budget",    value: budget_range },
  ].filter((d) => d.value);

  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-8 space-y-6"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Style descriptors */}
      {style_descriptors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-3">
            My style
          </p>
          <div className="flex flex-wrap gap-2">
            {style_descriptors.map((s) => <Pill key={s} label={s} variant="lime" />)}
          </div>
        </div>
      )}

      {/* Divider */}
      {style_descriptors.length > 0 && typical_events.length > 0 && (
        <div className="h-px bg-[#2A3D2E]/6" />
      )}

      {/* Typical events */}
      {typical_events.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-3">
            I dress for
          </p>
          <div className="flex flex-wrap gap-2">
            {typical_events.map((e) => <Pill key={e} label={e} variant="forest" />)}
          </div>
        </div>
      )}

      {/* Divider */}
      {typical_events.length > 0 && color_preferences.length > 0 && (
        <div className="h-px bg-[#2A3D2E]/6" />
      )}

      {/* Colour preferences */}
      {color_preferences.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest mb-3">
            My palette
          </p>
          <div className="flex flex-wrap gap-3">
            {color_preferences.map((c) => (
              <div key={c} className="flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                  style={{ background: SWATCH[c] ?? "#CCC" }}
                />
                <span className="text-xs text-[#2A3D2E]/70">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal details row */}
      {details.length > 0 && (
        <>
          <div className="h-px bg-[#2A3D2E]/6" />
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {details.map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-[#2A3D2E]/35 uppercase tracking-widest">
                  {label}
                </p>
                <p className="text-sm font-medium text-[#2A3D2E]">{value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit link */}
      <div className="pt-1">
        <Link
          href="/quiz"
          className="text-xs font-semibold text-[#C9A87C] hover:text-[#2A3D2E] transition-colors underline underline-offset-2"
        >
          Edit profile →
        </Link>
      </div>
    </div>
  );
}

function FeatureTile({ icon, title, stat, cta, href, disabled = false }) {
  return (
    <div
      className="rounded-2xl border border-[#2A3D2E]/8 bg-white p-7 flex flex-col gap-5"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] flex items-center justify-center text-[#2A3D2E]">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#2A3D2E] mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          {title}
        </h3>
        <p className="text-sm text-[#2A3D2E]/50">{stat}</p>
      </div>
      {disabled ? (
        <span className="mt-auto inline-flex items-center px-4 py-2 rounded-full bg-[#2A3D2E]/6 text-[#2A3D2E]/35 text-xs font-semibold cursor-not-allowed">
          Coming soon
        </span>
      ) : (
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C4E552] text-[#2A3D2E] text-xs font-bold hover:bg-[#d4f562] transition-colors self-start"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [user,          setUser]          = useState(null);
  const [profile,       setProfile]       = useState(undefined);
  const [wardrobeCount, setWardrobeCount] = useState(null); // null = loading
  const [authReady,     setAuthReady]     = useState(false);

  // Auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
        setAuthReady(true);
      }
    });
  }, [router]);

  // Load profile + wardrobe count once auth is confirmed
  useEffect(() => {
    if (!authReady || !user) return;

    Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("wardrobe_items").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([profileRes, countRes]) => {
      if (profileRes.error) console.error("[dashboard] profile fetch error:", profileRes.error);
      setProfile(profileRes.data ?? null);
      setWardrobeCount(countRes.count ?? 0);
    });
  }, [authReady, user]);

  // Full-screen spinner until auth resolves
  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin" />
      </main>
    );
  }

  const firstName = getFirstName(user);
  const profileLoading = profile === undefined;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <DashboardNav user={user} />

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14">

        {/* ── Welcome header ─────────────────────────────────────────────── */}
        <header className="mb-10">
          <p
            className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mb-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Your dashboard
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Welcome back,{" "}
            <span className="italic text-[#C9A87C]">{firstName}.</span>
          </h1>
          <p
            className="mt-2 text-[#2A3D2E]/55 text-base"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Here&apos;s your style at a glance.
          </p>
        </header>

        {/* ── Two-column layout ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Style profile card — takes 1 of 3 columns on desktop */}
          <section className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2
                className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Style profile
              </h2>
            </div>
            {profileLoading ? <ProfileSkeleton /> : <ProfileCard profile={profile} />}
          </section>

          {/* Feature tiles — take 2 of 3 columns on desktop */}
          <section className="lg:col-span-2 flex flex-col gap-4">
            <h2
              className="text-xs font-semibold text-[#2A3D2E]/45 uppercase tracking-widest"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Your wardrobe
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FeatureTile
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                }
                title="Your Closet"
                stat={wardrobeCount === null ? "Loading…" : `${wardrobeCount} item${wardrobeCount === 1 ? "" : "s"} uploaded`}
                cta="Go to closet →"
                href="/wardrobe"
                disabled={false}
              />
              <FeatureTile
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M12 3l1.5 4.5H18l-3.75 2.75 1.5 4.5L12 12l-3.75 2.75 1.5-4.5L6 7.5h4.5L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                }
                title="Outfit Generator"
                stat="Get your next look"
                cta="Generate outfit →"
                href="/outfits/new"
                disabled={false}
              />
              <FeatureTile
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                }
                title="Saved Looks"
                stat="0 saved"
                cta=""
                href=""
                disabled={true}
              />
            </div>

            {/* Subtle divider + early-access note */}
            <div
              className="mt-2 flex items-center gap-3 px-5 py-4 rounded-2xl border border-[#C9A87C]/25 bg-[#C9A87C]/5"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <span className="text-[#C9A87C] text-base">✦</span>
              <p className="text-xs text-[#2A3D2E]/55 leading-relaxed">
                <span className="font-semibold text-[#2A3D2E]/75">You&apos;re in early access.</span>{" "}
                Closet uploads and outfit generation are coming very soon — we&apos;ll email you the moment they&apos;re live.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
