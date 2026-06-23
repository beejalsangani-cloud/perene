import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type {
  ConfidenceLevel,
  MissingItem as MissingItemType,
  SelectedItem,
  Weather,
} from "@perene/shared";
import { useOutfit, type OutfitWithItem } from "~/hooks/useOutfit";
import { SaveButton } from "~/components/SaveButton";
import { WeatherIcon } from "~/components/WeatherIcon";
import { buildShopUrl } from "~/lib/affiliate";

// ── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const map: Record<ConfidenceLevel, { label: string; bg: string; text: string }> = {
    high: { label: "High confidence", bg: "bg-lime/30", text: "text-forest" },
    medium: { label: "Medium confidence", bg: "bg-gold/20", text: "text-gold" },
    low: { label: "Low confidence", bg: "bg-forest/8", text: "text-forest/55" },
  };
  const { label, bg, text } = map[level] ?? map.medium;
  return (
    <View className={`self-start rounded-full px-3 py-1 ${bg}`}>
      <Text className={`text-[11px] font-sans-semibold ${text}`}>{label}</Text>
    </View>
  );
}

// ── Weather strip ────────────────────────────────────────────────────────────
function WeatherCard({ weather }: { weather: Weather }) {
  return (
    <View className="flex-row items-center gap-4 rounded-2xl bg-forest p-5">
      <WeatherIcon code={weather.weather_code ?? 0} size={40} color="#C4E552" />
      <View className="flex-1">
        <Text className="font-display text-3xl text-cream">
          {weather.temperature_high}°
        </Text>
        <Text className="text-sm font-sans-medium text-cream">{weather.condition}</Text>
        <Text className="mt-0.5 text-xs font-sans text-cream/50">
          {weather.location} · H {weather.temperature_high}° / L {weather.temperature_low}°
          {weather.precipitation_chance > 0 ? ` · Rain ${weather.precipitation_chance}%` : ""}
        </Text>
      </View>
    </View>
  );
}

