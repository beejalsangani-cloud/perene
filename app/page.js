import WaitlistForm from "./components/WaitlistForm";
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
            <WaitlistForm variant="hero" />
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

// ── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
          <rect x="6" y="4" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M13 14h14M13 20h10M13 26h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 2v6M16 2v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: "Upload Your Closet",
      description:
        "Photograph or catalog your existing wardrobe. Perene maps every piece — its colour, fit, occasion-type, and more.",
    },
    {
      number: "02",
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
          <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2" />
          <path d="M20 10v10l6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: "Tell Us the Occasion",
      description:
        "Date night? Board meeting? Weekend brunch? Enter the event, vibe, and any dress-code notes.",
    },
    {
      number: "03",
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
          <path d="M20 6l3.09 9.26H32l-7.27 5.27 2.78 8.54L20 24.1l-7.51 5.07 2.78-8.54L8 15.26h8.91L20 6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ),
      title: "Get Your Perfect Outfit",
      description:
        "Receive a complete, styled look from your own wardrobe — plus curated shopping suggestions to fill any gaps.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 md:px-12 bg-[#2A3D2E]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-[#C9A87C] text-sm font-medium tracking-widest uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            How It Works
          </p>
          <h2
            className="text-4xl md:text-5xl font-bold text-[#F5F1E8] leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Dressed perfectly,
            <br />
            <span className="italic text-[#C4E552]">in three steps.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative p-8 rounded-2xl bg-[#3D5C42]/40 border border-[#F5F1E8]/10 hover:border-[#C4E552]/40 transition-all group"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="hidden md:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-[#C9A87C]/30"
                />
              )}
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#C4E552]/15 flex items-center justify-center text-[#C4E552] group-hover:bg-[#C4E552]/25 transition-colors">
                  {step.icon}
                </div>
                <div>
                  <span
                    className="text-xs font-bold text-[#C9A87C]/60 tracking-widest block mb-1"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {step.number}
                  </span>
                  <h3
                    className="text-xl font-semibold text-[#F5F1E8] mb-3 leading-snug"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm text-[#F5F1E8]/60 leading-relaxed"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
          <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" />
          <path d="M16 18h16M16 26h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="34" cy="36" r="6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
          <path d="M32 36l1.5 1.5L36 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: "Virtual Closet",
      heading: "Your entire wardrobe, organised.",
      body: "Upload once, access forever. Every garment catalogued by colour, category, and occasion — so you always know exactly what you own.",
    },
    {
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
          <path d="M24 10l3.5 10.5H38l-9 6.5 3.5 10.5L24 31l-8.5 6.5 3.5-10.5-9-6.5H20.5L24 10z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      ),
      label: "AI Outfit Generator",
      heading: "The right look, every time.",
      body: "Describe the occasion and your vibe. Perene instantly assembles a styled outfit from your wardrobe that fits the moment perfectly.",
    },
    {
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
          <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2.5" />
          <path d="M24 16v8l5 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8l4 4M36 8l-4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
      label: "Wardrobe Gap Analysis",
      heading: "Know what you're missing.",
      body: "Perene identifies the key pieces you're lacking — a tailored blazer, the right white tee — and tells you exactly what to invest in next.",
    },
    {
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
          <path d="M14 14h20v4l-10 6-10-6v-4z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="10" y="22" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
          <path d="M19 30h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
      label: "Affiliate Shopping",
      heading: "Shop smarter, not harder.",
      body: "Get hand-picked product recommendations that actually match your style and budget — from brands you'll love.",
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
            Features
          </p>
          <h2
            className="text-4xl md:text-5xl font-bold text-[#2A3D2E] leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Everything your
            <br />
            <span className="italic">wardrobe needs.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`p-8 rounded-2xl border transition-all hover:shadow-lg group ${
                i % 2 === 0
                  ? "bg-white border-[#2A3D2E]/10 hover:border-[#C4E552]/60"
                  : "bg-[#EDE7D6] border-[#2A3D2E]/8 hover:border-[#C9A87C]/60"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#2A3D2E]/8 flex items-center justify-center text-[#2A3D2E] mb-5 group-hover:bg-[#C4E552]/20 group-hover:text-[#2A3D2E] transition-all">
                {f.icon}
              </div>
              <span
                className="text-xs font-bold text-[#C9A87C] tracking-widest uppercase block mb-2"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {f.label}
              </span>
              <h3
                className="text-2xl font-bold text-[#2A3D2E] mb-3 leading-snug"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {f.heading}
              </h3>
              <p
                className="text-[#2A3D2E]/65 text-base leading-relaxed"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Waitlist CTA ──────────────────────────────────────────────────────────────
function WaitlistCTA() {
  return (
    <section id="waitlist" className="py-24 md:py-32 px-6 md:px-12 bg-[#EDE7D6]">
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
          Join the Waitlist
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
          . Be among the first to experience AI-powered personal styling — and
          help shape the product.
        </p>

        <WaitlistForm variant="cta" />

        <p
          className="mt-5 text-sm text-[#2A3D2E]/40"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          No spam. No credit card. Unsubscribe anytime.
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
        <HowItWorks />
        <Features />
        <WaitlistCTA />
      </main>
      <Footer />
    </>
  );
}
