import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLOR_SWATCHES } from "@perene/shared";
import { useWardrobeItems } from "~/hooks/useWardrobeItems";
import { deleteWardrobeItem, type WardrobeItem } from "~/lib/wardrobe";
import { setPendingCapture } from "~/lib/pendingCapture";

const COLOR_HEX: Record<string, string> = Object.fromEntries(
  COLOR_SWATCHES.map(({ id, hex }) => [id, hex])
);

function ItemCard({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: WardrobeItem;
  onEdit: (item: WardrobeItem) => void;
  onDelete: (item: WardrobeItem) => void;
  deleting: boolean;
}) {
  return (
    <Pressable
      onPress={() => onEdit(item)}
      className="flex-1 overflow-hidden rounded-2xl border border-forest/8 bg-white active:opacity-90"
    >
      <View className="aspect-square w-full bg-cream">
        {item.signedUrl ? (
          <Image
            source={{ uri: item.signedUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-3xl text-forest/20">✦</Text>
          </View>
        )}

        {/* Delete */}
        <Pressable
          onPress={() => onDelete(item)}
          disabled={deleting}
          hitSlop={8}
          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-forest/55 active:opacity-70"
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="trash-outline" size={15} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* Tags */}
      <View className="flex-row flex-wrap items-center gap-1.5 px-2.5 py-2.5">
        {item.category ? (
          <View className="rounded-full bg-forest/8 px-2.5 py-0.5">
            <Text className="text-[11px] font-sans-semibold text-forest">
              {item.category}
            </Text>
          </View>
        ) : null}
        {item.color ? (
          <View className="flex-row items-center gap-1 rounded-full bg-forest/5 px-2.5 py-0.5">
            <View
              className="h-2.5 w-2.5 rounded-full border border-black/10"
              style={{ backgroundColor: COLOR_HEX[item.color] ?? "#ccc" }}
            />
            <Text className="text-[11px] font-sans text-forest/70">{item.color}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-24">
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-forest/6">
        <Ionicons name="shirt-outline" size={34} color="rgba(42,61,46,0.3)" />
      </View>
      <Text className="font-display text-2xl text-forest">Your closet is empty</Text>
      <Text className="mt-2 max-w-xs text-center text-sm font-sans leading-relaxed text-forest/50">
        Start building your digital wardrobe. Snap your first piece and Perene
        removes the background and auto-tags it.
      </Text>
      <Pressable
        onPress={onAdd}
        className="mt-8 rounded-full bg-lime px-6 py-3 active:opacity-80"
      >
        <Text className="font-sans-bold text-sm text-forest">
          Add your first piece →
        </Text>
      </Pressable>
    </View>
  );
}

export default function ClosetScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: items, isLoading, isRefetching, refetch } = useWardrobeItems();

  const deleteMutation = useMutation({
    mutationFn: (item: WardrobeItem) => deleteWardrobeItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe-items"] });
      queryClient.invalidateQueries({ queryKey: ["closet"] });
    },
    onError: (err) => {
      Alert.alert(
        "Couldn't delete",
        err instanceof Error ? err.message : "Please try again."
      );
    },
  });

  const openEdit = useCallback(
    (item: WardrobeItem) => {
      setPendingCapture({ mode: "edit", item });
      router.push("/confirm-item");
    },
    [router]
  );

  const confirmDelete = useCallback(
    (item: WardrobeItem) => {
      Alert.alert(
        `Delete this ${item.category ?? "item"}?`,
        "This can't be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMutation.mutate(item),
          },
        ]
      );
    },
    [deleteMutation]
  );

  const count = items?.length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="px-6 pb-3 pt-4">
        <Text className="text-xs font-sans-semibold uppercase tracking-[3px] text-gold">
          Your wardrobe
        </Text>
        <Text className="mt-1.5 font-display text-4xl leading-tight text-forest">
          Your Closet
        </Text>
        <Text className="mt-1 text-sm font-sans text-forest/55">
          {isLoading
            ? "Loading…"
            : count === 0
              ? "No items yet"
              : `${count} item${count === 1 ? "" : "s"}`}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C4E552" />
        </View>
      ) : count === 0 ? (
        <EmptyState onAdd={() => router.push("/camera")} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2A3D2E"
            />
          }
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onEdit={openEdit}
              onDelete={confirmDelete}
              deleting={
                deleteMutation.isPending && deleteMutation.variables?.id === item.id
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
