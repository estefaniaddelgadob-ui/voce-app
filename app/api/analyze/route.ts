import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { transcript } = await request.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You are analysing a voice note from a content creator. Extract: " +
        "1. Key ideas (bullet points) " +
        "2. Main themes (1-3 word labels) " +
        "3. Emotional tone (e.g. reflective, energised, frustrated) " +
        "4. Standout phrases that sound like them. " +
        "Return as JSON only — no markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `Analyse this voice note and return ONLY valid JSON matching this schema exactly:
{
  "title": "5 words max capturing the main topic",
  "ideas": ["key idea 1", "key idea 2", "key idea 3"],
  "themes": ["theme1", "theme2", "theme3"],
  "tone": "one word: reflective | energised | frustrated | confident | uncertain | creative | hopeful | analytical",
  "phrases": ["standout phrase 1", "standout phrase 2"]
}

Voice note:
${transcript}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const analysis = JSON.parse(extractJSON(raw));

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
