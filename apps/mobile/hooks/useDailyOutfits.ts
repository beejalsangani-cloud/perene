import { useQuery } from "@tanstack/react-query";
import type { DailyOutfitsResponse } from "@perene/shared";
import { apiGet } from "~/lib/api";
import { useAuth } from "~/context/AuthContext";
import {
  todayLocalForDailyOutfits,
  resolveSignedItemUrls,
} from "~/lib/dailyOutfits";

export interface DailyOutfitsData {
  response: DailyOutfitsResponse;
  // item id → signed display URL (or null) for every selected item across slots
  signedItemUrls: Record<string, string | null>;
}

// Today's Suggestions data. Calls the same /api/daily-outfits GET route the web
// dashboard uses (auto-generates missing slots server-side), then resolves
// signed URLs for the wardrobe items each slot selected. Keyed by user + date so
// the cache survives navigation and refetches at the 4am-local day boundary.
export function useDailyOutfits() {
  const { user } = useAuth();
  const dateStr = todayLocalForDailyOutfits();

  return useQuery({
    queryKey: ["daily-outfits", user?.id, dateStr],
    enabled: !!user,
    queryFn: async (): Promise<DailyOutfitsData> => {
      const response = await apiGet<DailyOutfitsResponse>(
        `/api/daily-outfits?date=${dateStr}`
      );

      const itemIds: string[] = [];
      for (const slot of [response.daytime, response.evening]) {
        const selected = slot?.outfit?.generated_outfit?.selected_items ?? [];
        for (const s of selected) if (s?.item_id) itemIds.push(s.item_id);
      }

      const signedItemUrls = await resolveSignedItemUrls(itemIds);
      return { response, signedItemUrls };
    },
  });
}
