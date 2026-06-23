import { Alert, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { SavedOutfit } from "~/hooks/useSavedOutfits";
import { useSaveOutfit } from "~/hooks/useSaveOutfit";

function formatSavedDate(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Saved today";
  if (days === 1) return "Saved yesterday";
  if (days < 7) return `Saved ${days} days ago`;
  if (days < 30) return `Saved ${Math.floor(days / 7)}w ago`;
  return `Saved ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// Collage of up to 4 item thumbnails — same 1/2/3+ layouts as the dashboard
// cards, in a 4:3 frame to match the web Saved grid.
function Collage({ urls }: { urls: string[] }) {
  const safe = urls.filter(Boolean);
  if (safe.length === 0) {
    return (
      <View className="aspect-[4/3] items-center justify-center bg-cream">
        <Text className="text-3xl text-forest/20">✦</Text>
      </View>
    );
  }
  if (safe.length === 1) {
    return (
      <View className="aspect-[4/3] overflow-hidden bg-cream">
        <Image source={{ uri: safe[0] }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      </View>
    );
  }
  if (safe.length === 2) {
    return (
      <View className="aspect-[4/3] flex-row gap-px bg-cream">
        {safe.map((u, i) => (
          <View key={i} className="flex-1 overflow-hidden bg-cream">
            <Image source={{ uri: u }} style={{ flex: 1 }} contentFit="cover" transition={150} />
          </View>
        ))}
      </View>
    );
  }
  const right = safe.slice(1, 4);
  return (
    <View className="aspect-[4/3] flex-row gap-px bg-cream">
      <View className="flex-[2] overflow-hidden bg-cream">
        <Image source={{ uri: safe[0] }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      </View>
      <View className="flex-1 gap-px">
        {right.map((u, i) => (
          <View key={i} className="flex-1 overflow-hidden bg-cream">
            <Image source={{ uri: u }} style={{ flex: 1 }} contentFit="cover" transition={150} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Saved-look card. Tap → outfit detail; long-press → confirm → unsave (which
// optimistically removes it from the grid via useSaveOutfit).
export function SavedCard({ item }: { item: SavedOutfit }) {
  const router = useRouter();
  const save = useSaveOutfit();
  const { outfit, slotLabel, collageUrls, savedAt } = item;
  const event = outfit.event_description?.trim();

  function confirmUnsave() {
    Alert.alert("Remove from Saved Looks?", "This look will no longer appear here.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => save.mutate({ outfitId: outfit.id, saved: false }),
      },
    ]);
  }

  return (
    <Pressable
      onPress={() => router.push(`/outfits/${outfit.id}`)}
      onLongPress={confirmUnsave}
      delayLongPress={350}
      className="w-[48%] overflow-hidden rounded-2xl border border-forest/8 bg-white active:opacity-95"
    >
      <Collage urls={collageUrls} />
      <View className="gap-1.5 px-3 py-3">
        <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-gold">
          {slotLabel}
        </Text>
        {event ? (
          <Text numberOfLines={2} className="font-display text-sm leading-snug text-forest">
            {event}
          </Text>
        ) : null}
        <Text className="text-[11px] font-sans text-forest/45">{formatSavedDate(savedAt)}</Text>
      </View>
    </Pressable>
  );
}
