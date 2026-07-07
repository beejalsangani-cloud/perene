import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSaveOutfit } from "~/hooks/useSaveOutfit";
import { success, tap } from "~/lib/haptics";

// Pill save button for the outfit detail footer — native port of the web
// SaveButton variant="button". Controlled by the cached outfit's is_saved
// (useSaveOutfit patches that cache optimistically), so the label flips
// instantly and reverts if the request fails.
export function SaveButton({
  outfitId,
  saved,
}: {
  outfitId: string;
  saved: boolean;
}) {
  const save = useSaveOutfit();

  return (
    <Pressable
      onPress={() => {
        if (save.isPending) return;
        (saved ? tap : success)();
        save.mutate({ outfitId, saved: !saved });
      }}
      disabled={save.isPending}
      className={`flex-row items-center gap-1.5 rounded-full px-5 py-3 active:opacity-80 ${
        saved ? "bg-[#E84848]" : "border-2 border-forest/15"
      }`}
    >
      <Ionicons
        name={saved ? "heart" : "heart-outline"}
        size={16}
        color={saved ? "#FFFFFF" : "#2A3D2E"}
      />
      <Text
        className={`text-sm font-sans-bold ${saved ? "text-white" : "text-forest/70"}`}
      >
        {saved ? "Saved" : "Save this look"}
      </Text>
    </Pressable>
  );
}
