import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useInspiration } from "~/hooks/useInspiration";
import { InspirationSheet } from "~/components/InspirationSheet";
import type { Photo } from "~/lib/inspiration";

function Header() {
  return (
    <View className="mb-4">
      <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
        Discover
      </Text>
      <Text className="mt-1 font-display text-3xl leading-tight text-forest">
        Style inspiration,{" "}
        <Text className="font-display-regular italic text-gold">curated for you.</Text>
      </Text>
    </View>
  );
}

function GridSkeleton() {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} className="aspect-[3/4] w-[48%] rounded-2xl bg-forest/6" />
      ))}
    </View>
  );
}

function PhotoTile({ photo, onPress }: { photo: Photo; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 aspect-[3/4] w-[48%] overflow-hidden rounded-2xl active:opacity-90"
      style={{ backgroundColor: photo.color || "#EDE7D6" }}
    >
      <Image
        source={{ uri: photo.thumb }}
        style={{ flex: 1 }}
        contentFit="cover"
        transition={150}
      />
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const {
    photos,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInspiration();
  const [active, setActive] = useState<Photo | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
        ListHeaderComponent={<Header />}
        renderItem={({ item }) => (
          <PhotoTile photo={item} onPress={() => setActive(item)} />
        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        ListEmptyComponent={
          isLoading ? (
            <GridSkeleton />
          ) : isError ? (
            <View className="items-center gap-3 py-16">
              <Text className="text-sm font-sans text-forest/55">
                Couldn&apos;t load inspiration.
              </Text>
              <Pressable
                onPress={() => refetch()}
                className="rounded-full bg-lime px-5 py-2.5 active:opacity-80"
              >
                <Text className="text-sm font-sans-bold text-forest">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center py-16">
              <Text className="text-sm font-sans text-forest/55">
                No inspiration yet — check back soon.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color="#C4E552" />
            </View>
          ) : photos.length > 0 && hasNextPage ? (
            <Pressable
              onPress={() => fetchNextPage()}
              className="mt-2 items-center py-3"
            >
              <Text className="text-xs font-sans-semibold text-gold underline">
                See more →
              </Text>
            </Pressable>
          ) : null
        }
      />

      <InspirationSheet photo={active} onClose={() => setActive(null)} />
    </SafeAreaView>
  );
}
