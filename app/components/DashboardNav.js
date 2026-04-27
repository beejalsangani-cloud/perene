"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Wordmark from "./Wordmark";

const TABS = [
  { label: "Closet",  href: "/wardrobe" },
  { label: "Outfits", href: "/outfits"  },
  { label: "Profile", href: "/quiz"     },
];

export default function DashboardNav({ user }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Truncate long emails so the nav doesn't crowd on small screens
  const displayEmail = user?.email
    ? user.email.length > 22
      ? user.email.slice(0, 20) + "…"
      : user.email
    : "";

  return (
    <nav
      className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 md:px-10 py-4 bg-[#F5F1E8]/95 backdrop-blur-md border-b border-[#2A3D2E]/10"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex-shrink-0 text-xl text-[#2A3D2E] hover:opacity-75 transition-opacity">
        <Wordmark />
      </Link>

      {/* Centre tabs */}
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

      {/* Right: email + sign-out */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="hidden md:block text-xs text-[#2A3D2E]/45 font-medium">
          {displayEmail}
        </span>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-full border border-[#2A3D2E]/15 text-xs font-semibold text-[#2A3D2E]/65 hover:text-[#2A3D2E] hover:border-[#2A3D2E]/30 transition-all cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
