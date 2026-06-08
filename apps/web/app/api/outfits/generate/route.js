// Thin HTTP wrapper around the outfit-generation core in lib/generate-outfit.
// Authenticates the caller via Bearer token (Supabase access token) and derives
// the user id from it — the body's userId is no longer trusted. The heavy
// lifting (wardrobe/profile/weather fetch, Claude call, persistence) lives in
// the lib so Today's Suggestions can reuse it without an in-process HTTP hop.
import { requireUser } from "@/lib/auth";
import { generateOutfit } from "@/lib/generate-outfit";

export async function POST(request) {
  const { userId, response } = await requireUser(request);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await generateOutfit({
    userId,
    eventDescription:    body.eventDescription,
    location:            body.location,
    date:                body.date,
    inspirationImageUrl: body.inspirationImageUrl,
    excludeItemIds:      body.excludeItemIds,
    aestheticEmphasis:   body.aestheticEmphasis,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error, ...(result.details ? { details: result.details } : {}) },
      { status: result.status }
    );
  }

  return Response.json({ id: result.id });
}
