import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "~/hooks/useProfile";
import { useGenerateOutfit } from "~/hooks/useGenerateOutfit";

const QUOTES = [
  "Consulting your wardrobe…",
  "Checking the forecast…",
  "Studying your style DNA…",
  "Pairing colours with intention…",
  "Curating the perfect silhouette…",
  "Layering textures just so…",
  "Finalising your look…",
];

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const DATE_CHIPS: { label: string; value: string | null }[] = [
  { label: "No specific date", value: null },
  { label: "Today", value: isoDateOffset(0) },
  { label: "Tomorrow", value: isoDateOffset(1) },
  { label: "This weekend", value: isoDateOffset((6 - new Date().getDay() + 7) % 7 || 6) },
];

function LoadingOverlay() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <View className="absolute inset-0 z-50 items-center justify-center gap-6 bg-cream/95">
      <View className="h-14 w-14 rounded-full border-2 border-forest/10 border-t-lime" />
      <Text className="text-sm font-sans-medium text-forest/60">
        {QUOTES[idx]}
      </Text>
    </View>
  );
}

export default function NewOutfitScreen() {
  const router = useRouter();
  const textInputRef = useRef<TextInput>(null);
  const profileQuery = useProfile();
  const generateOutfit = useGenerateOutfit();

  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Pre-fill location from saved default, same as web.
  useEffect(() => {
    const defaultCity = profileQuery.data?.default_location?.city;
    if (defaultCity) setLocation((prev) => prev || defaultCity);
  }, [profileQuery.data]);

  useEffect(() => {
    const t = setTimeout(() => textInputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  async function handleGenerate() {
    if (!eventDescription.trim()) {
      setError("Tell us what you're dressing for.");
      return;
    }
    setError("");
    try {
      const id = await generateOutfit.mutateAsync({
        eventDescription,
        location: location || undefined,
        date: selectedDate || undefined,
      });
      router.replace(`/outfits/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  }

  const generating = generateOutfit.isPending;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      {generating && <LoadingOverlay />}

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-full bg-forest/5 active:opacity-70"
        >
          <Ionicons name="close" size={20} color="#2A3D2E" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-10 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View>
          <Text className="text-xs font-sans-semibold uppercase tracking-[3px] text-gold">
            AI Stylist
          </Text>
          <Text className="mt-2 font-display text-4xl leading-tight text-forest">
            What are you{"\n"}
            <Text className="font-display-italic text-gold">
              dressing for?
            </Text>
          </Text>
          <Text className="mt-2 text-base font-sans text-forest/55">
            Describe the occasion and Perene will build the best outfit from
            your closet.
          </Text>
        </View>

        {/* Occasion */}
        <View>
          <Text className="mb-2 text-xs font-sans-semibold uppercase tracking-widest text-forest/50">
            Occasion
          </Text>
          <TextInput
            ref={textInputRef}
            value={eventDescription}
            onChangeText={setEventDescription}
            multiline
            numberOfLines={4}
            placeholder="e.g. First date at a rooftop bar on a warm Friday evening…"
            placeholderTextColor="#2A3D2E4D"
            textAlignVertical="top"
            className="min-h-[110px] rounded-2xl border-2 border-forest/12 bg-white px-5 py-4 text-sm leading-relaxed text-forest"
          />
        </View>

        {/* Location */}
        <View>
          <Text className="mb-2 text-xs font-sans-semibold uppercase tracking-widest text-forest/50">
            Location <Text className="font-sans text-forest/35">(optional)</Text>
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Miami, FL"
            placeholderTextColor="#2A3D2E4D"
            className="rounded-xl border-2 border-forest/12 bg-white px-4 py-3 text-sm text-forest"
          />
        </View>

        {/* Date chips */}
        <View>
          <Text className="mb-2 text-xs font-sans-semibold uppercase tracking-widest text-forest/50">
            Date{" "}
            <Text className="font-sans text-forest/35">
              (optional · enables weather)
            </Text>
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DATE_CHIPS.map((chip) => {
              const active = selectedDate === chip.value;
              return (
                <Pressable
                  key={chip.label}
                  onPress={() => setSelectedDate(chip.value)}
                  className={`rounded-full border-2 px-4 py-2 active:opacity-70 ${
                    active
                      ? "border-lime bg-lime/25"
                      : "border-forest/12 bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-sans-semibold ${
                      active ? "text-forest" : "text-forest/60"
                    }`}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {location && !selectedDate && (
            <Text className="mt-2 text-xs text-gold/80">
              Pick a date to pull live weather for {location}.
            </Text>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View className="flex-row items-center gap-2 rounded-xl border border-forest/12 bg-white px-4 py-3">
            <Text className="text-sm">⚠</Text>
            <Text className="flex-1 text-sm font-sans-medium text-forest">
              {error}
            </Text>
          </View>
        ) : null}

        {/* Generate button */}
        <Pressable
          onPress={handleGenerate}
          disabled={generating || !eventDescription.trim()}
          className="items-center self-start rounded-full bg-lime px-8 py-4 active:scale-[0.98] disabled:opacity-40"
        >
          <Text className="text-sm font-sans-bold tracking-wide text-forest">
            Generate my outfit ✦
          </Text>
        </Pressable>

        <Text className="text-xs leading-relaxed text-forest/35">
          Tip: the more items you add to your closet, the more accurate your
          outfits will be.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
