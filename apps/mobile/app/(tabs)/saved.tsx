import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSavedOutfits } from "~/hooks/useSavedOutfits";
import { SavedCard } from "~/components/SavedCard";

function Header({ count }: { count: number | null }) {
  return (
    <View className="mb-5">
      <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-gold">
        Your saved looks
      </Text>
      <Text className="mt-1 font-display text-4xl leading-tight text-forest">Saved Looks</Text>
      <Text className="mt-1.5 text-sm font-sans text-forest/50">
        {count === null
          ? "Loading…"
          : count === 0
            ? "Nothing saved yet"
            : `${count} look${count === 1 ? "" : "s"}`}
      </Text>
    </View>
  );
}

function GridSkeleton() {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className="w-[48%] overflow-hidden rounded-2xl border border-forest/8 bg-white">
          <View className="aspect-[4/3] bg-forest/6" />
          <View className="gap-2 p-3">
            <View className="h-2.5 w-1/2 rounded-full bg-gold/30" />
            <View className="h-3.5 w-3/4 rounded-full bg-forest/8" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <View className="items-center gap-5 py-20">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-forest/6">
        <Ionicons name="heart-outline" size={36} color="rgba(42,61,46,0.25)" />
      </View>
      <View className="items-center gap-2">
        <Text className="font-display text-2xl text-forest">No saved looks yet</Text>
        <Text className="max-w-xs text-center text-sm font-sans leading-relaxed text-forest/50">
          Tap the heart on any outfit to save it here.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/(tabs)")}
        className="rounded-full bg-lime px-6 py-3 active:opacity-80"
      >
        <Text className="text-sm font-sans-bold text-forest">Back to home →</Text>
      </Pressable>
    </View>
  );
}

export default function SavedScreen() {
  const { data, isLoading, isRefetching, refetch } = useSavedOutfits();
  const onRefresh = useCallback(() => refetch(), [refetch]);

  const count = data?.length ?? null;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.outfit.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#2A3D2E" />
        }
        ListHeaderComponent={<Header count={count} />}
        renderItem={({ item }) => <SavedCard item={item} />}
        ListEmptyComponent={isLoading ? <GridSkeleton /> : <EmptyState />}
      />
    </SafeAreaView>
  );
}
