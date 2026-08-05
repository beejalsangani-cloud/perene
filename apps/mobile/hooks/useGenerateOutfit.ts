import { useMutation } from "@tanstack/react-query";
import { apiPost } from "~/lib/api";

export interface GenerateOutfitInput {
  eventDescription: string;
  location?: string;
  date?: string;
}

// "Generate my outfit" — the manual web flow, ported (apps/web/app/outfits/new).
// User describes an occasion (and optionally a location/date for weather), and
// Perene builds an outfit from their own closet. Same /api/outfits/generate
// route "Get this look" already uses (useGetThisLook), just without an
// inspiration image. Returns the new outfit id so the caller can navigate to
// the shared outfit-detail screen (app/outfits/[id].tsx).
export function useGenerateOutfit() {
  return useMutation({
    mutationFn: async (input: GenerateOutfitInput): Promise<string> => {
      const { id } = await apiPost<{ id: string }>("/api/outfits/generate", {
        eventDescription: input.eventDescription,
        location: input.location || undefined,
        date: input.date || undefined,
      });
      return id;
    },
  });
}
