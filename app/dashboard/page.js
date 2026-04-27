"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Wordmark from "@/app/components/Wordmark";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2A3D2E]/20 border-t-[#C4E552] rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F1E8]" style={{ fontFamily: "var(--font-inter)" }}>
      {/* Minimal nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-[#2A3D2E]/10 bg-[#F5F1E8]">
        <Link href="/" className="text-2xl text-[#2A3D2E]">
          <Wordmark />
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-[#2A3D2E]/60 hover:text-[#2A3D2E] transition-colors"
        >
          Sign out
        </button>
      </nav>

      {/* Placeholder content */}
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C9A87C]/50 text-[#C9A87C] text-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4E552] inline-block" />
          Early Access
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-[#2A3D2E] mb-4 leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
          Your dashboard
          <br />
          <span className="italic text-[#C9A87C]">is coming soon.</span>
        </h1>
        <p className="text-[#2A3D2E]/60 text-lg leading-relaxed mb-10 max-w-md mx-auto">
          You&apos;re in! We&apos;re building out your wardrobe manager, outfit generator, and style profile. Sit tight.
        </p>
        <p className="text-sm text-[#2A3D2E]/40">
          Signed in as <span className="text-[#2A3D2E]/70 font-medium">{user?.email}</span>
        </p>

        <div className="mt-10">
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C4E552] text-[#2A3D2E] font-semibold text-sm hover:bg-[#d4f562] transition-colors"
          >
            Retake style quiz →
          </Link>
        </div>
      </div>
    </main>
  );
}
