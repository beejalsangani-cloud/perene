import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, SEASONS, COLOR_SWATCHES } from "@perene/shared";
import { useAuth } from "~/context/AuthContext";
import {
  compressForUpload,
  processImage,
  saveWardrobeItem,
  type CompressedImage,
  type WardrobeItem,
} from "~/lib/wardrobe";
import { takePendingCapture } from "~/lib/pendingCapture";

type Phase = "processing" | "ready" | "saving";
type AiFields = { category: boolean; color: boolean; season: boolean };

function AiBadge() {
  return (
    <View className="rounded-full bg-lime/35 px-2 py-0.5">
      <Text className="text-[10px] font-sans-bold text-forest">✦ AI</Text>
    </View>
  );
}

export default function ConfirmItemScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Read-and-clear the hand-off exactly once (StrictMode-safe via ref).
  const pendingRef = useRef(takePendingCapture());
  const pending = pendingRef.current;
  const editItem: WardrobeItem | null =
    pending?.mode === "edit" ? pending.item : null;

  const [phase, setPhase] = useState<Phase>(
    pending?.mode === "edit" ? "ready" : "processing"
  );
  const [previewUri, setPreviewUri] = useState<string | null>(
    editItem?.signedUrl ?? null
  );
  // The image bytes to upload on save; null on a metadata-only edit.
  const [uploadImage, setUploadImage] = useState<CompressedImage | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState<string | null>(null);

  const [category, setCategory] = useState(editItem?.category ?? "");
  const [color, setColor] = useState(editItem?.color ?? "");
  const [season, setSeason] = useState<string[]>(editItem?.season ?? []);
  const [notes, setNotes] = useState(editItem?.notes ?? "");
  const [aiFields, setAiFields] = useState<AiFields>({
    category: false,
    color: false,
    season: false,
  });
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => router.back(), [router]);

  // ── Run the pipeline for a fresh capture ───────────────────────────────────
  useEffect(() => {
    if (pending?.mode !== "create") return;
    let cancelled = false;

    (async () => {
      // 1. Compress the local photo for the API call.
      let compressed: CompressedImage;
      try {
        compressed = await compressForUpload(pending.uri, pending.width);
      } catch (err) {
        console.error("[confirm] compress error:", err);
        if (cancelled) return;
        setWarnings(["Could not read that photo — please try again."]);
        setPhase("ready");
        return;
      }
      if (cancelled) return;
      // Original compressed photo is the fallback to upload if processing fails.
      setUploadImage(compressed);

      // 2. Server pipeline: background removal + Claude vision tagging.
      const result = await processImage(compressed);
      if (cancelled) return;

      if (!result.ok) {
        if (result.dailyLimit) {
          setDailyLimit(result.message);
        } else {
          setWarnings([result.message]);
        }
        setPhase("ready");
        return;
      }

      // Prefer the background-removed PNG for both preview and upload.
      setUploadImage(result.processedImage);
      setBgRemoved(result.bgRemoved);
      setPreviewUri(
        `data:${result.processedImage.mediaType};base64,${result.processedImage.base64}`
      );

      const seeded: AiFields = { category: false, color: false, season: false };
      if (result.metadata.category) {
        setCategory(result.metadata.category);
        seeded.category = true;
      }
      if (result.metadata.color) {
        setColor(result.metadata.color);
        seeded.color = true;
      }
      if (result.metadata.seasons.length) {
        setSeason(result.metadata.seasons);
        seeded.season = true;
      }
      setAiFields(seeded);
      setWarnings(result.warnings);
      setPhase("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [pending]);

  // ── Field handlers (clear the AI badge on manual edit) ─────────────────────
  function pickCategory(c: string) {
    setCategory(c);
    setAiFields((p) => ({ ...p, category: false }));
  }
  function pickColor(c: string) {
    setColor(c);
    setAiFields((p) => ({ ...p, color: false }));
  }
  function toggleSeason(s: string) {
    setSeason((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setAiFields((p) => ({ ...p, season: false }));
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    if (!editItem && !uploadImage) {
      setError("No photo to save — please take a photo first.");
      return;
    }
    setPhase("saving");
    setError(null);
    try {
      await saveWardrobeItem({
        userId: user.id,
        image: editItem ? null : uploadImage,
        category,
        color,
        season,
        notes,
        editItem,
      });
      await queryClient.invalidateQueries({ queryKey: ["wardrobe-items"] });
      await queryClient.invalidateQueries({ queryKey: ["closet"] });
      close();
    } catch (err) {
      console.error("[confirm] save error:", err);
      setError(err instanceof Error ? err.message : "Could not save.");
      setPhase("ready");
    }
  }

  // No hand-off (e.g. opened directly) — nothing to confirm.
  if (!pending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream px-10">
        <Text className="text-center font-sans text-forest/60">
          Nothing to add. Tap the + button to photograph a piece.
        </Text>
        <Pressable
          onPress={close}
          className="mt-6 rounded-full bg-lime px-6 py-3 active:opacity-80"
        >
          <Text className="font-sans-bold text-sm text-forest">Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const processing = phase === "processing";
  const saving = phase === "saving";

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-forest/8 px-6 pb-4 pt-2">
        <Text className="font-display text-2xl text-forest">
          {editItem ? "Edit item" : "Add to closet"}
        </Text>
        <Pressable
          onPress={close}
          className="h-9 w-9 items-center justify-center rounded-full bg-forest/8 active:opacity-70"
        >
          <Ionicons name="close" size={18} color="#2A3D2E" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-6 py-5 gap-6" keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View className="aspect-square w-full overflow-hidden rounded-2xl border border-forest/10 bg-white">
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-4xl text-forest/20">✦</Text>
            </View>
          )}

          {processing && (
            <View className="absolute inset-0 items-center justify-center gap-3 bg-forest/55 px-6">
              <ActivityIndicator color="#C4E552" />
              <Text className="text-center text-xs font-sans-semibold text-white">
                Removing background and detecting details…
              </Text>
            </View>
          )}

          {!processing && bgRemoved && (
            <View className="absolute left-3 top-3 rounded-full bg-forest/85 px-3 py-1">
              <Text className="text-[10px] font-sans-bold text-lime">
                ✦ Background removed
              </Text>
            </View>
          )}
        </View>

        {/* Daily-limit block */}
        {dailyLimit && (
          <View className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
            <Text className="text-sm font-sans-medium leading-relaxed text-forest/80">
              {dailyLimit}
            </Text>
          </View>
        )}

        {/* Warnings */}
        {!processing &&
          warnings.map((w, i) => (
            <Text key={i} className="-mt-3 text-xs font-sans leading-snug text-gold">
              ✦ {w}
            </Text>
          ))}

        {/* Category */}
        <View>
          <View className="mb-2 flex-row items-center gap-2">
            <Text className="text-xs font-sans-semibold uppercase tracking-widest text-forest/55">
              Category
            </Text>
            {aiFields.category && <AiBadge />}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => pickCategory(c)}
                  className={`rounded-full border px-3.5 py-1.5 ${
                    active
                      ? "border-forest bg-forest"
                      : "border-forest/15 active:border-forest/35"
                  }`}
                >
                  <Text
                    className={`text-xs font-sans-semibold ${
                      active ? "text-cream" : "text-forest/65"
                    }`}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Colour */}
        <View>
          <View className="mb-2 flex-row items-center gap-2">
            <Text className="text-xs font-sans-semibold uppercase tracking-widest text-forest/55">
              Primary colour
            </Text>
            {aiFields.color && <AiBadge />}
          </View>
          <View className="flex-row flex-wrap items-center gap-2.5">
            {COLOR_SWATCHES.map(({ id, hex }) => {
              const active = color === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => pickColor(id)}
                  style={{ backgroundColor: hex }}
                  className={`h-8 w-8 rounded-full border-2 ${
                    active ? "border-forest" : "border-transparent"
                  }`}
                />
              );
            })}
          </View>
          {color ? (
            <Text className="mt-2 text-xs font-sans text-forest/50">
              Selected: <Text className="font-sans-medium text-forest/80">{color}</Text>
            </Text>
          ) : null}
        </View>

        {/* Season */}
        <View>
          <View className="mb-2 flex-row items-center gap-2">
            <Text className="text-xs font-sans-semibold uppercase tracking-widest text-forest/55">
              Season
            </Text>
            {aiFields.season && <AiBadge />}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {SEASONS.map((s) => {
              const active = season.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggleSeason(s)}
                  className={`rounded-full border px-3.5 py-1.5 ${
                    active
                      ? "border-lime bg-lime"
                      : "border-forest/15 active:border-forest/35"
                  }`}
                >
                  <Text className="text-xs font-sans-semibold text-forest/80">
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View>
          <Text className="mb-2 text-xs font-sans-semibold uppercase tracking-widest text-forest/55">
            Notes <Text className="font-sans normal-case tracking-normal text-forest/35">(optional)</Text>
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Runs small, dry clean only…"
            placeholderTextColor="rgba(42,61,46,0.3)"
            multiline
            className="min-h-[64px] rounded-xl border-2 border-forest/12 bg-white px-4 py-3 text-sm font-sans text-forest"
            textAlignVertical="top"
          />
        </View>

        {error && (
          <View className="flex-row items-center gap-2 rounded-xl border border-forest/12 bg-white px-4 py-3">
            <Text>⚠</Text>
            <Text className="flex-1 text-sm font-sans-medium text-forest">{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View className="flex-row gap-3 border-t border-forest/8 px-6 pb-2 pt-3">
        <Pressable
          onPress={close}
          className="flex-1 items-center rounded-xl border-2 border-forest/15 py-3.5 active:opacity-70"
        >
          <Text className="text-sm font-sans-semibold text-forest/65">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={processing || saving || !!dailyLimit}
          className={`flex-1 items-center rounded-xl py-3.5 ${
            processing || saving || dailyLimit ? "bg-lime/50" : "bg-lime active:opacity-80"
          }`}
        >
          <Text className="text-sm font-sans-bold text-forest">
            {saving
              ? "Saving…"
              : processing
                ? "Processing…"
                : editItem
                  ? "Save changes"
                  : "Add to closet"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
