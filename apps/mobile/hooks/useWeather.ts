import { useQuery } from "@tanstack/react-query";
import type { DefaultLocation, WeatherNow } from "@perene/shared";
import { apiGet } from "~/lib/api";

// Fetches today's weather for the user's saved location via the public
// /api/weather route (same endpoint the web app uses). Prefers lat/lng when
// present, falls back to city name. Cached for 30 min — weather doesn't move
// fast and we don't want to refetch on every dashboard focus.
export function useWeather(location: DefaultLocation | null | undefined) {
  return useQuery({
    queryKey: ["weather", location?.lat, location?.lng, location?.city],
    enabled: !!location,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<WeatherNow> => {
      const qs =
        location!.lat != null && location!.lng != null
          ? `lat=${location!.lat}&lng=${location!.lng}`
          : `city=${encodeURIComponent(location!.city)}`;
      return apiGet<WeatherNow>(`/api/weather?${qs}`);
    },
  });
}
