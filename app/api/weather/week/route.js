import { NextResponse } from "next/server";
import { labelFromCode } from "@/lib/weather";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat  = searchParams.get("lat");
  const lng  = searchParams.get("lng");
  const city = searchParams.get("city");

  try {
    let latitude, longitude, resolvedCity;

    if (lat && lng) {
      latitude  = parseFloat(lat);
      longitude = parseFloat(lng);
      // Reverse geocode to get city name
      const rev = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "User-Agent": "Perene/1.0 (perene.style)" } }
      );
      const revData = await rev.json();
      resolvedCity =
        revData.address?.city ||
        revData.address?.town ||
        revData.address?.village ||
        revData.address?.county ||
        "Your location";
    } else if (city) {
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      const geoData = await geo.json();
      if (!geoData.results?.length) return NextResponse.json({ error: "City not found" }, { status: 404 });
      const r = geoData.results[0];
      latitude     = r.latitude;
      longitude    = r.longitude;
      resolvedCity = r.name;
    } else {
      return NextResponse.json({ error: "lat/lng or city required" }, { status: 400 });
    }

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`
    );
    const forecast = await forecastRes.json();
    const daily    = forecast.daily;

    const days = daily.time.map((date, i) => ({
      date,
      temperature_high:       Math.round(daily.temperature_2m_max[i]),
      temperature_low:        Math.round(daily.temperature_2m_min[i]),
      precipitation_chance:   daily.precipitation_probability_max[i] ?? 0,
      weather_code:           daily.weathercode[i],
      condition:              labelFromCode(daily.weathercode[i]),
    }));

    return NextResponse.json({ city: resolvedCity, days });
  } catch (err) {
    console.error("[weather/week]", err);
    return NextResponse.json({ error: "Failed to fetch forecast" }, { status: 500 });
  }
}
