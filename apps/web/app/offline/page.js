// Offline fallback — served by the service worker for navigations when the
// network is unreachable and nothing matching is cached. Kept intentionally
// tiny so it precaches cheaply.

import Wordmark from "@/app/components/Wordmark";

export const metadata = {
  title: "Offline — Perene",
};

export default function OfflinePage() {
  return (
    <main
      className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="mb-8 text-2xl text-[#2A3D2E]">
        <Wordmark />
      </div>
      <h1
        className="text-2xl md:text-3xl font-bold text-[#2A3D2E] mb-3"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        You&apos;re offline
      </h1>
      <p className="text-[#2A3D2E]/60 text-base leading-relaxed max-w-sm">
        Perene needs a connection to style something new. Any looks you&apos;ve
        already viewed today are still here — reconnect when you&apos;re ready.
      </p>
    </main>
  );
}
