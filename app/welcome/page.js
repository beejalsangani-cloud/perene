"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Wordmark from "@/app/components/Wordmark";

// Local copy of the dashboard helper so this file is self-contained.
// Priority: user_profiles.first_name → user_metadata → email local part → email/"stylist".
function getFirstName(user, profile) {
  const stored = profile?.first_name?.trim();
  if (stored) return stored;

  const meta = user?.user_metadata;
  if (meta?.full_name) return meta.full_name.split(" ")[0];
  if (meta?.name)      return meta.name.split(" ")[0];

  const prefix = user?.email?.split("@")[0];
  if (prefix) {
    const clean = prefix.replace(/[._\-+]/g, " ").split(" ")[0];
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return user?.email ?? "stylist";
}

export default function WelcomePage() {
  const router = useRouter();

  const [user,      setUser]      = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [ready,     setReady]     = useState(false);

  // Auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      setAuthReady(true);
    });
  }, [router]);

  // Load profile + graduate users who already have items in their closet.
  // Q1 decision: graduate at >= 1 item — once a user has uploaded anything,
  // they understand the product and shouldn't see the welcome screen again.
  useEffect(() => {
    if (!authReady || !user) return;

    Promise.all([
      supabase.from("user_profiles")
        .select("first_name")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("wardrobe_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]).then(([profileRes, countRes]) => {
      const count = countRes.count ?? 0;
      if (count >= 1) {
        router.replace("/dashboard");
        return;
      }
      setProfile(profileRes.data ?? null);
      setReady(true);
    });
  }, [authReady, user, router]);

  function handleSkip() {
    // Tab-scoped skip flag — dashboard checks this so we don't immediately
    // bounce the user back here. Per-tab is intentional (Q3 decision):
    // closing the tab and returning still nudges them through onboarding.
    if (typeof window !== "undefined") {
      sessionStorage.setItem("welcomeSkipped", "1");
    }
    router.push("/dashboard");
  }

  if (!authReady || !ready) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/15 border-t-[#C4E552] rounded-full animate-spin"/>
      </main>
    );
  }

  const firstName = getFirstName(user, profile);

  return (
    <main
      className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center px-6 py-12"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <Link href="/" className="mb-12 text-2xl text-[#2A3D2E]">
        <Wordmark />
      </Link>

      <div className="max-w-md w-full text-center">
        <p className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest mb-3">
          Getting Started
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-[#2A3D2E] leading-tight mb-5"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Welcome to Perene,{" "}
          <span className="italic text-[#C9A87C]">{firstName}.</span>
        </h1>
        <p className="text-[#2A3D2E]/65 text-base leading-relaxed mb-10">
          Let&apos;s start by adding 5 of your favorite pieces. The more Perene knows about your wardrobe, the better it can style you.
        </p>

        <Link
          href="/wardrobe#upload"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-base tracking-wide hover:bg-[#d4f562] active:scale-95 transition-all shadow-sm"
        >
          Add your first item →
        </Link>

        <button
          type="button"
          onClick={handleSkip}
          className="block mx-auto mt-8 text-sm text-[#2A3D2E]/50 hover:text-[#2A3D2E]/75 underline underline-offset-2 transition-colors cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </main>
  );
}
