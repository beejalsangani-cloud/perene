"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Wordmark from "@/app/components/Wordmark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#F5F1E8] flex" style={{ fontFamily: "var(--font-inter)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#2A3D2E] flex-col justify-between p-12">
        <Link href="/" className="text-2xl text-[#F5F1E8]">
          <Wordmark />
        </Link>
        <div>
          <p className="text-[#C9A87C] text-sm font-medium tracking-widest uppercase mb-5">
            Welcome back.
          </p>
          <h2 className="text-4xl font-bold text-[#F5F1E8] leading-tight mb-6" style={{ fontFamily: "var(--font-playfair)" }}>
            Good to see
            <br />
            <span className="italic text-[#C4E552]">you again.</span>
          </h2>
          <p className="text-[#F5F1E8]/60 text-base leading-relaxed">
            Log back in to access your wardrobe, outfits, and style profile.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-px bg-[#C9A87C]/40" />
          <span className="text-[#C9A87C]/60 text-xs tracking-widest uppercase">Perene</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden inline-block mb-8 text-2xl text-[#2A3D2E]">
            <Wordmark />
          </Link>

          <p className="text-[#C9A87C] text-xs font-medium tracking-widest uppercase mb-2">
            Sign in
          </p>
          <h1 className="text-3xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            Welcome back
          </h1>
          <p className="text-[#2A3D2E]/55 text-sm mb-8">
            Log in to your Perene account.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2A3D2E]/70 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/15 bg-white text-[#2A3D2E] placeholder-[#2A3D2E]/30 outline-none focus:border-[#C4E552] transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2A3D2E]/70 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/15 bg-white text-[#2A3D2E] placeholder-[#2A3D2E]/30 outline-none focus:border-[#C4E552] transition-colors text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F5F1E8] border border-[#2A3D2E]/15">
                <span className="text-sm">⚠</span>
                <p className="text-sm text-[#2A3D2E] font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl bg-[#C4E552] text-[#2A3D2E] font-bold text-sm tracking-wide hover:bg-[#d4f562] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Logging in…" : "Log In →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#2A3D2E]/55">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#2A3D2E] underline underline-offset-2 hover:text-[#C9A87C] transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
