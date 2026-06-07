import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

const SYSTEM_PROMPT = `You are an expert social media strategist and ghostwriter specialising in Instagram content that grows audiences authentically.

You have deep knowledge of:
- What Instagram algorithm rewards in 2026:
  * Saves and shares over likes
  * Strong hooks in first 1-2 lines
  * Reels under 15s for maximum reach
  * Carousels for saves and education
  * Content that creates genuine connection
- Viral content structures:
  * Pattern interrupt hooks
  * Curiosity gaps
  * Transformation stories
  * Controversial but true statements
  * 'Nobody talks about this but...' openers
- Authentic storytelling that builds loyal communities not just followers

Your first job is always to sound exactly like the creator. Algorithm awareness must serve their voice, never replace it. Never make content sound generic or templated.

Return ONLY valid JSON — no markdown, no code blocks, no explanation:
{"variations":[{"id":1,"hook":"...","body":"...","cta":"...","full_caption":"...","hashtags":["#tag1","#tag2"],"algorithm_note":"One sentence explaining why this format works with the current algorithm."}]}`;

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const {
      topic, persona, audience, thoughtNotes,
      contentType, length, variations, toneOverride, feedbackContext, dateContext,
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

    // ── Multi-variation path ──────────────────────────────────────────────────

    const personaBlock = [
      persona.style_fingerprint
        ? `Style fingerprint: ${persona.style_fingerprint}`
        : [
            persona.tone_words?.length ? `Tone: ${persona.tone_words.join(", ")}` : "",
            persona.tone_description   ? `Voice: ${persona.tone_description}` : "",
            persona.beliefs            ? `Beliefs: ${persona.beliefs}` : "",
          ].filter(Boolean).join("\n"),
      persona.niche          ? `Niche: ${persona.niche}` : "",
      persona.recurring_themes ? `Recurring themes: ${persona.recurring_themes}` : "",
      persona.pushback       ? `Pushes back on: ${persona.pushback}` : "",
    ].filter(Boolean).join("\n");

    const samplesBlock = (persona.sample_captions as string[])?.filter(Boolean).length > 0
      ? `\nSAMPLE CAPTIONS (mirror this voice exactly):\n${(persona.sample_captions as string[])
          .filter(Boolean).map((c: string, i: number) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

    const notesBlock = (thoughtNotes as { transcript?: string; title?: string }[]).length > 0
      ? (thoughtNotes as { transcript?: string; title?: string }[])
          .map(n => `- ${n.transcript || n.title || ""}`).filter(Boolean).join("\n")
      : "No recent notes.";

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

    const toneNote = toneOverride && toneOverride !== "persona"
      ? `\nTone override: Make the content ${toneOverride} compared to the creator's default voice.`
      : "";

    const feedbackNote = feedbackContext
      ? `\nFeedback on previous version: ${feedbackContext}. Address these issues.`
      : "";

    const dateNote = dateContext
      ? `\nTimeframe context: ${dateContext}`
      : "";

    const lengthNote = length ? `${contentType.replace(/_/g, " ")} — ${length}` : contentType.replace(/_/g, " ");

    const userMessage = `Creator persona:
${personaBlock}
${samplesBlock}

Recent thoughts and voice notes:
${notesBlock}

Target audience:
${audienceBlock}

Content type: ${lengthNote}
Topic: ${topic}
Output language: ${persona.output_language || "English"}${toneNote}${feedbackNote}${dateNote}

Generate ${variations} variation(s). Each must be distinctly different (different angle, hook, or opening). Mirror the creator's exact voice — their rhythm, vocabulary, punctuation. Speak directly to this audience's pain points and dreams.`;

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userMessage }],
    });

    const raw  = message.content[0].type === "text" ? message.content[0].text : "{}";
    const data = JSON.parse(extractJSON(raw));
    return NextResponse.json(data);
  } catch (err) {
    console.error("Content generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
