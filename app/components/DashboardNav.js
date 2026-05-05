"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Wordmark from "./Wordmark";

const TABS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Closet",    href: "/wardrobe"  },
  { label: "Outfits",   href: "/outfits"   },
  { label: "Profile",   href: "/quiz"      },
];

export default function DashboardNav({ user }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Close mobile menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e) { if (e.key === "Escape") setMenuOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Truncate long emails so the nav doesn't crowd on small screens
  const displayEmail = user?.email
    ? user.email.length > 22
      ? user.email.slice(0, 20) + "…"
      : user.email
    : "";

  return (
    <>
      <nav
        className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 md:px-10 py-4 bg-[#F5F1E8]/95 backdrop-blur-md border-b border-[#2A3D2E]/10"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex-shrink-0 text-xl text-[#2A3D2E] hover:opacity-75 transition-opacity">
          <Wordmark />
        </Link>

        {/* Centre tabs (desktop) */}
        <ul className="hidden sm:flex items-center gap-1">
          {TABS.map(({ label, href }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-[#C4E552] text-[#2A3D2E]"
                      : "text-[#2A3D2E]/60 hover:text-[#2A3D2E] hover:bg-[#C4E552]/20"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right cluster (desktop): email + sign-out */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <span className="hidden md:block text-xs text-[#2A3D2E]/45 font-medium">
            {displayEmail}
          </span>
          <button
            onClick={signOut}
            className="px-4 py-2.5 rounded-full border border-[#2A3D2E]/15 text-xs font-semibold text-[#2A3D2E]/65 hover:text-[#2A3D2E] hover:border-[#2A3D2E]/30 transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          className="sm:hidden w-11 h-11 -mr-2 flex items-center justify-center text-[#2A3D2E] hover:text-[#C9A87C] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </nav>

      {/* Mobile menu overlay (right slide-in panel) */}
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
        className={`sm:hidden fixed inset-0 z-50 bg-[#2A3D2E]/45 backdrop-blur-sm transition-opacity duration-200 ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!menuOpen}
        className={`sm:hidden fixed top-0 right-0 z-50 h-full w-[85%] max-w-xs bg-[#F5F1E8] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3D2E]/10">
          <span className="text-xs font-semibold text-[#C9A87C] uppercase tracking-widest">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="w-11 h-11 -mr-2 flex items-center justify-center text-[#2A3D2E] hover:text-[#C9A87C] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <ul className="flex flex-col gap-1 p-3">
          {TABS.map(({ label, href }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    active
                      ? "bg-[#C4E552] text-[#2A3D2E] font-semibold"
                      : "text-[#2A3D2E]/75 hover:bg-[#C4E552]/20 hover:text-[#2A3D2E]"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer: email + sign out */}
        <div className="mt-auto p-4 border-t border-[#2A3D2E]/10 flex flex-col gap-3">
          {user?.email && (
            <p className="px-2 text-xs text-[#2A3D2E]/45 truncate" title={user.email}>
              {user.email}
            </p>
          )}
          <button
            onClick={() => { setMenuOpen(false); signOut(); }}
            className="px-4 py-3 rounded-xl border border-[#2A3D2E]/20 text-sm font-semibold text-[#2A3D2E]/80 hover:text-[#2A3D2E] hover:border-[#2A3D2E]/40 transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
