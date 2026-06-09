import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CLOSET_MINIMUM_FOR_DAILY, type StyleProfile } from "@perene/shared";
import { useAuth } from "~/context/AuthContext";
import { useProfile } from "~/hooks/useProfile";
import { useCloset } from "~/hooks/useCloset";
import { WeatherWidget } from "~/components/WeatherWidget";
import { LocationSetup } from "~/components/LocationSetup";
import { ProfileCard } from "~/components/ProfileCard";
import { ClosetPreview } from "~/components/ClosetPreview";

function firstNameFrom(
  profile: StyleProfile | null | undefined,
  email?: string | null,
  meta?: Record<string, unknown>
) {
  const stored = profile?.first_name?.trim();
  if (stored) return stored;
  const fromMeta = meta?.first_name;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  const prefix = email?.split("@")[0];
  if (!prefix) return "stylist";
  const clean = prefix.replace(/[._\-+]/g, " ").split(" ")[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profileQuery = useProfile();
  const closetQuery = useCloset();

  const profile = profileQuery.data;
  const closet = closetQuery.data;
  const name = firstNameFrom(profile, user?.email, user?.user_metadata);

  const refreshing = profileQuery.isRefetching || closetQuery.isRefetching;
  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    closetQuery.refetch();
  }, [profileQuery, closetQuery]);

  const profileLoading = profileQuery.isLoading;
  const closetCount = closet?.count ?? null;
  const location = profile?.default_location ?? null;
  const showGateBanner =
    closetCount !== null && closetCount > 0 && closetCount < CLOSET_MINIMUM_FOR_DAILY;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <ScrollView
        contentContainerClassName="px-6 py-8 gap-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2A3D2E"
          />
        }
      >
        {/* Header */}
        <View>
          <Text className="text-xs font-sans-semibold uppercase tracking-[3px] text-gold">
            Your dashboard
          </Text>
          <Text className="mt-2 font-display text-4xl leading-tight text-forest">
            Welcome back, <Text className="text-gold">{name}.</Text>
          </Text>
          <Text className="mt-2 text-base font-sans text-forest/55">
            Here&apos;s your style at a glance.
          </Text>
        </View>

        {/* Weather / location setup */}
        {!profileLoading &&
          (location ? (
            <WeatherWidget location={location} />
          ) : (
            <LocationSetup />
          ))}

        {/* Soft-gate banner (1–4 items) */}
        {showGateBanner && (
          <View className="flex-row items-center gap-3 rounded-2xl border border-gold/30 bg-gold/8 px-5 py-4">
            <Text className="text-base text-gold">✦</Text>
            <Text className="flex-1 text-sm leading-relaxed text-forest/75">
              <Text className="font-sans-semibold text-forest">
                Add {CLOSET_MINIMUM_FOR_DAILY - (closetCount ?? 0)} more{" "}
                {CLOSET_MINIMUM_FOR_DAILY - (closetCount ?? 0) === 1
                  ? "piece"
                  : "pieces"}
              </Text>{" "}
              so Perene can style you better.
            </Text>
          </View>
        )}

        {/* Today's Suggestions — wired in Phase 3 */}
        <View className="rounded-2xl border border-forest/10 bg-white p-6">
          <Text className="font-display text-lg text-forest">
            Today&apos;s Suggestions
          </Text>
          <Text className="mt-2 text-sm font-sans text-forest/55">
            {closetCount !== null && closetCount >= CLOSET_MINIMUM_FOR_DAILY
              ? "Your daytime and evening looks will appear here."
              : `Add at least ${CLOSET_MINIMUM_FOR_DAILY} pieces and Perene will style a daytime and an evening look each morning.`}
          </Text>
          <View className="mt-4 self-start rounded-full bg-forest/6 px-4 py-2">
            <Text className="text-xs font-sans-semibold text-forest/40">
              Phase 3 — coming soon
            </Text>
          </View>
        </View>

        {/* Closet preview */}
        <ClosetPreview summary={closet} loading={closetQuery.isLoading} />

        {/* Style profile */}
        <View>
          <Text className="mb-3 text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
            Style profile
          </Text>
          {profileLoading ? (
            <View className="items-center rounded-2xl border border-forest/10 bg-white p-8">
              <ActivityIndicator color="#C4E552" />
            </View>
          ) : (
            <ProfileCard profile={profile ?? null} />
          )}
        </View>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          className="items-center rounded-xl border-2 border-forest/15 py-3 active:opacity-70"
        >
          <Text className="text-sm font-sans-semibold text-forest/65">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
