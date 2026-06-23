import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetThisLook } from "~/hooks/useGetThisLook";
import type { Photo } from "~/lib/inspiration";

// Tap-a-photo detail sheet. Mirrors the web PhotoModal: full image + Unsplash
// credit + a lime "Get this look ✦" CTA that reads the look (describe-look) and
// generates an outfit from the closet, then routes to the outfit-detail screen.
export function InspirationSheet({
  photo,
  onClose,
}: {
  photo: Photo | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const getLook = useGetThisLook();

  function handleGetThisLook() {
    if (!photo || getLook.isPending) return;
    getLook.mutate(photo, {
      onSuccess: (id) => {
        onClose();
        router.push(`/outfits/${id}`);
      },
    });
  }

  return (
    <Modal
      visible={!!photo}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={() => getLook.reset()}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-forest/70 px-5"
      >
        {/* Card — stop propagation so taps inside don't dismiss */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-cream"
        >
          <View className="relative aspect-[3/4] bg-cream">
            {photo ? (
              <Image
                source={{ uri: photo.url }}
                style={{ flex: 1 }}
                contentFit="cover"
                transition={150}
              />
            ) : null}
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-forest/60 active:opacity-80"
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="gap-4 px-6 py-5">
            <View>
              <Text className="text-xs font-sans text-forest/40">
                Photo by{" "}
                <Text
                  className="underline"
                  onPress={() =>
                    photo?.profileUrl && Linking.openURL(photo.profileUrl)
                  }
                >
                  {photo?.credit}
                </Text>{" "}
                on Unsplash
              </Text>
              {photo?.alt ? (
                <Text className="mt-1 text-sm font-sans-medium capitalize leading-snug text-forest">
                  {photo.alt}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={handleGetThisLook}
              disabled={getLook.isPending}
              className={`flex-row items-center justify-center gap-2 rounded-full py-3.5 ${
                getLook.isPending ? "bg-lime/60" : "bg-lime active:opacity-80"
              }`}
            >
              {getLook.isPending ? (
                <>
                  <ActivityIndicator color="#2A3D2E" size="small" />
                  <Text className="text-sm font-sans-bold text-forest">
                    Reading the look…
                  </Text>
                </>
              ) : (
                <Text className="text-sm font-sans-bold text-forest">
                  Get this look ✦
                </Text>
              )}
            </Pressable>

            {getLook.isError ? (
              <Text className="-mt-1 text-center text-xs font-sans text-gold">
                Couldn&apos;t style that look — please try again.
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
