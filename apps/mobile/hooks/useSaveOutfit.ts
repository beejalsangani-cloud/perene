import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "~/lib/api";
import type { DailyOutfitsData } from "~/hooks/useDailyOutfits";
import type { OutfitDetail } from "~/hooks/useOutfit";
import type { SavedOutfit } from "~/hooks/useSavedOutfits";

interface SaveVars {
  outfitId: string;
  saved: boolean;
}

// Toggle is_saved on an outfit via POST /api/outfits/save (the same route the
// web SaveButton calls). Optimistic: patches the outfit-detail and
// daily-outfits caches synchronously so the heart icon + save button flip
// instantly, then rolls back on error. Both the card heart and the detail
// button read is_saved straight from these caches, so they stay in sync.
export function useSaveOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ outfitId, saved }: SaveVars) =>
      apiPost<{ ok: true; saved: boolean }>("/api/outfits/save", {
        outfitId,
        saved,
      }),

    onMutate: async ({ outfitId, saved }: SaveVars) => {
      await queryClient.cancelQueries({ queryKey: ["outfit", outfitId] });
      await queryClient.cancelQueries({ queryKey: ["daily-outfits"] });
      await queryClient.cancelQueries({ queryKey: ["saved-outfits"] });

      const prevDetail = queryClient.getQueryData<OutfitDetail | null>([
        "outfit",
        outfitId,
      ]);
      const prevDaily = queryClient.getQueriesData<DailyOutfitsData>({
        queryKey: ["daily-outfits"],
      });
      const prevSaved = queryClient.getQueriesData<SavedOutfit[]>({
        queryKey: ["saved-outfits"],
      });

      // Patch the detail cache
      queryClient.setQueryData<OutfitDetail | null>(["outfit", outfitId], (cur) =>
        cur?.outfit ? { ...cur, outfit: { ...cur.outfit, is_saved: saved } } : cur
      );

      // Patch every daily-outfits cache that references this outfit
      queryClient.setQueriesData<DailyOutfitsData>(
        { queryKey: ["daily-outfits"] },
        (data) => {
          if (!data) return data;
          const patchSlot = <T extends DailyOutfitsData["response"]["daytime"]>(
            slot: T
          ): T => {
            if (slot?.outfit && slot.outfit_id === outfitId) {
              return {
                ...slot,
                outfit: { ...slot.outfit, is_saved: saved },
              } as T;
            }
            return slot;
          };
          return {
            ...data,
            response: {
              ...data.response,
              daytime: patchSlot(data.response.daytime),
              evening: patchSlot(data.response.evening),
            },
          };
        }
      );

      // Patch the saved-outfits list: drop the outfit when unsaving. (Re-saving
      // from elsewhere is reconciled by the list's own refetch on focus.)
      if (!saved) {
        queryClient.setQueriesData<SavedOutfit[]>(
          { queryKey: ["saved-outfits"] },
          (list) => list?.filter((s) => s.outfit.id !== outfitId)
        );
      }

      return { prevDetail, prevDaily, prevSaved };
    },

    onError: (_err, { outfitId }, context) => {
      if (context?.prevDetail !== undefined) {
        queryClient.setQueryData(["outfit", outfitId], context.prevDetail);
      }
      for (const [key, data] of context?.prevDaily ?? []) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, data] of context?.prevSaved ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
  });
}
