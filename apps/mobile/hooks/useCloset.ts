import { useQuery } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/context/AuthContext";

export interface ClosetThumb {
  id: string;
  signedUrl: string | null;
}

export interface ClosetSummary {
  count: number;
  thumbs: ClosetThumb[];
}

const THUMB_LIMIT = 6;

// Closet size + the most recent item thumbnails (signed for 1h). Mirrors the
// web dashboard's wardrobe preview tile. image_url is a Storage path, so we
// resolve signed URLs for display.
export function useCloset() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["closet", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ClosetSummary> => {
      const { count } = await supabase
        .from("wardrobe_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      const { data: rows } = await supabase
        .from("wardrobe_items")
        .select("id, image_url")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(THUMB_LIMIT);

      let thumbs: ClosetThumb[] = [];
      if (rows?.length) {
        const { data: signed } = await supabase.storage
          .from("wardrobe")
          .createSignedUrls(
            rows.map((r) => r.image_url),
            3600
          );
        const urlByPath = Object.fromEntries(
          (signed ?? []).map((s) => [s.path, s.signedUrl])
        );
        thumbs = rows.map((r) => ({
          id: r.id,
          signedUrl: urlByPath[r.image_url] ?? null,
        }));
      }

      return { count: count ?? 0, thumbs };
    },
  });
}
