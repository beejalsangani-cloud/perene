"use client";

// Soft, dismissable "install Perene" banner for mobile only.
//   - iOS Safari: no programmatic install exists, so we show Share → Add to
//     Home Screen instructions.
//   - Android Chrome: we capture beforeinstallprompt and trigger the native
//     install dialog from the "Install" button.
//   - Hidden when already installed (standalone display mode).
//   - Hidden on desktop (we only act on iOS / Android user agents, and the
//     Android path only shows once beforeinstallprompt actually fires).
//   - "Maybe later" dismisses for 7 days (localStorage timestamp).
// Mounted on the dashboard; renders a fixed bottom banner or nothing.

import { useEffect, useState } from "react";

const DISMISS_KEY = "perene:install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function dismissedRecently() {
  const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (!at) return false;
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function detectPlatform() {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as desktop Safari; disambiguate via touch points.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const iosSafari = isIOS && !/crios|fxios|edgios/i.test(ua); // A2HS is Safari-only
  const isAndroid = /android/i.test(ua);
  return { iosSafari, isAndroid };
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 inline-block align-text-bottom">
      <path d="M12 3v12M12 3 8 7M12 3l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function InstallPrompt() {
  const [mode, setMode] = useState(null); // "ios" | "android" | null
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || dismissedRecently()) return;

    const { iosSafari, isAndroid } = detectPlatform();

    if (iosSafari) {
      // Defer in a timeout (not a synchronous setState in the effect body) so
      // the page settles before the banner eases in.
      const t = setTimeout(() => {
        setMode("ios");
        setVisible(true);
      }, 1500);
      return () => clearTimeout(t);
    }

    if (isAndroid) {
      const onBeforeInstall = (e) => {
        e.preventDefault(); // suppress Chrome's mini-infobar; we show our own
        setDeferredPrompt(e);
        setMode("android");
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", onBeforeInstall);
      return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    }
    // Desktop / other → never show.
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {}
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible || !mode) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-0 pointer-events-none"
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-[#2A3D2E]/10 bg-[#F5F1E8] shadow-[0_8px_30px_rgba(42,61,46,0.18)] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2A3D2E] text-[#F5F1E8] flex items-center justify-center flex-shrink-0 text-lg font-bold"
            style={{ fontFamily: "Georgia, serif" }}>
            P
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#2A3D2E] leading-snug" style={{ fontFamily: "var(--font-playfair)" }}>
              Install Perene on your phone
            </p>
            {mode === "ios" ? (
              <p className="mt-1 text-xs text-[#2A3D2E]/65 leading-relaxed">
                Tap <ShareIcon /> <span className="font-semibold">Share</span>, then{" "}
                <span className="font-semibold">Add to Home Screen</span>.
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#2A3D2E]/65 leading-relaxed">
                Add it to your home screen for one-tap styling, every day.
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              {mode === "android" && (
                <button
                  type="button"
                  onClick={install}
                  className="px-4 py-2 rounded-full bg-[#C4E552] text-[#2A3D2E] text-xs font-bold hover:bg-[#d4f562] active:scale-95 transition-all cursor-pointer"
                >
                  Install
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="px-3 py-2 text-xs font-semibold text-[#2A3D2E]/55 hover:text-[#2A3D2E]/80 transition-colors cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 text-[#2A3D2E]/35 hover:text-[#2A3D2E]/70 transition-colors cursor-pointer -mr-1 -mt-1 p-1"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
