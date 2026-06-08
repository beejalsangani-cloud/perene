// Wardrobe taxonomy — the canonical lists. These were previously duplicated
// between apps/web/app/wardrobe/UploadModal.js and
// apps/web/app/api/wardrobe/process/route.js. Both should import from here.
//
// IMPORTANT: the server-side AI tagging prompt validates against these exact
// strings (whitelist match), so changing a value here is a breaking change for
// stored rows and the Claude prompt — coordinate web + native + API together.

export const CATEGORIES = [
  "Top",
  "Bottom",
  "Dress",
  "Outerwear",
  "Shoes",
  "Accessory",
  "Bag",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEASONS = [
  "Spring",
  "Summer",
  "Fall",
  "Winter",
  "All-season",
] as const;
export type Season = (typeof SEASONS)[number];

// Item colors, with the swatch hex shown in the picker.
export const COLOR_SWATCHES = [
  { id: "Black", hex: "#1A1A1A" },
  { id: "White", hex: "#F0EEEA" },
  { id: "Cream", hex: "#F5F1E8" },
  { id: "Beige", hex: "#D4C5A9" },
  { id: "Brown", hex: "#8B6B3D" },
  { id: "Gray", hex: "#9CA3AF" },
  { id: "Navy", hex: "#1E3A5F" },
  { id: "Forest", hex: "#2A3D2E" },
  { id: "Pastels", hex: "#F4B8D0" },
  { id: "Bold", hex: "#E84848" },
  { id: "Other", hex: "#C8C0B0" },
] as const;
export const ITEM_COLORS = COLOR_SWATCHES.map((c) => c.id);
export type ItemColor = (typeof COLOR_SWATCHES)[number]["id"];

// Style-profile palette swatches (color_preferences on user_profiles) — these
// are higher-level preference buckets, distinct from per-item COLOR_SWATCHES.
export const PALETTE_SWATCHES: Record<string, string> = {
  Neutrals: "#C8C0B0",
  Pastels: "#F4B8D0",
  "Earth tones": "#B8895A",
  "Bold colors": "#E84848",
  "Black & white": "#2A2A2A",
  Pink: "#F080A8",
  Green: "#4A8A50",
  Blue: "#4878C8",
  Other: "#9888A8",
};

// Gating thresholds the client uses for soft-locks (mirror the API).
export const CLOSET_MINIMUM_FOR_DAILY = 5; // Today's Suggestions unlock
export const OUTFIT_GENERATOR_MINIMUM = 5; // manual generator unlock
export const DAILY_UPLOAD_LIMIT = 20; // server-enforced; shown client-side
export const SHUFFLE_LIMIT_FREE = 3; // free-tier per-slot shuffle ceiling
