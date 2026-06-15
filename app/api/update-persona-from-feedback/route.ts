import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const extractJSON = (text: string): string =>
  text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { qualityIssues, improvements, originalContent, persona } = await request.json();

    const personaSummary = [
      persona?.instagram_handle ? `Handle: @${persona.instagram_handle}` : "",
      persona?.niche            ? `Niche: ${persona.niche}`               : "",
      (persona?.tone_words as string[] | undefined)?.length
        ? `Tone words: ${(persona.tone_words as string[]).join(", ")}`    : "",
      persona?.never_say        ? `Never say: ${persona.never_say}`       : "",
      persona?.style_fingerprint
        ? `Style fingerprint (excerpt): ${(persona.style_fingerprint as string).slice(0, 400)}` : "",
    ].filter(Boolean).join("\n");

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{
        role:    "user",
        content: `You are analyzing feedback from a content creator who deleted AI-generated content.

Their persona:
${personaSummary || "Not provided"}

Content they deleted:
${(originalContent as string | undefined)?.slice(0, 600) ?? "Not provided"}

Why they deleted it: ${(qualityIssues as string[] | undefined)?.length ? (qualityIssues as string[]).join(", ") : "Not specified"}
What would make it better: ${(improvements as string[] | undefined)?.length ? (improvements as string[]).join(", ") : "Not specified"}

Extract 2-3 specific learnings about their voice that should be remembered. Be specific and actionable, not generic.

Examples of good learnings:
- "Uses first person singular, never plural"
- "Starts sentences with lowercase for casual feel"
- "Never uses corporate words like leverage or synergy"
- "Prefers questions over statements in CTAs"

Return ONLY valid JSON: { "learnings": ["learning 1", "learning 2"] }`,
      }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const { learnings } = JSON.parse(extractJSON(raw));

    console.log("[update-persona-from-feedback] extracted learnings:", learnings);

    return NextResponse.json({ learnings: learnings ?? [] });
  } catch (err) {
    console.error("[update-persona-from-feedback] error:", err);
    return NextResponse.json({ learnings: [] }, { status: 500 });
  }
}
