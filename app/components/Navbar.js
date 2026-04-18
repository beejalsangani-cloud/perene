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

  function handleClick(e, href) {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
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

      {/* Nav tabs */}
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

      {/* CTA — hidden on very small screens to avoid crowding */}
      <a
        href="#waitlist"
        onClick={(e) => handleClick(e, "#waitlist")}
        className="hidden sm:block px-5 py-2.5 rounded-full bg-[#C4E552] text-[#2A3D2E] font-semibold text-sm tracking-wide hover:bg-[#d4f562] active:scale-95 transition-all"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        Get Early Access
      </a>

      {/* Mobile: just the CTA */}
      <a
        href="#waitlist"
        onClick={(e) => handleClick(e, "#waitlist")}
        className="sm:hidden px-4 py-2 rounded-full bg-[#C4E552] text-[#2A3D2E] font-semibold text-sm hover:bg-[#d4f562] transition-colors"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        Join
      </a>
    </nav>
  );
}