// ── Owned item card ──────────────────────────────────────────────────────────
function ItemCard({
  item,
  role,
  stylingNote,
}: {
  item: OutfitWithItem | null;
  role: string;
  stylingNote?: string;
}) {
  return (
    <View className="w-[48%] overflow-hidden rounded-2xl border border-forest/8 bg-white">
      <View className="aspect-square bg-cream">
        {item?.signedUrl ? (
          <Image
            source={{ uri: item.signedUrl }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-3xl text-forest/20">✦</Text>
          </View>
        )}
        <View className="absolute left-2 top-2 rounded-full bg-forest/70 px-2.5 py-0.5">
          <Text className="text-[10px] font-sans-semibold capitalize text-white">{role}</Text>
        </View>
      </View>
      <View className="gap-1 px-3 py-3">
        {item?.category ? (
          <Text className="text-xs font-sans-semibold text-forest">{item.category}</Text>
        ) : null}
        {stylingNote ? (
          <Text className="text-[11px] font-sans leading-relaxed text-forest/55">
            {stylingNote}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Missing item (with "Shop the look" expander) ─────────────────────────────
function MissingItem({ item }: { item: MissingItemType }) {
  const [expanded, setExpanded] = useState(false);

  const shopLinks = (item.retailers ?? [])
    .map((r) => ({ name: r.name, url: buildShopUrl({ retailer: r.name, query: r.search_query }) }))
    .filter((r): r is { name: string; url: string } => !!r.url);

  return (
    <View className="gap-2 border-b border-forest/6 py-4">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-sm font-sans-semibold text-forest">{item.item}</Text>
        {item.category ? (
          <View className="rounded-full bg-forest/6 px-2 py-0.5">
            <Text className="text-[10px] font-sans-semibold text-forest/60">{item.category}</Text>
          </View>
        ) : null}
        {item.price_range ? (
          <Text className="text-[11px] font-sans-medium text-gold">{item.price_range}</Text>
        ) : null}
      </View>
      {item.why ? (
        <Text className="text-xs font-sans leading-relaxed text-forest/50">{item.why}</Text>
      ) : null}

      {shopLinks.length > 0 ? (
        <View className="mt-1 gap-2">
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            className="flex-row items-center gap-1.5 self-start rounded-full bg-lime px-5 py-2.5 active:opacity-80"
          >
            <Text className="text-sm font-sans-bold text-forest">Shop the look</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#2A3D2E" />
          </Pressable>

          {expanded ? (
            <View className="gap-1.5">
              {shopLinks.map((r) => (
                <Pressable
                  key={r.name}
                  onPress={() => Linking.openURL(r.url)}
                  className="flex-row items-center justify-between rounded-lg border border-forest/10 bg-white px-3 py-2.5 active:opacity-70"
                >
                  <Text className="text-xs font-sans-medium text-forest">{r.name}</Text>
                  <Ionicons name="open-outline" size={14} color="#C9A87C" />
                </Pressable>
              ))}
              <Text className="mt-1 text-[11px] font-sans text-forest/55">
                Browse similar items at these retailers — exact matches not guaranteed.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useOutfit(id);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  const Header = (
    <View className="flex-row items-center justify-between px-6 pb-2 pt-2">
      <Pressable
        onPress={goBack}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full bg-forest/8 active:opacity-70"
      >
        <Ionicons name="chevron-back" size={20} color="#2A3D2E" />
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C4E552" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        {Header}
        <View className="flex-1 items-center justify-center gap-4 px-10">
          <Text className="text-center text-sm font-sans text-forest/55">
            Outfit not found.
          </Text>
          <Pressable
            onPress={goBack}
            className="rounded-full bg-lime px-6 py-3 active:opacity-80"
          >
            <Text className="text-sm font-sans-bold text-forest">Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { outfit, items } = data;
  const generated = outfit.generated_outfit;
  const selectedItems: SelectedItem[] = generated?.selected_items ?? [];
  const missingItems = outfit.missing_items ?? [];
  const confidence: ConfidenceLevel =
    generated?.confidence_level ?? outfit.confidence ?? "medium";
  const weather = outfit.weather;

  async function onShare() {
    const vibe = generated?.overall_vibe;
    const lines = [
      outfit.event_description,
      vibe ? `“${vibe}”` : null,
      "Styled by Perene ✦",
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // user dismissed the sheet — no-op
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {Header}
      <ScrollView contentContainerClassName="px-6 pb-12 gap-6">
        {/* Title block */}
        <View className="gap-3">
          <View className="flex-row items-center gap-3">
            <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-gold">
              Your outfit
            </Text>
            <ConfidenceBadge level={confidence} />
          </View>
          <Text className="font-display text-3xl leading-tight text-forest">
            {outfit.event_description}
          </Text>
          {generated?.overall_vibe ? (
            <Text className="font-display-regular text-base italic text-forest/55">
              “{generated.overall_vibe}”
            </Text>
          ) : null}
        </View>

        {/* Weather */}
        {weather ? <WeatherCard weather={weather} /> : null}

        {/* Your look */}
        <View className="gap-3">
          <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
            Your look
          </Text>
          {selectedItems.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border-2 border-dashed border-forest/12 p-8">
              <Text className="text-center text-sm font-sans text-forest/45">
                No wardrobe items were selected — your closet may be empty.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {selectedItems.map((s) => (
                <ItemCard
                  key={s.item_id}
                  item={items[s.item_id] ?? null}
                  role={s.role ?? "piece"}
                  stylingNote={s.styling_note}
                />
              ))}
            </View>
          )}
        </View>

        {/* Why this works */}
        {generated?.styling_reasoning ? (
          <View className="gap-2 rounded-2xl border border-forest/8 bg-white p-5">
            <Text className="font-display text-lg text-forest">Why this works</Text>
            <Text className="text-sm font-sans leading-relaxed text-forest/65">
              {generated.styling_reasoning}
            </Text>
          </View>
        ) : null}

        {/* What you're missing */}
        {missingItems.length > 0 ? (
          <View className="rounded-2xl border border-forest/8 bg-white p-5">
            <Text className="font-display text-lg text-forest">What you&apos;re missing</Text>
            <Text className="mt-1 mb-2 text-xs font-sans text-forest/45">
              Pieces that would elevate this look.
            </Text>
            <View>
              {missingItems.map((m, i) => (
                <MissingItem key={i} item={m} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Footer actions */}
        <View className="mt-2 flex-row items-center gap-3">
          <SaveButton outfitId={outfit.id} saved={!!outfit.is_saved} />
          <Pressable
            onPress={onShare}
            className="flex-row items-center gap-1.5 rounded-full border-2 border-forest/15 px-5 py-3 active:opacity-70"
          >
            <Ionicons name="share-outline" size={16} color="#2A3D2E" />
            <Text className="text-sm font-sans-bold text-forest/70">Share</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
