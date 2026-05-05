"use client";

import { useEffect, useState } from "react";
import Wordmark from "./Wordmark";

const LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Join Waitlist", href: "#waitlist" },
];

export default function Navbar() {
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Shadow the nav slightly once the user scrolls past the hero
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sectionIds = LINKS.map((l) => l.href.slice(1));
    const observers = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        // Trigger when the section reaches ~20% from the top of the viewport
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e) { if (e.key === "Escape") setMenuOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function handleClick(e, href) {
    e.preventDefault();
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[#F5F1E8]/95 backdrop-blur-md border-b border-[#2A3D2E]/10 transition-shadow duration-300 ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="text-2xl text-[#2A3D2E] hover:opacity-80 transition-opacity"
        >
          <Wordmark />
        </a>

        {/* Nav tabs (desktop) */}
        <ul className="hidden sm:flex items-center gap-1">
          {LINKS.map(({ label, href }) => {
            const id = href.slice(1);
            const isActive = active === id;
            return (
              <li key={href}>
                <a
                  href={href}
                  onClick={(e) => handleClick(e, href)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-[#2A3D2E] bg-[#C4E552]"
                      : "text-[#2A3D2E]/70 hover:text-[#2A3D2E] hover:bg-[#C4E552]/25"
                  }`}
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Right cluster: auth buttons + mobile menu trigger */}
        <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-inter)" }}>
          <a
            href="/login"
            className="hidden sm:block px-4 py-2 rounded-full text-[#2A3D2E]/75 text-sm font-medium hover:text-[#2A3D2E] hover:bg-[#2A3D2E]/6 transition-all"
          >
            Log In
          </a>
          <a
            href="/signup"
            className="px-5 py-2.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-semibold text-sm tracking-wide hover:bg-[#d4f562] active:scale-95 transition-all"
          >
            Sign Up
          </a>

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
        </div>
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

        {/* Section anchors */}
        <ul className="flex flex-col gap-1 p-3">
          {LINKS.map(({ label, href }) => {
            const id = href.slice(1);
            const isActive = active === id;
            return (
              <li key={href}>
                <a
                  href={href}
                  onClick={(e) => handleClick(e, href)}
                  className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    isActive
                      ? "bg-[#C4E552] text-[#2A3D2E] font-semibold"
                      : "text-[#2A3D2E]/75 hover:bg-[#C4E552]/20 hover:text-[#2A3D2E]"
                  }`}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Footer: Log In (mobile-equivalent of the desktop link) */}
        <div className="mt-auto p-4 border-t border-[#2A3D2E]/10">
          <a
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="block text-center px-4 py-3 rounded-xl border border-[#2A3D2E]/20 text-sm font-semibold text-[#2A3D2E]/80 hover:text-[#2A3D2E] hover:border-[#2A3D2E]/40 transition-all"
          >
            Log In
          </a>
        </div>
      </aside>
    </>
  );
}
