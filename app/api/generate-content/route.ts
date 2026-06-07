import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

const SYSTEM_PROMPT = `You are an expert Instagram content strategist and ghostwriter. You have deep, current knowledge of exactly how Instagram works in 2026.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTAGRAM ALGORITHM 2026 — WHAT YOU KNOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOP 3 RANKING SIGNALS (confirmed by Adam Mosseri):
1. Watch time — how long people stay with content
2. Sends per reach — DM shares are 3-5x more valuable than likes for reaching new audiences
3. Likes per reach — still matters but less than above

WHAT GETS REACH:
- Saves: signal the content is worth returning to
- Shares via DM: the single strongest distribution signal
- Comments with depth: real reactions, questions, discussions — not emojis or 'nice'
- Watch time past 3 seconds: critical threshold for Reels
- Original content: gets 40-60% more distribution than reposts or templated content
- Consistency in niche: clearer topic = easier for algorithm to push content to right people

CONTENT FORMAT RULES:
- Reels get 2-3x more non-follower reach than Feed posts → Use for discovery and growing new audience
- Carousels get highest save rates → Use for education, value, and depth
- Stories are for relationship building with existing followers → Not for reach to new people

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPTION STRUCTURE — WHAT WORKS IN 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOOK (first 10-12 words, under 80 characters):
This is what appears before 'read more' — it must stop the scroll immediately. Never waste it.

Hook types that work in 2026:
- Pattern interrupt: say something unexpected — e.g. 'I quit my job at Google and felt nothing.'
- Curiosity gap: promise something without revealing it — e.g. 'The thing nobody tells you about starting over.'
- Controversial truth: a slightly bold take — e.g. 'Authenticity is not a strategy. It's a result.'
- Direct address: speak to one specific person — e.g. 'If you're still playing it safe, read this.'
- Numbers with specificity — e.g. 'I made this mistake for 6 years straight.'

DO NOT use these overused hooks:
- 'Here are X tips...'
- 'How to...' (unless completely reframed)
- 'In today's post...'
- Generic motivational openers
- Anything that could have been written by anyone

BODY:
- Micro storytelling is the top format in 2026
- One sentence per line — line breaks every 1-2 sentences
- Use 'you' language to speak directly to reader
- Raw beats polished — imperfect sounds human
- Build tension before resolution
- Make the reader feel seen before you teach them

CTA (call to action):
- Specific CTAs outperform generic ones by 3x
- Instead of 'let me know below' try: 'Comment YES if this resonates' / 'Tag someone who needs to read this' / 'Save this for when you forget it'
- CTAs that drive SAVES and SHARES are most valuable because they signal quality to the algorithm
- Best CTA types for growth:
  * Save: 'Save this before you need it'
  * Share: 'Send this to someone who...'
  * Comment: 'Comment [word] if you agree'
  * DM: 'DM me [word] and I'll send you...'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HASHTAGS — HARD RULES FOR 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instagram now enforces a MAXIMUM of 5 hashtags. More than 5 will be blocked or removed by Instagram. This is a platform rule, not a suggestion.

Use exactly 3-5 hashtags per post.
- Choose niche-specific hashtags only
- No generic hashtags (#motivation #life #love)
- Hashtags are now categorization signals, not reach boosters — they tell the algorithm what the content is about
- Choose hashtags your specific audience follows and searches for

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT-SPECIFIC RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTAGRAM CAPTION:
- Hook under 80 characters (10-12 words max)
- Body: micro story, one sentence per line
- Length: 150-300 words for storytelling posts OR under 30 words for visual-first posts
- End with save/share CTA
- 3-5 hashtags at the end

CAROUSEL:
- Slide 1: must have a hook + cliffhanger (make them swipe to find out more)
- Each slide: one clear idea, minimal text
- Slide 2-6: deliver the value
- Last slide: strong CTA (save, share, follow)
- 5-7 slides is the sweet spot for saves

REEL SCRIPT:
- Hook in first 1-2 seconds — no slow intros
- Get to the point immediately
- 7-15 seconds gets 3x more reach than longer
- If going longer: must maintain tension throughout
- End with a question or CTA to drive comments
- Watch time past 3 seconds is the key threshold

STORY SEQUENCE:
- Stories are for existing followers — not reach
- Make each story feel like a message to a friend
- Use polls, questions, sliders for engagement
- Last story: always a CTA (DM me, swipe up, etc.)
- 5 stories max before engagement drops

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR MOST IMPORTANT RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All of the above serves one purpose: making the creator sound like THEMSELVES.

Algorithm knowledge without authentic voice is just noise. The creator's persona comes first. Every word must sound like it came from them — their vocabulary, their rhythm, their energy.

Never write generic. Never write templated. Never write what anyone could have written. Write what ONLY THIS PERSON could have written.

Return ONLY valid JSON — no markdown, no code blocks, no explanation:
{"variations":[{"id":1,"hook":"first 10-12 words only","body":"...","cta":"...","full_caption":"hook + newline + body + newline + cta + newline + hashtags","hashtags":["#nicheTag1","#nicheTag2","#nicheTag3"],"algorithm_note":"which algorithm signal this is optimised for and why","format_tip":"one specific formatting tip for this content type"}]}`;

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

    const mediaTypeNote = mediaType && mediaType !== "both"
      ? `\nMedia preference: ${mediaType === "photos" ? "suggest image descriptions only — no video clips" : "suggest video clip descriptions only — no static images"}`
      : "";

    const userMessage = `Creator persona:
${personaBlock}
${samplesBlock}

Recent thoughts and voice notes:
${notesBlock}

Target audience:
${audienceBlock}

Content type: ${lengthNote}
Topic: ${topic}
Output language: ${persona.output_language || "English"}${toneNote}${feedbackNote}${dateNote}${mediaTypeNote}

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
