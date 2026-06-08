// Perene brand tokens — single source of truth for both web and native.
// Keep in lock-step with the web app's inline hex usage and globals.css.

export const COLORS = {
  forest: "#2A3D2E",
  cream: "#F5F1E8",
  lime: "#C4E552",
  gold: "#C9A87C",
  // common derived shades used across the UI
  limeBright: "#D4F562", // hover state for lime CTAs
} as const;

export type BrandColor = keyof typeof COLORS;

// Editorial type pairing. Playfair for display/headings, Inter for body.
export const FONTS = {
  display: "PlayfairDisplay", // headings, magazine-cover feel
  body: "Inter",
} as const;

// Font weights we actually load (matches @fontsource usage on web).
export const FONT_WEIGHTS = {
  playfair: [400, 700] as const,
  inter: [400, 500, 600, 700] as const,
};
