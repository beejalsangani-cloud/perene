import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StyleProfile } from "@perene/shared";
import { apiPost } from "~/lib/api";

// The quiz-answer subset the profile editor persists. Mirrors the web
// /api/profile contract — POST { answers } upserts user_profiles.
export interface ProfileAnswers {
  gender: string | null;
  age_range: string | null;
  body_type: string | null;
  style_descriptors: string[];
  lifestyle: string[];
  typical_events: string[];
  budget_range: string | null;
  color_preferences: string[];
}

// Persist the editable style profile. Same route the web quiz uses; on success
// invalidate the cached profile so the dashboard + Discover feed pick up edits.
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answers: ProfileAnswers) =>
      apiPost<{ ok: true }>("/api/profile", { answers }),
    onSuccess: (_data, answers) => {
      // Seed the profile cache (keyed ["profile", userId]) with the saved values
      // so the UI reflects them immediately, then revalidate from the source.
      queryClient.setQueriesData<StyleProfile | null>(
        { queryKey: ["profile"] },
        (cur) => (cur ? { ...cur, ...answers } : cur)
      );
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
