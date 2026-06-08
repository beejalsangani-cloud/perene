// Core data shapes shared by web + native. Derived from supabase/schema.sql
// and the Claude response contract in api/outfits/generate. These are the
// wire shapes the API returns — keep them in sync with that route.

import type { Category, Season, ItemColor } from "./wardrobe";

// ── user_profiles ────────────────────────────────────────────────────────────
export interface StyleProfile {
  id?: string;
  user_id: string;
  first_name?: string | null;
  gender?: string | null;
  age_range?: string | null;
  body_type?: string | null;
  style_descriptors?: string[];
  lifestyle?: string[];
  typical_events?: string[];
  budget_range?: string | null;
  color_preferences?: string[];
  default_location?: { city?: string; [k: string]: unknown } | null;
  marketing_opt_in?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── wardrobe_items ───────────────────────────────────────────────────────────
// image_url is a Storage path inside the "wardrobe" bucket, not a public URL;
// clients fetch a signed URL at read time.
export interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  category: Category | null;
  color: ItemColor | null;
  season: Season[];
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── weather snapshot (stored on outfits.weather) ─────────────────────────────
export interface Weather {
  location: string;
  date: string;
  temperature_high: number;
  temperature_low: number;
  precipitation_chance: number;
  weather_code: number;
  condition: string;
}

export type ConfidenceLevel = "high" | "medium" | "low";

// ── generated_outfit (Claude JSON contract) ──────────────────────────────────
export interface SelectedItem {
  item_id: string;
  role: string; // top | bottom | dress | outerwear | shoes | accessory | bag
  styling_note: string;
}

export interface MissingItemRetailer {
  name: string; // canonical roster name (server-validated)
  search_query: string;
  url?: string; // affiliate-wrapped shop URL (added by the API for native)
}

export interface MissingItem {
  item: string;
  category: string;
  why: string;
  price_range: string;
  retailers: MissingItemRetailer[];
}

export interface GeneratedOutfit {
  selected_items: SelectedItem[];
  styling_reasoning: string;
  overall_vibe: string;
  confidence_level: ConfidenceLevel;
  human_review_recommended: boolean;
}

// ── outfits ──────────────────────────────────────────────────────────────────
export interface Outfit {
  id: string;
  user_id: string;
  event_description: string;
  location: string | null;
  date: string | null;
  weather: Weather | null;
  generated_outfit: GeneratedOutfit | null;
  missing_items: MissingItem[];
  confidence: ConfidenceLevel | null;
  is_saved?: boolean;
  created_at?: string;
}

// ── daily_outfits (Today's Suggestions) ──────────────────────────────────────
export type DailySlot = "daytime" | "evening";

export interface DailyOutfitSlot {
  daily_id: string;
  slot: DailySlot;
  outfit_id: string;
  shuffle_count: number;
  shuffle_limit: number;
  outfit: Outfit | null;
}

export interface DailyOutfitsResponse {
  closet_count: number;
  closet_minimum: number;
  shuffle_limit: number;
  date: string;
  daytime: DailyOutfitSlot | null;
  evening: DailyOutfitSlot | null;
}
