import { useMutation } from "@tanstack/react-query";
import { apiPost } from "~/lib/api";
import type { Photo } from "~/lib/inspiration";

const FALLBACK_DESCRIPTION = "everyday outfit inspiration";

// "Get this look" — the web Discover flow, ported. First ask /api/describe-look
// for a Claude-written description of the outfit in the photo (falling back to a
// generic string on any failure, exactly like the web), then generate an outfit
// from the user's closet inspired by it. Returns the new outfit id so the caller
// can navigate to the Phase 3 outfit-detail screen.
export function useGetThisLook() {
  return useMutation({
    mutationFn: async (photo: Photo): Promise<string> => {
      let eventDescription = FALLBACK_DESCRIPTION;
      try {
        const described = await apiPost<{ description?: string }>(
          "/api/describe-look",
          { photoId: photo.id, imageUrl: photo.url }
        );
        if (described?.description) eventDescription = described.description;
      } catch (err) {
        console.error("[getThisLook] describe-look failed:", err);
        // keep the fallback description
      }

      const { id } = await apiPost<{ id: string }>("/api/outfits/generate", {
        eventDescription,
        inspirationImageUrl: photo.url,
      });
      return id;
    },
  });
}
