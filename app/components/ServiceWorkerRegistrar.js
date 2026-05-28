"use client";

// Registers /public/sw.js. Production only — in dev, Turbopack serves unhashed
// chunks that change constantly, so a caching SW would hand back stale code.
// (`next start` after `next build` runs as production, as does any deploy.)
// Renders nothing; mounted once in the root layout.

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("[sw] registration failed:", err));
    };

    // Wait for load so SW registration doesn't compete with first paint.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
