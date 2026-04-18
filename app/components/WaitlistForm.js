"use client";

import { useState } from "react";

export default function WaitlistForm({ variant = "hero" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | duplicate | error
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.status === 201) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
      } else if (res.status === 200) {
        setStatus("duplicate");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  const isHero = variant === "hero";

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 ${
          isHero ? "text-left" : "justify-center"
        }`}
      >
        <span className="text-2xl">✦</span>
        <p
          className={`font-semibold text-lg ${
            isHero ? "text-[#2A3D2E]" : "text-[#2A3D2E]"
          }`}
          style={{ fontFamily: "var(--font-inter)" }}
        >
          You&apos;re on the list! We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col sm:flex-row gap-3 w-full ${
        isHero ? "max-w-md" : "max-w-lg mx-auto"
      }`}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className={`flex-1 px-5 py-3.5 rounded-full border-2 outline-none text-[#2A3D2E] placeholder-[#2A3D2E]/40 transition-all focus:border-[#C4E552] ${
          isHero
            ? "bg-white/80 border-[#2A3D2E]/20 text-base"
            : "bg-[#F5F1E8] border-[#2A3D2E]/30 text-base"
        }`}
        style={{ fontFamily: "var(--font-inter)" }}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-7 py-3.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-base tracking-wide hover:bg-[#d4f562] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shadow-sm cursor-pointer"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {status === "loading" ? "Joining…" : "Join the Waitlist"}
      </button>
      {(status === "error" || status === "duplicate") && (
        <p
          className="absolute mt-16 text-sm text-[#8B4513]"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {message}
        </p>
      )}
    </form>
  );
}
