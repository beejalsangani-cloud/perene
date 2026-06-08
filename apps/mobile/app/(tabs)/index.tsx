import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CLOSET_MINIMUM_FOR_DAILY } from "@perene/shared";
import { useAuth } from "~/context/AuthContext";

// Dashboard shell. Real content (Today's Suggestions, weather, closet preview,
// style profile) is wired up in Phase 1 / Phase 3. This proves the auth context
// and the @perene/shared import both resolve through the monorepo.
function firstNameFrom(email?: string | null, meta?: Record<string, unknown>) {
  const fromMeta = meta?.first_name;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  const prefix = email?.split("@")[0];
  if (!prefix) return "stylist";
  const clean = prefix.replace(/[._\-+]/g, " ").split(" ")[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const name = firstNameFrom(user?.email, user?.user_metadata);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <ScrollView contentContainerClassName="px-6 py-8">
        <Text className="text-xs font-sans-semibold uppercase tracking-[3px] text-gold">
          Your dashboard
        </Text>
        <Text className="mt-2 font-display text-4xl leading-tight text-forest">
          Welcome back, <Text className="text-gold">{name}.</Text>
        </Text>
        <Text className="mt-2 text-base font-sans text-forest/55">
          Here&apos;s your style at a glance.
        </Text>

        <View className="mt-8 rounded-2xl border border-forest/10 bg-white p-6">
          <Text className="font-display text-lg text-forest">
            Today&apos;s Suggestions
          </Text>
          <Text className="mt-2 text-sm font-sans text-forest/55">
            Add at least {CLOSET_MINIMUM_FOR_DAILY} pieces to your closet and
            Perene will style a daytime and an evening look for you each morning.
          </Text>
          <View className="mt-4 self-start rounded-full bg-forest/6 px-4 py-2">
            <Text className="text-xs font-sans-semibold text-forest/40">
              Phase 3 — coming soon
            </Text>
          </View>
        </View>

        <Pressable
          onPress={signOut}
          className="mt-8 items-center rounded-xl border-2 border-forest/15 py-3 active:opacity-70"
        >
          <Text className="text-sm font-sans-semibold text-forest/65">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
