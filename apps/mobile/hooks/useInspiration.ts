import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "~/context/AuthContext";
import { useProfile } from "~/hooks/useProfile";
import {
  fetchInspirationPage,
  inspirationSignature,
  type Photo,
} from "~/lib/inspiration";

// Personalized Discover feed, paginated. Mirrors the web InspirationFeed: each
// page fans out per-occasion Unsplash queries built from the profile. Keyed by
// the profile signature so editing the style profile refreshes the feed.
export function useInspiration() {
  const { user } = useAuth();
  const profile = useProfile().data;
  const signature = inspirationSignature(profile);

  const query = useInfiniteQuery({
    queryKey: ["inspiration", user?.id, signature],
    enabled: !!user,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchInspirationPage(profile, pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length > 0 ? allPages.length + 1 : undefined,
    staleTime: 5 * 60_000, // inspiration doesn't change minute-to-minute
  });

  // Flatten pages and dedupe by id (the same photo can surface across pages).
  const seen = new Set<string>();
  const photos: Photo[] = [];
  for (const page of query.data?.pages ?? []) {
    for (const p of page) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        photos.push(p);
      }
    }
  }

  return { ...query, photos };
}
