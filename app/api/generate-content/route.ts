import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { topic, persona, audience, thoughtNotes } = await request.json();

    const samplesBlock =
      (persona.sample_captions as string[])?.filter(Boolean).length > 0
        ? `\nSAMPLE POSTS (study this voice carefully):\n${(persona.sample_captions as string[])
            .filter(Boolean)
            .map((c: string, i: number) => `[${i + 1}] ${c}`)
            .join("\n\n")}`
        : "";

    const thoughtsBlock =
      (thoughtNotes as { transcript?: string; title?: string }[]).length > 0
        ? `\nRECENT THOUGHTS & IDEAS (use if relevant):\n${thoughtNotes
            .map((n: { transcript?: string; title?: string }) => `- ${n.transcript || n.title || ""}`)
            .filter(Boolean)
            .join("\n")}`
        : "";

    const fingerprintBlock = persona.style_fingerprint
      ? `\nSTYLE FINGERPRINT:\n${persona.style_fingerprint}`
      : `\nTONE: ${persona.tone || "authentic"}\nCOMMUNICATION STYLE: ${persona.communication_style || "direct and clear"}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are ghostwriting for ${persona.display_name || "a content creator"}.
${fingerprintBlock}
${samplesBlock}
${thoughtsBlock}

AUDIENCE:
Name: ${audience.name}
Who they are: ${audience.who_they_are || ""}
Biggest struggles: ${audience.biggest_struggles || ""}
Goals: ${audience.goals || ""}
Content pillars: ${(audience.content_pillars as string[])?.join(", ") || ""}
Platform: ${audience.primary_platform}
Content goal: ${audience.content_goal}

TOPIC: ${topic}

Write a ${audience.primary_platform} post about this topic. Return ONLY valid JSON — no markdown, no explanation:

{
  "hook": "1-2 sentences that stop the scroll and pull the reader in",
  "body": "main content written in the creator's exact voice, formatted for ${audience.primary_platform}",
  "cta": "1-2 sentence call to action"
}

Rules:
- Mirror the creator's voice exactly — their sentence rhythm, vocabulary, punctuation patterns
- Speak directly to this audience's struggles and goals
- The goal is to ${audience.content_goal}
- Format for ${audience.primary_platform} (appropriate length, line breaks, style)
- Only add hashtags if the creator uses them in their samples`,
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const content = JSON.parse(extractJSON(raw));

    return NextResponse.json(content);
  } catch (err) {
    console.error("Content generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
