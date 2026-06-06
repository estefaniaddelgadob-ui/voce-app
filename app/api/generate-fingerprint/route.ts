import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface RefAccount { handle: string; whatLike: string; }

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const {
      instagramHandle, niche, audience,
      transformationBefore, transformationAfter,
      toneWords, toneDescription, beliefs,
      recurringThemes, pushback, referenceAccounts,
    } = await request.json();

    const refs = (referenceAccounts as RefAccount[] ?? [])
      .filter(r => r.handle?.trim())
      .map(r => `  @${r.handle} — ${r.whatLike}`)
      .join("\n");

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [
        {
          role:    "user",
          content: `You are a personal branding expert. A content creator has shared detailed information about themselves. Write a 200-word Style Fingerprint — a precise briefing for an AI ghostwriter to sound authentically like them.

CREATOR:
Instagram: @${instagramHandle || ""}
Niche: ${niche || "Not provided"}
Audience: ${audience || "Not provided"}
Before following them their audience feels: ${transformationBefore || "Not provided"}
After following them their audience feels: ${transformationAfter || "Not provided"}
Tone words: ${(toneWords as string[] ?? []).join(", ") || "Not provided"}
In their own words, their tone is: ${toneDescription || "Not provided"}
Core beliefs / POV: ${beliefs || "Not provided"}
Recurring themes: ${recurringThemes || "Not provided"}
Pushes back on: ${pushback || "Not provided"}
${refs ? `Style reference accounts:\n${refs}` : ""}

Write the Style Fingerprint in second person (addressing the AI ghostwriter). Cover: sentence structure and length, vocabulary choices, emotional register, topics they return to, the transformation arc they represent, what makes this voice instantly recognizable, and any distinctive stylistic patterns. Be specific. Return plain text only, no markdown.`,
        },
      ],
    });

    const fingerprint =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ fingerprint });
  } catch (err) {
    console.error("Fingerprint error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
