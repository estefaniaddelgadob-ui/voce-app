import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

const CONTENT_TYPE_INSTRUCTIONS: Record<string, string> = {
  instagram_caption: "Write an engaging Instagram caption (100–300 words) with line breaks and a call to action.",
  carousel_script:   "Write a carousel script with 5–7 slide captions (10–20 words each), numbered 1 to N.",
  reel_script:       "Write a short-form video script: HOOK (one punchy sentence), BODY (3–4 key points, each one line), CTA (one sentence). Total ~30–60 seconds when read aloud.",
  story_sequence:    "Write 5–6 Instagram story frames as brief sentences describing each frame's content and text overlay.",
  linkedin_post:     "Write a professional yet personal LinkedIn post (200–400 words) with a clear structure and a closing question or CTA.",
};

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const {
      topic, persona, audience, thoughtNotes,
      contentType, variations, toneOverride, feedbackContext, dateContext,
    } = await request.json();

    // ── Legacy single-generation path (no variations param) ──────────────────
    if (!variations) {
      const samplesBlock = (persona.sample_captions as string[])?.filter(Boolean).length > 0
        ? `\nSAMPLE POSTS (study this voice carefully):\n${(persona.sample_captions as string[])
            .filter(Boolean).map((c: string, i: number) => `[${i + 1}] ${c}`).join("\n\n")}`
        : "";
      const thoughtsBlock = (thoughtNotes as { transcript?: string; title?: string }[]).length > 0
        ? `\nRECENT THOUGHTS:\n${thoughtNotes
            .map((n: { transcript?: string; title?: string }) => `- ${n.transcript || n.title || ""}`)
            .filter(Boolean).join("\n")}`
        : "";
      const fingerprintBlock = persona.style_fingerprint
        ? `\nSTYLE FINGERPRINT:\n${persona.style_fingerprint}`
        : `\nTONE: ${persona.tone || "authentic"}\nSTYLE: ${persona.communication_style || "direct and clear"}`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 1500,
        messages: [{
          role: "user",
          content: `You are ghostwriting for ${persona.display_name || "a content creator"}.
${fingerprintBlock}${samplesBlock}${thoughtsBlock}

AUDIENCE: ${audience.name} — ${audience.who_they_are || audience.description || ""}
Platform: ${audience.primary_platform || (audience.platforms || [])[0] || ""}
Goal: ${audience.content_goal || ""}
Topic: ${topic}

Write a ${(audience.primary_platform || "social media")} post. Return ONLY valid JSON:
{"hook":"...","body":"...","cta":"..."}`,
        }],
      });
      const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
      return NextResponse.json(JSON.parse(extractJSON(raw)));
    }

    // ── New multi-variation path ───────────────────────────────────────────────
    const samplesBlock = (persona.sample_captions as string[])?.filter(Boolean).length > 0
      ? `\nSAMPLE POSTS (study this voice carefully):\n${(persona.sample_captions as string[])
          .filter(Boolean).map((c: string, i: number) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

    const thoughtsBlock = (thoughtNotes as { transcript?: string; title?: string }[]).length > 0
      ? `\nRECENT VOICE NOTES:\n${(thoughtNotes as { transcript?: string; title?: string }[])
          .map(n => `- ${n.transcript || n.title || ""}`).filter(Boolean).join("\n")}`
      : "";

    const fingerprintBlock = persona.style_fingerprint
      ? `\nSTYLE FINGERPRINT:\n${persona.style_fingerprint}`
      : `\nTONE: ${persona.tone || "authentic"}\nSTYLE: ${persona.communication_style || "direct and clear"}`;

    const toneBlock = toneOverride && toneOverride !== "persona"
      ? `\nTONE ADJUSTMENT: Make the content ${toneOverride} compared to your default style.`
      : "";

    const feedbackBlock = feedbackContext
      ? `\nPREVIOUS VERSION FEEDBACK: ${feedbackContext}. Please address these issues in the new version.`
      : "";

    const dateBlock = dateContext
      ? `\nTIMEFRAME CONTEXT: The content should feel relevant to the period ${dateContext}.`
      : "";

    const audienceBlock = [
      `Name: ${audience.name}`,
      audience.description ? `Description: ${audience.description}` : "",
      audience.age_range   ? `Age range: ${audience.age_range}`     : "",
      audience.location    ? `Location: ${audience.location}`        : "",
      audience.pain_points ? `Pain points: ${audience.pain_points}`  : "",
      audience.dreams      ? `Dreams: ${audience.dreams}`            : "",
      (audience.platforms || []).length > 0 ? `Platforms: ${(audience.platforms || []).join(", ")}` : "",
      (audience.tone     || []).length > 0  ? `Preferred tone: ${(audience.tone || []).join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const typeInstruction = CONTENT_TYPE_INSTRUCTIONS[contentType] ??
      "Write an engaging social media post.";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `You are ghostwriting for ${persona.display_name || "a content creator"}.
${fingerprintBlock}
${samplesBlock}
${thoughtsBlock}

AUDIENCE:
${audienceBlock}

TOPIC: ${topic}
CONTENT TYPE: ${contentType.replace(/_/g, " ")}
${toneBlock}${feedbackBlock}${dateBlock}

Generate EXACTLY ${variations} version(s).
Format: ${typeInstruction}

Rules:
- Mirror the creator's exact voice — their rhythm, vocabulary, punctuation
- Speak directly to this audience's pain points and dreams
- Each version must be distinctly different (different angle or opening)
- Write in the OUTPUT LANGUAGE: ${persona.output_language || "English"}

Return ONLY valid JSON — no markdown, no explanation:
{
  "variations": [
    { "id": 1, "content": "..." },
    { "id": 2, "content": "..." }
  ]
}`,
      }],
    });

    const raw  = message.content[0].type === "text" ? message.content[0].text : "{}";
    const data = JSON.parse(extractJSON(raw));
    return NextResponse.json(data);
  } catch (err) {
    console.error("Content generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
