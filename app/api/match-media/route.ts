import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

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

    const photoList = (photos as { id: string; type: string }[])
      .map((p, i) => `Photo ${i}: type=${p.type}`)
      .join("\n");

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 2000,
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

    const raw  = message.content[0].type === "text" ? message.content[0].text : "{}";
    const data = JSON.parse(extractJSON(raw));
    return NextResponse.json(data);
  } catch (err) {
    console.error("[match-media] error:", err);
    return NextResponse.json({ error: "Media matching failed" }, { status: 500 });
  }
}
