const WMO = {
  0: "Clear sky",     1: "Mainly clear",    2: "Partly cloudy",   3: "Overcast",
  45: "Foggy",        48: "Icy fog",
  51: "Light drizzle",53: "Drizzle",         55: "Dense drizzle",
  61: "Light rain",   63: "Moderate rain",   65: "Heavy rain",
  71: "Light snow",   73: "Moderate snow",   75: "Heavy snow",     77: "Snow grains",
  80: "Light showers",81: "Rain showers",    82: "Heavy showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm",    99: "Thunderstorm",
};

export function labelFromCode(code) {
  if (WMO[code]) return WMO[code];
  if (code <= 3)  return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  return "Thunderstorm";
}

export function iconTypeFromCode(code) {
  if (code === 0) return "sun";
  if (code <= 2)  return "partly-cloudy";
  if (code <= 3)  return "cloud";
  if (code <= 48) return "fog";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  return "thunder";
}
