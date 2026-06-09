import { Ionicons } from "@expo/vector-icons";

// Maps a WMO weather code to an Ionicon. Ranges mirror the labelFromCode
// buckets used server-side in lib/weather.
function iconForCode(code: number): keyof typeof Ionicons.glyphMap {
  if (code <= 1) return "sunny-outline";
  if (code <= 3) return "partly-sunny-outline";
  if (code <= 48) return "cloud-outline";
  if (code <= 67) return "rainy-outline";
  if (code <= 77) return "snow-outline";
  if (code <= 82) return "rainy-outline";
  if (code <= 86) return "snow-outline";
  return "thunderstorm-outline";
}

export function WeatherIcon({
  code,
  size = 22,
  color = "#2A3D2E",
}: {
  code: number;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={iconForCode(code)} size={size} color={color} />;
}
