import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { displayName, bio, tone, communicationStyle, sampleCaptions } =
      await request.json();

    const samples = (sampleCaptions as string[])
      .filter(Boolean)
      .map((c, i) => `[${i + 1}] ${c}`)
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are a personal branding expert. A content creator has shared information about themselves. Write a 200-word Style Fingerprint — a precise briefing for an AI ghostwriter to sound authentically like them.

CREATOR:
Name: ${displayName || "Creator"}
Bio: ${bio || "Not provided"}
Desired tone: ${tone}
How they communicate: ${communicationStyle || "Not provided"}

SAMPLE POSTS:
${samples || "No samples provided"}

Write the Style Fingerprint in second person (addressing the AI ghostwriter). Cover: sentence structure and length, vocabulary choices, use of questions/humor/metaphor/storytelling, emotional register, distinctive patterns or phrases, and what makes this voice instantly recognizable. Be specific — reference patterns you see in their samples. Return plain text only, no markdown.`,
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
