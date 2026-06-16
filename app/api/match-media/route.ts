import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const extractJSON = (text: string): string =>
  text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

const safeParseJSON = (text: string) => {
  try { return JSON.parse(text); } catch { /* fall through */ }
  // Attempt to recover truncated mediaplan array
  const startIdx = text.indexOf('"mediaplan"');
  if (startIdx !== -1) {
    const lastObj = text.lastIndexOf('{"mediaIndex"');
    if (lastObj !== -1) {
      try { return JSON.parse(text.slice(0, lastObj) + "]}"); } catch { /* fall through */ }
    }
  }
  throw new Error("Could not parse match-media response as JSON");
};

const SYSTEM_PROMPT = `You are a world-class cinematic content director with 20+ years in filmmaking, advertising and viral social media storytelling.

You have been given:
1. A piece of Instagram content
2. A selection of photos/videos the creator chose

Your task:
- Analyze the content for emotional, visual and narrative moments
- Match each photo/video to a specific moment in the content
- Explain WHY each visual works for that moment
- Think like a creative director producing content for Instagram Reels, captions, carousels
- Prioritize visually striking scenes, pattern interrupts, curiosity gaps, and emotionally powerful moments that stop scrolling

For each selected photo/video provide:
1. Which part of the content it matches
2. Why this visual works for that moment
3. How to use it (hero image, opening frame, closing shot, slide X of carousel, etc.)
4. Any editing suggestion (close crop, wide shot, add text overlay, etc.)

Return ONLY valid JSON — no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { caption, contentType, photos } = await request.json();

    if (!caption?.trim() || !photos?.length) {
      return NextResponse.json({ error: "caption and photos required" }, { status: 400 });
    }

    const photoList = (photos as { id: string; type: string; mimeType?: string }[])
      .map((p, i) => `Item ${i}: ${p.type === "video" ? "📹 video" : "📷 photo"} (${p.mimeType ?? "image/jpeg"})`)
      .join("\n");

    console.log("[match-media] caption length:", caption.length, "| photos:", photos.length, "| contentType:", contentType);

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
      system:     SYSTEM_PROMPT,
      messages: [{
        role:    "user",
        content: `Content type: ${contentType}

Caption / Script:
${caption}

Selected media (${photos.length} item${photos.length !== 1 ? "s" : ""}):
${photoList}

Match each photo/video to a moment in the content. Return JSON:
{
  "mediaplan": [
    {
      "mediaIndex": 0,
      "role": "Hero image / Opening frame / Closing shot / Slide 2 / etc",
      "matchesMoment": "the specific line or moment in the content this visual matches",
      "whyItWorks": "creative reason this visual amplifies that moment (1-2 sentences)",
      "howToUse": "specific instructions — placement, timing, crop",
      "editingSuggestion": "text overlay suggestion, color grade, crop ratio"
    }
  ]
}`,
      }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "{}";
    console.log("[match-media] response length:", rawText.length, "| tail:", rawText.slice(-200));

    const parsed = safeParseJSON(extractJSON(rawText));
    console.log("[match-media] parsed plan items:", parsed?.mediaplan?.length ?? 0);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[match-media] error:", msg);
    return NextResponse.json({ error: `Media matching failed: ${msg}` }, { status: 500 });
  }
}
