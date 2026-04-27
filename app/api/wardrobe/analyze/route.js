import Anthropic from "@anthropic-ai/sdk";

const CATEGORIES = ["Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessory", "Bag", "Other"];
const SEASONS    = ["Spring", "Summer", "Fall", "Winter", "All-season"];
const COLORS     = ["Black", "White", "Cream", "Beige", "Brown", "Gray", "Navy", "Forest", "Pastels", "Bold", "Other"];

export async function POST(request) {
  const { imageBase64, mediaType } = await request.json();

  if (!imageBase64 || !mediaType) {
    return Response.json({ error: "Missing image data" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: `Analyse this clothing item photo and return a JSON object with exactly these three fields:

"category": pick the single best match from ${JSON.stringify(CATEGORIES)}
"color": pick the single best match from ${JSON.stringify(COLORS)} based on the dominant colour
"seasons": an array of the most appropriate values from ${JSON.stringify(SEASONS)}

Return only the raw JSON object — no markdown, no explanation.`,
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[wardrobe/analyze] Claude error:", err);
    return Response.json({ error: "AI analysis failed" }, { status: 500 });
  }

  try {
    const raw = message.content[0]?.text?.trim() ?? "";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed  = JSON.parse(jsonStr);

    return Response.json({
      category: CATEGORIES.includes(parsed.category) ? parsed.category : null,
      color:    COLORS.includes(parsed.color)         ? parsed.color    : null,
      seasons:  (parsed.seasons ?? []).filter((s) => SEASONS.includes(s)),
    });
  } catch (err) {
    console.error("[wardrobe/analyze] parse error:", err, message.content[0]?.text);
    return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
