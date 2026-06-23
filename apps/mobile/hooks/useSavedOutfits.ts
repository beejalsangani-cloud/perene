import { useQuery } from "@tanstack/react-query";
import type { Outfit } from "@perene/shared";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/context/AuthContext";
import { resolveSignedItemUrls } from "~/lib/dailyOutfits";

export interface SavedOutfit {
  outfit: Outfit;
  slotLabel: string;
  collageUrls: string[];
  savedAt: string | null;
}

function slotLabelFor(slot: string | null | undefined): string {
  if (slot === "daytime") return "Daytime suggestion";
  if (slot === "evening") return "Evening suggestion";
  return "Generated outfit";
}

// All of the user's saved (hearted) outfits, newest-saved first. Native mirror
// of apps/web/app/saved/page.js: read outfits where is_saved, join the
// daily_outfits slot for a label, and build a collage from the selected items'
// signed URLs. Covers both daily suggestions and Discover-generated looks.
export function useSavedOutfits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-outfits", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SavedOutfit[]> => {
      const { data: outfitRows, error } = await supabase
        .from("outfits")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_saved", true)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      if (!outfitRows?.length) return [];

      // Slot labels for whichever of these are daily-generated
      const { data: dailyRows } = await supabase
        .from("daily_outfits")
        .select("outfit_id, slot")
        .in(
          "outfit_id",
          outfitRows.map((o) => o.id)
        );
      const slotByOutfit = Object.fromEntries(
        (dailyRows ?? []).map((r) => [r.outfit_id, r.slot])
      );

      // Resolve every referenced wardrobe item's signed URL in one pass
      const allItemIds: string[] = [];
      for (const o of outfitRows as Outfit[]) {
        for (const s of o.generated_outfit?.selected_items ?? []) {
          if (s?.item_id) allItemIds.push(s.item_id);
        }
      }
      const urlByItem = await resolveSignedItemUrls(allItemIds);

      return (outfitRows as Outfit[]).map((o) => ({
        outfit: o,
        slotLabel: slotLabelFor(slotByOutfit[o.id]),
        savedAt: (o as Outfit & { saved_at?: string | null }).saved_at ?? null,
        collageUrls: (o.generated_outfit?.selected_items ?? [])
          .slice(0, 4)
          .map((s) => urlByItem[s.item_id])
          .filter((u): u is string => !!u),
      }));
    },
  });
}
