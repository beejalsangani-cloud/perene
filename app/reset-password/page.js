"use client";

// Password reset, for both the web app and the iOS app.
//
// 1. "request": enter an email → Supabase emails a recovery link that points
//    back to this page. (The iOS app's "Forgot password?" sends the same email
//    with the same redirect, so every reset finishes here.)
// 2. "update": the link lands here with a recovery session in the URL hash;
//    supabase-js picks it up (detectSessionInUrl) and fires PASSWORD_RECOVERY.
//    The user sets a new password via updateUser.
// 3. "done": confirm, and point app users back to the app to log in.
//
// The redirect URL must be listed under Supabase → Authentication → URL
// Configuration → Redirect URLs, or Supabase falls back to the Site URL.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Wordmark from "@/app/components/Wordmark";

const MIN_LENGTH = 8;

const inputClass =
  "w-full px-4 py-3 rounded-xl border-2 border-[#2A3D2E]/15 bg-white text-[#2A3D2E] placeholder-[#2A3D2E]/30 outline-none focus:border-[#C4E552] transition-colors text-sm";
const buttonClass =
  "mt-2 w-full py-3.5 rounded-xl bg-[#C4E552] text-[#2A3D2E] font-bold text-sm tracking-wide hover:bg-[#d4f562] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer";
const labelClass =
  "block text-xs font-semibold text-[#2A3D2E]/70 uppercase tracking-wider mb-1.5";

function readHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export default function ResetPasswordPage() {
  // request | sent | update | done
  const [mode, setMode] = useState("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // The URL hash only exists in the browser, so read it after hydration.
    const timer = setTimeout(() => {
      const hash = readHashParams();
      if (hash.get("error_description")) {
        setError("That reset link has expired or was already used. Request a new one below.");
      } else if (hash.get("type") === "recovery") {
        setMode("update");
      }
    }, 0);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function requestLink(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    // Same message whether or not the account exists, so the form can't be
    // used to discover who has an account.
    if (err && !/not found|no user/i.test(err.message)) {
      setError("Couldn't send the email right now. Please try again in a few minutes.");
      return;
    }
    setMode("sent");
  }

  async function updatePassword(e) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(
        /session/i.test(err.message)
          ? "That reset link has expired. Request a new one below."
          : err.message
      );
      if (/session/i.test(err.message)) setMode("request");
      return;
    }
    // Clear the recovery tokens from the address bar.
    window.history.replaceState(null, "", "/reset-password");
    setMode("done");
  }

  return (
    <main
      className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6 py-16"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block mb-8 text-2xl text-[#2A3D2E]">
          <Wordmark />
        </Link>

        <p className="text-[#C9A87C] text-xs font-medium tracking-widest uppercase mb-2">
          Account
        </p>

        {mode === "request" && (
          <>
            <h1 className="text-3xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
              Reset your password
            </h1>
            <p className="text-[#2A3D2E]/55 text-sm mb-8">
              Enter the email on your Perene account and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={requestLink} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Sending…" : "Send reset link →"}
              </button>
            </form>
          </>
        )}

        {mode === "sent" && (
          <>
            <h1 className="text-3xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
              Check your email
            </h1>
            <p className="text-[#2A3D2E]/70 text-sm leading-relaxed">
              If there&apos;s a Perene account for <strong>{email}</strong>, a reset link is on its way.
              Open it on this device to choose a new password. It can take a minute or two, and it may
              land in spam.
            </p>
          </>
        )}

        {mode === "update" && (
          <>
            <h1 className="text-3xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
              Choose a new password
            </h1>
            <p className="text-[#2A3D2E]/55 text-sm mb-8">At least {MIN_LENGTH} characters.</p>
            <form onSubmit={updatePassword} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Saving…" : "Save new password →"}
              </button>
            </form>
          </>
        )}

        {mode === "done" && (
          <>
            <h1 className="text-3xl font-bold text-[#2A3D2E] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
              Password updated
            </h1>
            <p className="text-[#2A3D2E]/70 text-sm leading-relaxed mb-8">
              You&apos;re all set. Using the Perene iPhone app? Open it and log in with your new password.
            </p>
            <Link href="/dashboard" className={`${buttonClass} block text-center`}>
              Continue on the web →
            </Link>
          </>
        )}

        <p className="mt-8 text-center text-sm text-[#2A3D2E]/55">
          <Link href="/login" className="font-semibold text-[#2A3D2E] underline underline-offset-2 hover:text-[#C9A87C]">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F5F1E8] border border-[#2A3D2E]/15">
      <span className="text-sm">⚠</span>
      <p className="text-sm text-[#2A3D2E] font-medium">{message}</p>
    </div>
  );
}
