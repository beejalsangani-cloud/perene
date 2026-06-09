import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { setPendingCapture } from "~/lib/pendingCapture";

// The hero capture screen. Reached from the lime "+" FAB. Camera permission is
// requested here (only once the user has chosen to add a piece), with a brand
// explainer + Settings fallback if it's been denied.
export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [busy, setBusy] = useState(false);

  const close = () => router.back();

  function goToConfirm(uri: string, width?: number) {
    setPendingCapture({ mode: "create", uri, width });
    router.replace("/confirm-item");
  }

  async function takePhoto() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) goToConfirm(photo.uri, photo.width);
    } catch (err) {
      console.error("[camera] capture error:", err);
      setBusy(false);
    }
  }

  async function pickFromLibrary() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        goToConfirm(result.assets[0].uri, result.assets[0].width);
        return;
      }
    } catch (err) {
      console.error("[camera] library error:", err);
    }
    setBusy(false);
  }

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-forest">
        <ActivityIndicator color="#C4E552" />
      </View>
    );
  }

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <View className="flex-row justify-end px-5 pt-2">
          <Pressable
            onPress={close}
            className="h-10 w-10 items-center justify-center rounded-full bg-forest/8 active:opacity-70"
          >
            <Ionicons name="close" size={20} color="#2A3D2E" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-lime/25">
            <Ionicons name="camera-outline" size={30} color="#2A3D2E" />
          </View>
          <Text className="text-center font-display text-3xl text-forest">
            Camera access
          </Text>
          <Text className="mt-3 text-center text-sm font-sans leading-relaxed text-forest/60">
            Perene uses your camera to photograph clothing, then removes the
            background and auto-tags each piece for your closet.
          </Text>

          <Pressable
            onPress={() => (blocked ? Linking.openSettings() : requestPermission())}
            className="mt-8 w-full items-center rounded-full bg-lime py-4 active:opacity-80"
          >
            <Text className="font-sans-bold text-sm text-forest">
              {blocked ? "Open Settings" : "Enable camera"}
            </Text>
          </Pressable>

          <Pressable
            onPress={pickFromLibrary}
            className="mt-3 w-full items-center rounded-full border-2 border-forest/15 py-4 active:opacity-70"
          >
            <Text className="font-sans-semibold text-sm text-forest/65">
              Choose from library instead
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Live camera ────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />

      {/* Top controls */}
      <SafeAreaView
        edges={["top"]}
        className="absolute left-0 right-0 top-0"
        pointerEvents="box-none"
      >
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable
            onPress={close}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/40 active:opacity-70"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/40 active:opacity-70"
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Hint */}
      <View className="absolute left-0 right-0 top-1/2 items-center" pointerEvents="none">
        <Text className="rounded-full bg-black/35 px-4 py-1.5 text-xs font-sans-medium text-white/90">
          Center the garment in frame
        </Text>
      </View>

      {/* Bottom controls */}
      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0"
        pointerEvents="box-none"
      >
        <View className="flex-row items-center justify-between px-10 pb-6 pt-4">
          {/* Library */}
          <Pressable
            onPress={pickFromLibrary}
            disabled={busy}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-black/40 active:opacity-70"
          >
            <Ionicons name="images-outline" size={24} color="#fff" />
          </Pressable>

          {/* Shutter */}
          <Pressable
            onPress={takePhoto}
            disabled={busy}
            className="h-[78px] w-[78px] items-center justify-center rounded-full border-4 border-white/90 active:opacity-80"
          >
            {busy ? (
              <ActivityIndicator color="#C4E552" />
            ) : (
              <View className="h-[60px] w-[60px] rounded-full bg-lime" />
            )}
          </Pressable>

          {/* Spacer to balance the shutter */}
          <View className="h-12 w-12" />
        </View>
      </SafeAreaView>
    </View>
  );
}
