// Helpers for the Today's Suggestions feature. Mirrors the web component
// apps/web/app/components/TodaysOutfits.js so the two stay in lock-step.
import { supabase } from "./supabase";

// The day boundary for "today's outfits" is 4am local time — before 4am we
// still show yesterday's, after 4am we show today's. Matches the web helper of
// the same name so both clients request the same daily_outfits row.
export function todayLocalForDailyOutfits(): string {
  const now = new Date();
  if (now.getHours() < 4) now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Resolve signed display URLs (valid 1h) for a set of wardrobe item ids.
// image_url is a Storage path, not a public URL — same resolution pattern as
// hooks/useCloset.ts. Returns a map of item id → signed URL (or null).
export async function resolveSignedItemUrls(
  itemIds: string[]
): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(itemIds.filter(Boolean)));
  if (unique.length === 0) return {};

  const { data: items } = await supabase
    .from("wardrobe_items")
    .select("id, image_url")
    .in("id", unique);
  if (!items?.length) return {};

  const { data: signed } = await supabase.storage
    .from("wardrobe")
    .createSignedUrls(
      items.map((i) => i.image_url),
      3600
    );
  const urlByPath = Object.fromEntries(
    (signed ?? []).map((s) => [s.path, s.signedUrl])
  );
  return Object.fromEntries(
    items.map((i) => [i.id, urlByPath[i.image_url] ?? null])
  );
}
