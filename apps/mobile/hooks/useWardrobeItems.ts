import { useQuery } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/context/AuthContext";
import type { WardrobeItem } from "~/lib/wardrobe";

// Full wardrobe list for the Closet grid, each row enriched with a 1h signed URL
// (image_url is a Storage path). Mirrors apps/web/app/wardrobe/page.js's
// loadItems. The dashboard's lighter 6-thumb preview stays in useCloset.
export function useWardrobeItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wardrobe-items", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WardrobeItem[]> => {
      const { data: rows, error } = await supabase
        .from("wardrobe_items")
        .select("id, image_url, category, color, season, notes, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!rows?.length) return [];

      const { data: signed } = await supabase.storage
        .from("wardrobe")
        .createSignedUrls(
          rows.map((r) => r.image_url),
          3600
        );
      const urlByPath = Object.fromEntries(
        (signed ?? []).map((s) => [s.path, s.signedUrl])
      );

      return rows.map((r) => ({
        ...r,
        signedUrl: urlByPath[r.image_url] ?? null,
      })) as WardrobeItem[];
    },
  });
}
