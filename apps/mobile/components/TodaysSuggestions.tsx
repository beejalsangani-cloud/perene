import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { DailyOutfitSlot } from "@perene/shared";
import { useDailyOutfits } from "~/hooks/useDailyOutfits";
import { SaveHeart } from "~/components/SaveHeart";

// Today's Suggestions — Daytime + Evening daily looks on the mobile dashboard.
// Native mirror of the web's apps/web/app/components/TodaysOutfits.js: image-
// first magazine-cover cards (4:5 hero, forest gradient, lime label + Playfair
// vibe + "See full look" CTA), a heart save toggle, and the same fallbacks for
// an empty closet and slots with too few pieces to style.

const SectionHeader = () => (
  <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
    Today&apos;s suggestions
  </Text>
);

// ── Collage ──────────────────────────────────────────────────────────────────
// One tall hero (or asymmetric grid for 2 / 3+ items), 4:5 portrait — same
// layouts as the web Collage so a card reads like an editorial cover.
function Collage({ urls }: { urls: string[] }) {
  const safe = urls.filter(Boolean);

  if (safe.length === 0) {
    return (
      <View className="aspect-[4/5] items-center justify-center bg-cream">
        <Text className="text-4xl text-forest/20">✦</Text>
      </View>
    );
  }
  if (safe.length === 1) {
    return (
      <View className="aspect-[4/5] overflow-hidden bg-cream">
        <Image source={{ uri: safe[0] }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      </View>
    );
  }
  if (safe.length === 2) {
    return (
      <View className="aspect-[4/5] flex-row gap-px bg-cream">
        {safe.map((u, i) => (
          <View key={i} className="flex-1 overflow-hidden bg-cream">
            <Image source={{ uri: u }} style={{ flex: 1 }} contentFit="cover" transition={150} />
          </View>
        ))}
      </View>
    );
  }
  // 3+ — big hero on the left, up to three stacked on the right
  const right = safe.slice(1, 4);
  return (
    <View className="aspect-[4/5] flex-row gap-px bg-cream">
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

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SlotSkeleton() {
  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-forest/10 bg-white">
      <View className="aspect-[4/5] bg-forest/6" />
    </View>
  );
}

// ── Slot card ────────────────────────────────────────────────────────────────
function SlotCard({
  label,
  slot,
  signedItemUrls,
}: {
  label: string;
  slot: DailyOutfitSlot | null;
  signedItemUrls: Record<string, string | null>;
}) {
  const router = useRouter();

  // Generation failed / not yet ready — mirror the web (perpetual skeleton).
  if (!slot) return <SlotSkeleton />;

  const outfit = slot.outfit;
  const selectedItems = outfit?.generated_outfit?.selected_items ?? [];

  // Insufficient-items-for-slot fallback: AI returned < 3 selected items. Same
  // magazine shape, gradient fills the image area, CTAs overlay the bottom.
  if (selectedItems.length < 3) {
    return (
      <View className="flex-1 overflow-hidden rounded-2xl border border-forest/10">
        <LinearGradient
          colors={["#EDE7D6", "rgba(201,168,124,0.30)", "rgba(42,61,46,0.18)"]}
          className="aspect-[4/5] items-center justify-center"
        >
          <Text className="text-5xl text-gold/50">✦</Text>
        </LinearGradient>
        <View className="absolute inset-x-0 bottom-0 gap-2.5 px-4 pb-4 pt-12">
          <LinearGradient
            colors={["transparent", "rgba(42,61,46,0.55)", "rgba(42,61,46,0.88)"]}
            locations={[0, 0.5, 1]}
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <Text className="text-[10px] font-sans-bold uppercase tracking-[2px] text-lime">
            {label}
          </Text>
          <Text className="text-sm font-sans-medium leading-snug text-cream">
            Not enough {label.toLowerCase()} pieces yet.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => router.push("/(tabs)/closet")}
              className="rounded-full bg-lime px-3.5 py-2 active:opacity-80"
            >
              <Text className="text-xs font-sans-bold text-forest">Add to closet →</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/outfits/${slot.outfit_id}`)}
              className="rounded-full border border-cream/35 px-3.5 py-2 active:opacity-70"
            >
              <Text className="text-xs font-sans-semibold text-cream">Shop the look →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const collageUrls = selectedItems
    .slice(0, 4)
    .map((s) => signedItemUrls[s.item_id])
    .filter((u): u is string => !!u);
  const vibe = outfit?.generated_outfit?.overall_vibe;

  return (
    <Pressable
      onPress={() => router.push(`/outfits/${slot.outfit_id}`)}
      accessibilityLabel={`See full ${label.toLowerCase()} look`}
      className="flex-1 overflow-hidden rounded-2xl border border-forest/10 bg-white active:opacity-95"
    >
      <Collage urls={collageUrls} />

      {/* Bottom gradient + magazine-cover overlay (label, vibe, CTA chip). */}
      <View
        className="absolute inset-x-0 bottom-0 gap-2.5 px-5 pb-5 pt-16"
        pointerEvents="none"
      >
        <LinearGradient
          colors={["transparent", "rgba(42,61,46,0.5)", "rgba(42,61,46,0.92)"]}
          locations={[0, 0.5, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <Text className="text-[10px] font-sans-bold uppercase tracking-[2px] text-lime">
          {label}
        </Text>
        {vibe ? (
          <Text className="font-display-regular text-base italic leading-tight text-cream">
            {vibe}
          </Text>
        ) : null}
        <View className="mt-1 self-start rounded-full bg-lime px-3.5 py-1.5">
          <Text className="text-xs font-sans-bold text-forest">See full look →</Text>
        </View>
      </View>

      {/* Save heart — own Pressable, above the card tap target. */}
      <View className="absolute right-3 top-3">
        <SaveHeart outfitId={slot.outfit_id} saved={!!outfit?.is_saved} />
      </View>
    </Pressable>
  );
}

// ── Empty-closet fallback ────────────────────────────────────────────────────
function EmptyClosetCard({ count, minimum }: { count: number; minimum: number }) {
  const router = useRouter();
  const remaining = minimum - count;
  return (
    <View className="gap-4 rounded-2xl border-2 border-dashed border-gold/40 bg-white p-6">
      <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-gold">
        Today&apos;s suggestions
      </Text>
      <Text className="font-display text-xl leading-snug text-forest">
        Upload {remaining} more {remaining === 1 ? "piece" : "pieces"} to unlock your daily outfits.
      </Text>
      <Text className="text-sm font-sans leading-relaxed text-forest/55">
        Perene needs at least {minimum} items in your closet to start styling looks for you each day.
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/closet")}
        className="self-start rounded-full bg-lime px-5 py-2.5 active:opacity-80"
      >
        <Text className="text-sm font-sans-bold text-forest">Add to closet →</Text>
      </Pressable>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function TodaysSuggestions() {
  const query = useDailyOutfits();
  const data = query.data;

  // Loading
  if (query.isLoading || !data) {
    return (
      <View className="gap-4">
        <SectionHeader />
        <View className="flex-row gap-4">
          <SlotSkeleton />
          <SlotSkeleton />
        </View>
      </View>
    );
  }

  // Error
  if (query.isError) {
    return (
      <View className="gap-4">
        <SectionHeader />
        <View className="flex-row items-center gap-2 rounded-xl border border-forest/12 bg-white px-4 py-3">
          <Text>⚠</Text>
          <Text className="flex-1 text-sm font-sans-medium text-forest">
            Couldn&apos;t load today&apos;s outfits — pull to refresh.
          </Text>
        </View>
      </View>
    );
  }

  const { response, signedItemUrls } = data;

  // Empty closet (< minimum items)
  if ((response.closet_count ?? 0) < (response.closet_minimum ?? 5)) {
    return (
      <EmptyClosetCard
        count={response.closet_count ?? 0}
        minimum={response.closet_minimum ?? 5}
      />
    );
  }

  return (
    <View className="gap-4">
      <SectionHeader />
      <View className="flex-row gap-4">
        <SlotCard label="Daytime" slot={response.daytime} signedItemUrls={signedItemUrls} />
        <SlotCard label="Evening" slot={response.evening} signedItemUrls={signedItemUrls} />
      </View>
    </View>
  );
}
