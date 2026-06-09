import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

const SYSTEM_PROMPT = `You are a ghostwriter who has studied this creator deeply. Your job is to write content that sounds exactly like them AND performs well on Instagram.

BALANCE:
- 70% their authentic voice — vocabulary, rhythm, energy, raw thoughts
- 30% smart structure — hooks that stop scrolls, CTAs that drive saves and shares

VOICE COMES FIRST:
Study their voice notes carefully. Use their actual words, phrases and rhythm.
If they're bilingual, mix languages naturally.
Raw and real always beats polished and generic.
Write what ONLY THIS PERSON could have written.

STRUCTURE (apply invisibly, not mechanically):

Hook (first 10-12 words): must stop the scroll.
Use their natural voice to create:
- A bold truth they actually believe
- A pattern interrupt using their real words
- A curiosity gap about something they know
Never use generic hooks like "Here are X tips" or "How to..."

Body: one sentence per line.
Tell their story with tension before resolution.
Make the reader feel seen.

CTA: drive saves and shares specifically:
"Save this for when you need it"
"Send this to someone who..."
"Comment [word] if this resonates"

HASHTAGS: exactly 3-5, niche-specific only.
Instagram hard limit is 5 — no more, no duplicates.
No generic hashtags (#motivation #life #love #inspiration).

Return ONLY valid JSON — no markdown, no code blocks, no explanation:
{"variations":[{"id":1,"hook":"first 10-12 words only","body":"body text with line breaks","cta":"cta text only","full_caption":"hook + blank line + body + blank line + cta + blank line + hashtags joined by space","hashtags":["#nicheTag1","#nicheTag2","#nicheTag3"]}]}`;

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const {
      topic, persona, audience, thoughtNotes,
      contentType, length, variations, toneOverride, feedbackContext, dateContext, mediaType,
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
      persona.instagram_handle        ? `INSTAGRAM HANDLE: @${persona.instagram_handle}` : "",
      persona.instagram_growth_handle ? `GROWTH ACCOUNT: @${persona.instagram_growth_handle}` : "",
      persona.niche                   ? `NICHE: ${persona.niche}` : "",
      persona.audience                ? `TARGET AUDIENCE: ${persona.audience}` : "",
      (persona.transformation_before || persona.transformation_after)
        ? `TRANSFORMATION: Before — ${persona.transformation_before || "not specified"} → After — ${persona.transformation_after || "not specified"}` : "",
      (persona.tone_words as string[] | undefined)?.length
        ? `TONE: ${(persona.tone_words as string[]).join(", ")}` : "",
      persona.tone_description        ? `IN THEIR OWN WORDS THEIR TONE IS: ${persona.tone_description}` : "",
      persona.beliefs                 ? `BELIEFS: ${persona.beliefs}` : "",
      persona.recurring_themes        ? `RECURRING THEMES: ${persona.recurring_themes}` : "",
      persona.pushback                ? `PUSHBACK (what they stand against): ${persona.pushback}` : "",
      persona.never_say               ? `NEVER USE THESE WORDS: ${persona.never_say}` : "",
      persona.style_fingerprint       ? `AI STYLE FINGERPRINT:\n${persona.style_fingerprint}` : "",
    ].filter(Boolean).join("\n");

    const samplesBlock = (persona.sample_captions as string[])?.filter(Boolean).length > 0
      ? `\nSAMPLE CAPTIONS (mirror this voice exactly):\n${(persona.sample_captions as string[])
          .filter(Boolean).map((c: string, i: number) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

    const refsBlock = (() => {
      const refs = (persona.reference_accounts as Array<{ handle: string; whatLike: string }> ?? [])
        .filter((r: { handle: string }) => r.handle?.trim());
      if (refs.length === 0) return "";
      const list = refs
        .map((r: { handle: string; whatLike: string }) => `  @${r.handle}${r.whatLike ? ` — ${r.whatLike}` : ""}`)
        .join("\n");
      return `\nSTYLE REFERENCES — accounts this creator admires (use as calibration, never copy):\n${list}\n\nFor each account you recognise, use your knowledge of their style, tone, energy and content structure as calibration points. What makes their content feel authentic? How do they open posts? How do they close? Channel that same energy into this creator's unique voice — never copy, always calibrate.`;
    })();

    type ThoughtNote = { title?: string; transcript?: string; ideas?: string; standout_phrases?: string; themes?: string; created_at?: string; };
    const notes = thoughtNotes as ThoughtNote[];
    const notesBlock = notes.length > 0
      ? notes.map((n, i) => {
          const dateStr = n.created_at ? ` [${new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}]` : "";
          const parts: string[] = [`Note ${i + 1}${dateStr}:`];
          if (n.transcript) parts.push(`Transcript: ${n.transcript}`);
          if (n.ideas) parts.push(`Key ideas: ${n.ideas}`);
          if (n.standout_phrases) parts.push(`Their exact phrases: ${n.standout_phrases}`);
          if (n.themes) parts.push(`Themes: ${n.themes}`);
          if (!n.transcript && !n.ideas && n.title) parts.push(`Title: ${n.title}`);
          return parts.length > 1 ? parts.join("\n") : "";
        }).filter(Boolean).join("\n\n")
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

    const lengthInstruction = (() => {
      if (contentType === "instagram_caption") {
        if (length === "extra_short") return "\nWrite 30-50 words for the caption body. Not including hashtags. Minimum 30 words, maximum 50 words. One single punchy thought.";
        if (length === "short")  return "\nWrite 80-100 words for the caption body. Not including hashtags. Minimum 80 words, maximum 100 words.";
        if (length === "medium") return "\nWrite 150-200 words for the caption body. Not including hashtags. Minimum 150 words, maximum 200 words.";
        if (length === "long")   return "\nWrite 250-300 words for the caption body. Not including hashtags. Minimum 250 words, maximum 300 words.";
      }
      if (contentType === "carousel_script") {
        if (length === "3")  return "\nSTRICT LIMIT: 40 words per slide maximum. 3 slides total. One clear idea per slide.";
        if (length === "5")  return "\nSTRICT LIMIT: 30 words per slide maximum. 5 slides total. One clear idea per slide.";
        if (length === "7")  return "\nSTRICT LIMIT: 25 words per slide maximum. 7 slides total. One clear idea per slide.";
        if (length === "10") return "\nSTRICT LIMIT: 20 words per slide maximum. 10 slides total. One clear idea per slide.";
        return "\nSTRICT LIMIT: Maximum 30 words per slide. One clear idea per slide.";
      }
      if (contentType === "reel_script") {
        if (length === "7s")  return "\nSTRICT LIMIT: 15-20 words MAXIMUM. This is spoken aloud at natural pace. One single punchy statement only. No hook label, no section labels — just the words to speak.";
        if (length === "15s") return "\nSTRICT LIMIT: 35-40 words MAXIMUM. This is spoken aloud at natural pace. Hook (1 sentence) + one key point + CTA. No section labels — just the words to speak.";
        if (length === "30s") return "\nSTRICT LIMIT: 70-80 words MAXIMUM. This is spoken aloud at natural pace. Hook + 2 points + CTA. No section labels — just the words to speak.";
        if (length === "60s") return "\nSTRICT LIMIT: 140-160 words MAXIMUM. This is spoken aloud at natural pace. Hook + 3-4 points + CTA. No section labels — just the words to speak.";
      }
      if (contentType === "story_sequence") return "\nSTRICT LIMIT: Maximum 20 words per story frame. Keep it visual and minimal.";
      return "";
    })();

    // FIX 7: never_say goes into the system prompt so it is enforced at the model level
    const neverSayInstruction = persona.never_say?.trim()
      ? `\n\nBANNED WORDS/PHRASES — never use these under any circumstances: ${persona.never_say}\n\nBefore finalising your response, scan every line for these banned words. If any appear, rewrite that section.`
      : "";

    const dynamicSystem = SYSTEM_PROMPT + neverSayInstruction;

    const mediaTypeNote = mediaType && mediaType !== "both"
      ? `\nMedia preference: ${mediaType === "photos" ? "suggest image descriptions only — no video clips" : "suggest video clip descriptions only — no static images"}`
      : "";

    console.log("[prompt] persona fields:", {
      hasStyleFingerprint: !!persona?.style_fingerprint,
      hasNiche: !!persona?.niche,
      hasTone: !!(persona?.tone_words?.length),
      hasBeliefs: !!persona?.beliefs,
      hasNeverSay: !!persona?.never_say,
      notesCount: notes.length,
      firstNotePreview: notes[0]?.transcript?.slice(0, 100),
    });

    const userMessage = `Creator persona:
${personaBlock}
${samplesBlock}${refsBlock}

VOICE NOTES AND THOUGHTS FROM THIS CREATOR
(study these carefully — this is how they actually think and speak):
${notesBlock}

Target audience:
${audienceBlock}

Content type: ${lengthNote}
Topic: ${topic}
Output language: ${persona.output_language || "English"}${toneNote}${feedbackNote}${dateNote}${mediaTypeNote}${lengthInstruction}

Generate ${variations} variation(s). Each must be distinctly different (different angle, hook, or opening). Mirror the creator's exact voice — their rhythm, vocabulary, punctuation. Speak directly to this audience's pain points and dreams.`;

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
      system:     dynamicSystem,
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
