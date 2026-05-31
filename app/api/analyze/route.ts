import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this voice note transcript. Return ONLY a valid JSON object — no markdown, no explanation.

Schema:
{
  "title": "short title, 5 words max",
  "keyIdeas": ["concise idea 1", "concise idea 2", "concise idea 3"],
  "themes": ["theme1", "theme2", "theme3"],
  "tone": "one of: reflective | energetic | analytical | uncertain | confident | creative | frustrated | hopeful",
  "summary": "1–2 sentence summary of the note"
}

Transcript:
${transcript}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const analysis = JSON.parse(extractJSON(raw));

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
