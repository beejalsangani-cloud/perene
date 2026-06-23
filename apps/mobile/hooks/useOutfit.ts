import { useQuery } from "@tanstack/react-query";
import type { Outfit, WardrobeItem } from "@perene/shared";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/context/AuthContext";

export interface OutfitWithItem extends WardrobeItem {
  signedUrl: string | null;
}

export interface OutfitDetail {
  outfit: Outfit;
  // item id → wardrobe row (with signed URL) for the outfit's selected items
  items: Record<string, OutfitWithItem>;
}

// Outfit detail data for the [id] screen. Mirrors the web detail page
// (apps/web/app/outfits/[id]/page.js): read the RLS-scoped outfit row directly
// via the Supabase client (no API route needed — like useProfile), then the
// wardrobe_items it selected, signed for display. Returns null when not found.
export function useOutfit(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["outfit", id],
    enabled: !!user && !!id,
    queryFn: async (): Promise<OutfitDetail | null> => {
      const { data: outfitRow, error } = await supabase
        .from("outfits")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!outfitRow) return null;

      const outfit = outfitRow as Outfit;
      const itemIds = (outfit.generated_outfit?.selected_items ?? [])
        .map((s) => s.item_id)
        .filter(Boolean);

      if (itemIds.length === 0) return { outfit, items: {} };

      const { data: rows } = await supabase
        .from("wardrobe_items")
        .select("*")
        .in("id", itemIds)
        .eq("user_id", user!.id);
      if (!rows?.length) return { outfit, items: {} };

      const { data: signed } = await supabase.storage
        .from("wardrobe")
        .createSignedUrls(
          rows.map((r) => r.image_url),
          3600
        );
      const urlByPath = Object.fromEntries(
        (signed ?? []).map((s) => [s.path, s.signedUrl])
      );

      const items = Object.fromEntries(
        rows.map((r) => [
          r.id,
          { ...(r as WardrobeItem), signedUrl: urlByPath[r.image_url] ?? null },
        ])
      );
      return { outfit, items };
    },
  });
}
