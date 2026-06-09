import { useQuery } from "@tanstack/react-query";
import type { StyleProfile } from "@perene/shared";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/context/AuthContext";

// Reads the signed-in user's style profile directly via the Supabase client.
// RLS restricts the row to the owner, so no service role / API route is needed.
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<StyleProfile | null> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
