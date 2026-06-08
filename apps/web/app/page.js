import Navbar from "./components/Navbar";
import Wordmark from "./components/Wordmark";

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-10 px-6 md:px-12 overflow-hidden">
      {/* Background image */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero.jpg')" }}
      />

      {/* Gradient overlay: forest green 27% on left → 4% on right */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(42,61,46,0.27) 0%, rgba(42,61,46,0.04) 100%)",
        }}
      />

      {/* Content — pinned left */}
      <div className="relative max-w-6xl mx-auto w-full">
        <div className="max-w-xl">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C9A87C]/60 text-[#C9A87C] text-sm font-medium mb-6"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C4E552] inline-block" />
            Free Early Access
          </div>

          <h1
            className="font-bold text-white leading-[1.08] tracking-tight mb-5"
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: "clamp(40px, 4.5vw, 56px)",
              textShadow:
                "3px 3px 6px rgba(0,0,0,0.5), 1px 1px 2px rgba(0,0,0,0.4)",
            }}
          >
            Meet Your Personal Stylist,
            <br />
            <span className="text-[#C4E552]">
              <Wordmark italic />
            </span>
          </h1>

          <p
            className="text-white/90 max-w-lg leading-relaxed mb-8"
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: "clamp(16px, 1.3vw, 19px)",
              textShadow:
                "3px 3px 6px rgba(0,0,0,0.5), 1px 1px 2px rgba(0,0,0,0.4)",
            }}
          >
            Stop standing in front of your closet wondering what to wear. Perene
            learns your style, knows your wardrobe, and curates the perfect look
            for every dinner, brunch, meeting, and moment.
          </p>

          <div className="relative">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-base tracking-wide hover:bg-[#d4f562] active:scale-95 transition-all shadow-sm"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Sign Up Free →
            </a>
            <p
              className="mt-3 text-sm text-white/60"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Free while in early access. No credit card required.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── What Perene does ─────────────────────────────────────────────────────────
function WhatPereneDoes() {
  const tiles = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
      title: "Your wardrobe, finally organized",
      body:  "Photograph what you own. Perene tags every piece by color, fit, and vibe — so you stop forgetting what's hiding in the back of your closet.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M5 3v4M3 5h4M19 17v4M17 19h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      title: "An outfit for every day, not just every event",
      body:  "Whether it's Tuesday at the office, Saturday brunch, or that rare dinner where it actually matters — Perene styles you using clothes you already own.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      title: "Know what you're missing",
      body:  "Notice the gaps. Tailored blazer? White tee that fits right? The pieces that complete what you have, not the generic trends that don't.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      title: "Shop smarter, not harder",
      body:  "When it's time to buy, Perene picks the specific products — from the right brands at the right prices.",
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 px-6 md:px-12 bg-[#F5F1E8]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-[#C9A87C] text-sm font-medium tracking-widest uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            What Perene Does
          </p>
          <h2
            className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Everything
            <br />
            <span className="italic">Perene offers.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiles.map((t, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl border transition-all hover:shadow-lg group ${
                i % 2 === 0
                  ? "bg-white border-[#2A3D2E]/10 hover:border-[#C4E552]/60"
                  : "bg-[#EDE7D6] border-[#2A3D2E]/8 hover:border-[#C9A87C]/60"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#2A3D2E]/8 flex items-center justify-center text-[#2A3D2E] mb-5 group-hover:bg-[#C4E552]/20 group-hover:text-[#2A3D2E] transition-all">
                {t.icon}
              </div>
              <h3
                className="text-xl md:text-2xl font-bold text-[#2A3D2E] mb-3 leading-snug"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {t.title}
              </h3>
              <p
                className="text-[#2A3D2E]/65 text-base leading-relaxed"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sign-up CTA ───────────────────────────────────────────────────────────────
function SignUpCTA() {
  return (
    <section id="signup" className="py-24 md:py-32 px-6 md:px-12 bg-[#EDE7D6]">
      <div className="max-w-2xl mx-auto text-center">
        {/* Ornament */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="w-12 h-px bg-[#C9A87C]/50" />
          <span className="text-[#C9A87C] text-lg">✦</span>
          <div className="w-12 h-px bg-[#C9A87C]/50" />
        </div>

        <p
          className="text-[#C9A87C] text-sm font-medium tracking-widest uppercase mb-4"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Get Started
        </p>
        <h2
          className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight mb-6"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Be among the first
          <br />
          <span className="italic text-[#C9A87C]">to experience it.</span>
        </h2>
        <p
          className="text-[#2A3D2E]/65 text-lg leading-relaxed mb-10 max-w-lg mx-auto"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Perene is{" "}
          <span className="font-semibold text-[#2A3D2E]">
            free while we&apos;re in early access
          </span>
          . Sign up to start building your AI-styled wardrobe in minutes.
        </p>

        <a
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#C4E552] text-[#2A3D2E] font-bold text-base tracking-wide hover:bg-[#d4f562] active:scale-95 transition-all shadow-sm"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Sign Up Free →
        </a>

        <p
          className="mt-5 text-sm text-[#2A3D2E]/40"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Free while in early access. No credit card required.
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10 px-6 md:px-12 bg-[#2A3D2E]">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xl text-[#F5F1E8]">
          <Wordmark />
        </span>
        <p
          className="text-[#F5F1E8]/40 text-sm text-center"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          © {new Date().getFullYear()} Perene. All rights reserved.
        </p>
        <div
          className="flex items-center gap-6 text-sm text-[#F5F1E8]/40"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhatPereneDoes />
        <SignUpCTA />
      </main>
      <Footer />
    </>
  );
}
