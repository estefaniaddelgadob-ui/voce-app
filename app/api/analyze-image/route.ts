import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

type SupportedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const SUPPORTED: SupportedMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const mediaType = (SUPPORTED.includes(image.type as SupportedMediaType)
      ? image.type
      : "image/jpeg") as SupportedMediaType;

    const buffer = await image.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `This is a photo of handwritten notes. Analyze it and return ONLY a valid JSON object — no markdown, no explanation.

Schema:
{
  "transcript": "full verbatim transcription of all handwritten text",
  "title": "short title capturing the main topic, 5 words max",
  "keyIdeas": ["concise idea 1", "concise idea 2", "concise idea 3"],
  "themes": ["theme1", "theme2", "theme3"],
  "tone": "one of: reflective | energetic | analytical | uncertain | confident | creative | frustrated | hopeful",
  "summary": "1–2 sentence summary of what the note is about"
}`,
            },
          ],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const result = JSON.parse(extractJSON(raw));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Image analysis error:", err);
    return NextResponse.json({ error: "Image analysis failed" }, { status: 500 });
  }
}
