import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSaveOutfit } from "~/hooks/useSaveOutfit";

// Floating heart save toggle for the magazine-cover cards — the native port of
// the web SaveButton variant="icon". `saved` is read from the cached outfit
// (the useSaveOutfit mutation patches that cache optimistically), so this is a
// controlled toggle: tapping fires the mutation and the cache flip re-renders
// the icon. Sits in its own Pressable so the tap doesn't bubble to the card.
export function SaveHeart({
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
        save.mutate({ outfitId, saved: !saved });
      }}
      disabled={save.isPending}
      hitSlop={8}
      accessibilityLabel={saved ? "Unsave outfit" : "Save outfit"}
      className={`h-9 w-9 items-center justify-center rounded-full active:opacity-80 ${
        saved ? "bg-[#E84848]" : "bg-white/85"
      }`}
    >
      <Ionicons
        name={saved ? "heart" : "heart-outline"}
        size={18}
        color={saved ? "#FFFFFF" : "#2A3D2E"}
      />
    </Pressable>
  );
}
