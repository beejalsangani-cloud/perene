import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ClosetSummary } from "~/hooks/useCloset";

// "Your Closet" card — thumbnail strip + count, or an empty-state prompt.
// Tapping anywhere routes to the Closet tab.
export function ClosetPreview({
  summary,
  loading,
}: {
  summary?: ClosetSummary;
  loading: boolean;
}) {
  const router = useRouter();
  const count = summary?.count ?? 0;
  const thumbs = summary?.thumbs ?? [];

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/closet")}
      className="gap-4 rounded-2xl border border-forest/10 bg-white p-6 active:opacity-90"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-lg text-forest">Your Closet</Text>
        <Ionicons name="chevron-forward" size={16} color="#C9A87C" />
      </View>

      {loading ? (
        <View className="flex-row gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="h-[60px] w-[60px] rounded-xl bg-forest/6" />
          ))}
        </View>
      ) : count === 0 ? (
        <View className="flex-row items-center gap-3 py-1">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-lime/25">
            <Ionicons name="add" size={22} color="#2A3D2E" />
          </View>
          <Text className="flex-1 text-sm font-sans text-forest/70">
            Your closet is empty —{" "}
            <Text className="font-sans-semibold text-forest">
              add your first piece
            </Text>
            .
          </Text>
        </View>
      ) : (
        <View className="flex-row gap-2">
          {thumbs.map((t) => (
            <View
              key={t.id}
              className="h-[60px] w-[60px] overflow-hidden rounded-xl border border-forest/8 bg-cream"
            >
              {t.signedUrl ? (
                <Image
                  source={{ uri: t.signedUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Text className="text-forest/25">✦</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <Text className="text-xs font-sans text-forest/55">
        {loading
          ? "Loading…"
          : count === 0
            ? "Start building your wardrobe"
            : `${count} item${count === 1 ? "" : "s"} in your closet`}
      </Text>
    </Pressable>
  );
}
