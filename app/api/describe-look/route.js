// Generates a Claude-written description of the outfit visible in a Discover
// inspiration photo, replacing the broken Unsplash alt_description (which
// describes the photo subject, not the outfit) when pre-filling the occasion
// field on /outfits/new.
//
// Flow:
//   1. Auth-gate via Bearer token
//   2. Validate imageUrl against Unsplash CDN allowlist
//   3. Cache lookup in public.discover_descriptions by photo_id
//   4. On miss: call Claude Haiku with the image attached, then cache the result
//   5. Fall back to "everyday outfit inspiration" on any failure
//
// Fallbacks are never cached so transient errors get retried on next click.

import { supabaseAdmin } from "@/lib/supabase-admin";
import Anthropic from "@anthropic-ai/sdk";

const FALLBACK_DESCRIPTION    = "everyday outfit inspiration";
const UNSPLASH_HOST_ALLOWLIST = ["images.unsplash.com", "plus.unsplash.com"];

function sanitizeUnsplashUrl(url) {
  if (typeof url !== "string" || !url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (!UNSPLASH_HOST_ALLOWLIST.includes(u.hostname.toLowerCase())) return null;
    return u.href;
  } catch {
    return null;
  }
}

async function userIdFromAuthHeader(request) {
  const header = request.headers.get("authorization") ?? "";
  const token  = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

const DESCRIBE_PROMPT = `Describe the outfit in this photo in 1-2 sentences, focused on what someone would need to recreate the look. Include: garment types, silhouette, colors, key details, and the overall vibe/occasion. Do not describe the person, setting, or photo composition.

Output as plain text only — no markdown, no headings, no bold formatting, no surrounding quotes.
Output format: "[Occasion vibe] — [outfit description]"
Example: Cocktail/event — flowy gray midi dress with dramatic tulle sleeve detail, paired with pink ankle-strap pumps.

Respond with exactly one such formatted sentence and nothing else.`;

// Strip markdown noise Haiku sometimes adds (leading "# Title" lines, **bold**
// markers, surrounding quotes) and collapse any remaining newlines to a single
// line. Output goes straight into the occasion text input, so whitespace and
// formatting must be clean.
function cleanDescription(raw) {
  if (typeof raw !== "string") return "";
  let text = raw.trim();
  text = text.replace(/^"+|"+$/g, "").trim();                       // strip wrapping quotes
  text = text.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n").trim();
  text = text.replace(/\*\*/g, "");                                 // strip bold
  text = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();     // collapse to one line
  return text;
}

// Reject obvious failure modes from Haiku: refusals, markdown fences,
// over-long ramblings, empty strings. Anything failing this check falls
// back to FALLBACK_DESCRIPTION instead of being shown to the user.
function isUsableDescription(text) {
  if (typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length < 10)  return false;
  if (trimmed.length > 500) return false;
  if (/^(I can't|I cannot|I'm unable|Sorry|I apologize)/i.test(trimmed)) return false;
  if (/```|<\/?\w+>/.test(trimmed)) return false;
  return true;
}

export async function POST(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { photoId, imageUrl } = body ?? {};
  if (typeof photoId !== "string" || !photoId) {
    return Response.json({ error: "Missing photoId" }, { status: 400 });
  }
  const validUrl = sanitizeUnsplashUrl(imageUrl);
  if (!validUrl) {
    // Bad URL → fall back without consulting cache or Haiku.
    return Response.json({ description: FALLBACK_DESCRIPTION });
  }

  // Cache check — silent failure falls through to a fresh Haiku call.
  try {
    const { data } = await supabaseAdmin
      .from("discover_descriptions")
      .select("description")
      .eq("photo_id", photoId)
      .maybeSingle();
    if (data?.description) {
      return Response.json({ description: data.description });
    }
  } catch (err) {
    console.error("[describe-look] cache read error:", err);
  }

  // Generate
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let description = FALLBACK_DESCRIPTION;
  try {
    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 250,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: validUrl } },
          { type: "text",  text: DESCRIBE_PROMPT },
        ],
      }],
    });
    const raw     = message.content[0]?.text ?? "";
    const cleaned = cleanDescription(raw);
    if (isUsableDescription(cleaned)) {
      description = cleaned;
    } else {
      console.log(`[describe-look] unusable haiku output for photo=${photoId}: "${raw.slice(0, 120)}"`);
    }
  } catch (err) {
    console.error(`[describe-look] haiku error for photo=${photoId}:`, err.message);
  }

  // Cache only successful generations — fallbacks should retry next time
  if (description !== FALLBACK_DESCRIPTION) {
    try {
      await supabaseAdmin
        .from("discover_descriptions")
        .upsert({ photo_id: photoId, description }, { onConflict: "photo_id" });
    } catch (err) {
      console.error("[describe-look] cache write error:", err);
    }
  }

  return Response.json({ description });
}
