// Shared shell for /privacy, /terms and /support: cream page, wordmark home
// link, Playfair headings, readable body measure. Kept dependency-free so the
// pages stay static and cheap to serve.
import Link from "next/link";
import Wordmark from "@/app/components/Wordmark";

export function LegalPage({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-[#F5F1E8]" style={{ fontFamily: "var(--font-inter)" }}>
      <header className="px-6 md:px-12 py-6 border-b border-[#2A3D2E]/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl text-[#2A3D2E]" aria-label="Perene home">
            <Wordmark />
          </Link>
          <nav className="flex gap-5 text-sm text-[#2A3D2E]/60">
            <Link href="/privacy" className="hover:text-[#2A3D2E]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#2A3D2E]">Terms</Link>
            <Link href="/support" className="hover:text-[#2A3D2E]">Support</Link>
          </nav>
        </div>
      </header>
      <main className="px-6 md:px-12 py-12">
        <article className="max-w-3xl mx-auto text-[#2A3D2E]">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {title}
          </h1>
          {updated && <p className="text-sm text-[#2A3D2E]/50 mb-10">Last updated: {updated}</p>}
          <div className="space-y-8 text-[15px] leading-relaxed text-[#2A3D2E]/85">{children}</div>
        </article>
      </main>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-[#2A3D2E]" style={{ fontFamily: "var(--font-playfair)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function List({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function Mail({ address }) {
  return (
    <a href={`mailto:${address}`} className="underline underline-offset-2 text-[#2A3D2E]">
      {address}
    </a>
  );
}
