import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { WeatherNow } from "@perene/shared";
import { supabase } from "~/lib/supabase";
import { apiGet } from "~/lib/api";
import { useAuth } from "~/context/AuthContext";

// Manual city entry for weather-aware outfits. Geocodes via /api/weather, then
// saves { city, lat, lng } to user_profiles.default_location. Device geolocation
// (expo-location) is intentionally deferred — it adds a permission flow we'll
// introduce alongside the camera permissions in Phase 2.
export function LocationSetup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const trimmed = city.trim();
    if (!trimmed || !user) return;
    setBusy(true);
    setError("");
    try {
      const w = await apiGet<WeatherNow>(
        `/api/weather?city=${encodeURIComponent(trimmed)}`
      );
      const { error: dbErr } = await supabase
        .from("user_profiles")
        .upsert(
          {
            user_id: user.id,
            default_location: { city: w.city, lat: w.latitude, lng: w.longitude },
          },
          { onConflict: "user_id" }
        );
      if (dbErr) throw dbErr;
      // Profile drives the dashboard's location → refetch it.
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(
        /not found/i.test(msg) ? "City not found — try a different name." : "Couldn't save that. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="rounded-2xl border border-forest/10 bg-white p-5">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-cream">
          <Ionicons name="location-outline" size={20} color="#2A3D2E" />
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
            Weather-aware outfits
          </Text>
          <Text className="font-display text-base text-forest">
            Where are you based?
          </Text>
          <Text className="mt-0.5 text-xs font-sans text-forest/50">
            Set your city so Perene factors in real weather.
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Miami, FL"
          placeholderTextColor="rgba(42,61,46,0.3)"
          editable={!busy}
          onSubmitEditing={save}
          returnKeyType="done"
          className="flex-1 rounded-xl border-2 border-forest/12 bg-cream px-4 py-2.5 text-sm text-forest"
        />
        <Pressable
          onPress={save}
          disabled={busy || !city.trim()}
          className="items-center justify-center rounded-xl bg-lime px-5 active:opacity-80 disabled:opacity-40"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#2A3D2E" />
          ) : (
            <Text className="text-sm font-sans-bold text-forest">Set</Text>
          )}
        </Pressable>
      </View>

      {error ? (
        <Text className="mt-2 text-xs font-sans text-forest/55">⚠ {error}</Text>
      ) : null}
    </View>
  );
}
