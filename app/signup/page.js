"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Wordmark from "@/app/components/Wordmark";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/quiz` },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // If Supabase returns a session immediately, email confirmation is off → go straight to quiz
    if (data.session) {
      router.push("/quiz");
    } else {
      // Email confirmation is on → show "check your inbox" state
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <Link href="/" className="inline-block mb-8 text-2xl text-[#2A3D2E]">
            <Wordmark />
          </Link>
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-[#2A3D2E]/8">
            <div className="w-14 h-14 rounded-full bg-[#C4E552]/20 flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#2A3D2E]">
                <path d="M3 8l9 6 9-6M3 8v10a1 1 0 001 1h16a1 1 0 001-1V8M3 8a1 1 0 011-1h16a1 1 0 011 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#2A3D2E] mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
              Check your inbox
            </h2>
            <p className="text-[#2A3D2E]/65 text-sm leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
              We sent a confirmation link to <strong className="text-[#2A3D2E]">{email}</strong>. Click it to activate your account and get started with your style quiz.
            </p>
          </div>
        </div>
      </main>
    );
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
            Style, personalised.
          </p>
          <h2 className="text-4xl font-bold text-[#F5F1E8] leading-tight mb-6" style={{ fontFamily: "var(--font-playfair)" }}>
            Your wardrobe,
            <br />
            <span className="italic text-[#C4E552]">finally sorted.</span>
          </h2>
          <p className="text-[#F5F1E8]/60 text-base leading-relaxed">
            Create your free account and take the style quiz — it only takes two minutes.
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
            Get started
          </p>
          <h1 className="text-3xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            Create your account
          </h1>
          <p className="text-[#2A3D2E]/55 text-sm mb-8">
            Free while we&apos;re in early access.
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
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/15 bg-white text-[#2A3D2E] placeholder-[#2A3D2E]/30 outline-none focus:border-[#C4E552] transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2A3D2E]/70 uppercase tracking-wider mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat your password"
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
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#2A3D2E]/55">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#2A3D2E] underline underline-offset-2 hover:text-[#C9A87C] transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
