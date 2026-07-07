// Permanently delete the signed-in user's account. Calls DELETE /api/account/
// delete (which clears wardrobe storage and cascades every user-scoped table via
// admin.deleteUser), then tears down the local session. The API call must happen
// while the access token is still valid, so we delete first, then sign out.
import { useMutation } from "@tanstack/react-query";
import { apiDelete } from "~/lib/api";
import { supabase } from "~/lib/supabase";

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await apiDelete<{ ok: true }>("/api/account/delete");
      // Local cleanup — the remote user is already gone, so this just clears the
      // persisted session and flips the app back to the auth stack.
      await supabase.auth.signOut();
    },
  });
}
