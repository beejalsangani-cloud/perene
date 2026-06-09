import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PALETTE_SWATCHES, type StyleProfile } from "@perene/shared";

function Pill({
  label,
  variant,
}: {
  label: string;
  variant: "lime" | "forest";
}) {
  const cls =
    variant === "lime"
      ? "bg-lime"
      : "bg-forest";
  const textCls = variant === "lime" ? "text-forest" : "text-cream";
  return (
    <View className={`rounded-full px-3 py-1 ${cls}`}>
      <Text className={`text-xs font-sans-semibold ${textCls}`}>{label}</Text>
    </View>
  );
}

// Dashboard style-profile summary. Empty state nudges the user to the Profile
// tab (the full quiz lands in Phase 4).
export function ProfileCard({ profile }: { profile: StyleProfile | null }) {
  const router = useRouter();

  if (!profile) {
    return (
      <View className="rounded-2xl border-2 border-dashed border-gold/40 bg-white p-6">
        <Text className="text-sm font-sans leading-relaxed text-forest/55">
          You haven&apos;t set up your style profile yet. It only takes two
          minutes and sharpens every suggestion.
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          className="mt-4 self-start rounded-full bg-lime px-5 py-2.5 active:opacity-80"
        >
          <Text className="text-sm font-sans-semibold text-forest">
            Set up your profile →
          </Text>
        </Pressable>
      </View>
    );
  }

  const {
    style_descriptors = [],
    typical_events = [],
    color_preferences = [],
    gender,
    age_range,
    body_type,
    budget_range,
  } = profile;

  const details = [
    { label: "Gender", value: gender },
    { label: "Age range", value: age_range },
    { label: "Body type", value: body_type },
    { label: "Budget", value: budget_range },
  ].filter((d) => d.value);

  return (
    <View className="gap-5 rounded-2xl border border-forest/10 bg-white p-6">
      {style_descriptors.length > 0 && (
        <View>
          <Text className="mb-3 text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
            My style
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {style_descriptors.map((s) => (
              <Pill key={s} label={s} variant="lime" />
            ))}
          </View>
        </View>
      )}

      {typical_events.length > 0 && (
        <View>
          <Text className="mb-3 text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
            I dress for
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {typical_events.map((e) => (
              <Pill key={e} label={e} variant="forest" />
            ))}
          </View>
        </View>
      )}

      {color_preferences.length > 0 && (
        <View>
          <Text className="mb-3 text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
            My palette
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {color_preferences.map((c) => (
              <View key={c} className="flex-row items-center gap-1.5">
                <View
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: PALETTE_SWATCHES[c] ?? "#CCC" }}
                />
                <Text className="text-xs font-sans text-forest/70">{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {details.length > 0 && (
        <View className="flex-row flex-wrap gap-x-8 gap-y-2 border-t border-forest/6 pt-4">
          {details.map(({ label, value }) => (
            <View key={label}>
              <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-forest/35">
                {label}
              </Text>
              <Text className="text-sm font-sans-medium text-forest">
                {value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
