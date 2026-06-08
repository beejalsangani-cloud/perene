import { labelFromCode } from "@/lib/weather";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city      = searchParams.get("city");
  const latParam  = searchParams.get("lat");
  const lngParam  = searchParams.get("lng");
  const dateParam = searchParams.get("date");

  const today = new Date().toISOString().split("T")[0];
  const date  = dateParam ?? today;
  const isToday = date === today;

  let latitude, longitude, displayCity;

  // ── Resolve coordinates ────────────────────────────────────────────────────
  if (latParam && lngParam) {
    latitude  = parseFloat(latParam);
    longitude = parseFloat(lngParam);

    // Reverse geocode to a human-readable city name
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "User-Agent": "Perene/1.0 (perene.style)" } }
      );
      const d    = await r.json();
      const addr = d.address ?? {};
      const name = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "Your location";
      const cc   = addr.country_code?.toUpperCase();
      // For the US, show "City, ST" abbreviation when available
      const region = cc === "US"
        ? (addr.state_abbreviation ?? addr.ISO3166_2_lvl4?.split("-")[1] ?? addr.state ?? "")
        : cc ?? "";
      displayCity = region ? `${name}, ${region}` : name;
    } catch {
      displayCity = "Your location";
    }
  } else if (city) {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) return Response.json({ error: "Geocoding failed" }, { status: 502 });

    const geoData = await geoRes.json();
    const place   = geoData.results?.[0];
    if (!place)   return Response.json({ error: "City not found" }, { status: 404 });

    latitude    = place.latitude;
    longitude   = place.longitude;
    displayCity = `${place.name}${place.country_code ? `, ${place.country_code.toUpperCase()}` : ""}`;
  } else {
    return Response.json({ error: "Provide lat+lng or city" }, { status: 400 });
  }

  // ── Fetch forecast ─────────────────────────────────────────────────────────
  const currentPart = isToday ? "&current=temperature_2m,weathercode" : "";
  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
    `&temperature_unit=fahrenheit&timezone=auto` +
    `&start_date=${date}&end_date=${date}` +
    currentPart
  );

  if (!wxRes.ok) return Response.json({ error: "Weather fetch failed" }, { status: 502 });
  const wxData = await wxRes.json();

  const d = wxData.daily;
  if (d?.temperature_2m_max?.[0] == null) {
    return Response.json({ error: "No forecast data for this date" }, { status: 404 });
  }

  const code = d.weathercode?.[0] ?? 0;

  return Response.json({
    city:                 displayCity,
    latitude,
    longitude,
    date,
    temperature_current:  wxData.current?.temperature_2m != null
      ? Math.round(wxData.current.temperature_2m) : null,
    temperature_high:     Math.round(d.temperature_2m_max[0]),
    temperature_low:      Math.round(d.temperature_2m_min[0]),
    precipitation_chance: d.precipitation_probability_max?.[0] ?? 0,
    weather_code:         code,
    condition:            labelFromCode(code),
  });
}
