import { NextResponse } from "next/server";

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Fallback topics if no style descriptors
const DEFAULT_QUERIES = ["fashion editorial", "minimalist outfit", "street style fashion"];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || DEFAULT_QUERIES[0];
  const page  = parseInt(searchParams.get("page") ?? "1", 10);

  try {
    if (UNSPLASH_KEY) {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&page=${page}&orientation=portrait`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      if (!res.ok) throw new Error(`Unsplash ${res.status}`);
      const data  = await res.json();
      const photos = (data.results ?? []).map((p) => ({
        id:       p.id,
        url:      p.urls.regular,
        thumb:    p.urls.small,
        alt:      p.alt_description || p.description || query,
        credit:   p.user.name,
        profileUrl: p.user.links.html,
        color:    p.color,
      }));
      return NextResponse.json({ photos, total: data.total });
    }

    // No API key — use source.unsplash.com (no auth, varied results)
    const keywords = query.split(" ").join(",");
    const photos = Array.from({ length: 12 }, (_, i) => ({
      id:    `fallback-${page}-${i}`,
      url:   `https://source.unsplash.com/400x600/?${encodeURIComponent(query)}&sig=${page * 12 + i}`,
      thumb: `https://source.unsplash.com/200x300/?${encodeURIComponent(query)}&sig=${page * 12 + i}`,
      alt:   query,
      credit: "Unsplash",
      profileUrl: "https://unsplash.com",
      color: "#F5F1E8",
    }));
    return NextResponse.json({ photos, total: 999 });
  } catch (err) {
    console.error("[inspiration]", err);
    return NextResponse.json({ error: "Failed to fetch inspiration" }, { status: 500 });
  }
}
