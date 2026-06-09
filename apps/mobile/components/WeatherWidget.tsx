import { ActivityIndicator, Text, View } from "react-native";
import type { DefaultLocation } from "@perene/shared";
import { useWeather } from "~/hooks/useWeather";
import { WeatherIcon } from "./WeatherIcon";

// Compact weather strip for the dashboard. Renders the current temp + condition
// for the user's saved location, with high/low and precipitation chance.
export function WeatherWidget({ location }: { location: DefaultLocation }) {
  const { data, isLoading, isError } = useWeather(location);

  if (isLoading) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-forest/10 bg-white px-5 py-4">
        <ActivityIndicator color="#C4E552" />
        <Text className="text-sm font-sans text-forest/50">
          Loading weather…
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="rounded-2xl border border-forest/10 bg-white px-5 py-4">
        <Text className="text-sm font-sans text-forest/50">
          Weather unavailable right now.
        </Text>
      </View>
    );
  }

  const temp = data.temperature_current ?? data.temperature_high;

  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-forest/10 bg-white px-5 py-4">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-cream">
          <WeatherIcon code={data.weather_code} size={22} />
        </View>
        <View>
          <Text className="text-2xl font-sans-bold text-forest">{temp}°</Text>
          <Text className="text-xs font-sans text-forest/55">{data.city}</Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="text-sm font-sans-medium text-forest/80">
          {data.condition}
        </Text>
        <Text className="mt-0.5 text-xs font-sans text-forest/50">
          H {data.temperature_high}° · L {data.temperature_low}° ·{" "}
          {data.precipitation_chance}% rain
        </Text>
      </View>
    </View>
  );
}
