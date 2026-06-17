import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getFreshGoogleToken } from "@/lib/google-auth";

const extractJSON = (text: string): string =>
  text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

const safeParseJSON = (text: string) => {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const lastObj = text.lastIndexOf('{"mediaIndex"');
  if (lastObj !== -1) {
    try { return JSON.parse(text.slice(0, lastObj) + "]}"); } catch { /* fall through */ }
  }
  throw new Error("Could not parse match-media response as JSON");
};

const SYSTEM_PROMPT = `You are a world-class cinematic content director with 20+ years in filmmaking, advertising and viral social media storytelling.

You have been given actual photos the creator selected, alongside their Instagram content. Study each photo carefully — the specific visual content, mood, and subject matter must inform your creative direction.

Your task:
- Look at each photo and identify what is actually in it (people, setting, mood, action, emotion)
- Match each photo to the specific line or moment in the content it best serves
- Explain WHY this visual works — reference what you actually see in the photo
- Think like a creative director: which photo stops the scroll? Which creates curiosity? Which delivers the emotional payoff?

Return ONLY valid JSON — no markdown, no explanation.`;

async function fetchImageBase64(url: string, token: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) { console.warn("[match-media] image fetch returned:", res.status, "for url:", url.slice(0, 60)); return null; }
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const mediaType = ct.split(";")[0].trim();
    if (!mediaType.startsWith("image/")) { console.warn("[match-media] non-image content-type:", mediaType); return null; }
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return { data, mediaType };
  } catch (err) {
    console.warn("[match-media] image fetch error:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { caption, contentType, photos } = await request.json();
    if (!caption?.trim() || !photos?.length) {
      return NextResponse.json({ error: "caption and photos required" }, { status: 400 });
    }

    type Photo = { id: string; type: string; mimeType?: string; baseUrl?: string };
    const photoArr = (photos as Photo[]).slice(0, 10);

    // Authenticate to get Google access token for vision fetches
    let googleToken: string | null = null;
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (n) => cookieStore.get(n)?.value } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: profile } = await admin
          .from("persona_profile")
          .select("google_access_token, google_refresh_token, google_token_expiry")
          .eq("user_id", user.id).single();
        if (profile?.google_access_token) {
          googleToken = await getFreshGoogleToken(admin, user.id, profile);
        }
      }
    } catch (err) {
      console.warn("[match-media] could not get Google token, will match without vision:", err);
    }

    // Fetch photos as base64 in parallel (photos only — videos can't be rendered as images)
    const imageResults = await Promise.all(
      photoArr.map(async (p, i) => {
        if (!googleToken || p.type === "video" || !p.baseUrl) return null;
        const result = await fetchImageBase64(`${p.baseUrl}=w400-h400-c`, googleToken);
        console.log(`[match-media] photo ${i} | fetched: ${!!result} | type: ${p.type}`);
        return result;
      })
    );

    const fetchedCount = imageResults.filter(Boolean).length;
    const hasVision = fetchedCount > 0;
    console.log(`[match-media] vision: ${hasVision} | images fetched: ${fetchedCount}/${photoArr.length} | google token: ${!!googleToken}`);

    // Build Claude message content — images first, then text
    type ImgBlock  = { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } };
    type TextBlock = { type: "text"; text: string };
    const contentBlocks: Array<ImgBlock | TextBlock> = [];

    // Track which photo index maps to which image block
    const photoToBlockIdx = new Map<number, number>();
    imageResults.forEach((result, i) => {
      if (!result) return;
      photoToBlockIdx.set(i, contentBlocks.length);
      contentBlocks.push({
        type:   "image",
        source: {
          type:        "base64",
          media_type:  (result.mediaType.startsWith("image/") ? result.mediaType : "image/jpeg") as ImgBlock["source"]["media_type"],
          data:        result.data,
        },
      });
    });

    // Build the photo inventory text
    const photoInventory = photoArr.map((p, i) => {
      if (p.type === "video") return `Photo ${i}: 📹 VIDEO CLIP`;
      if (photoToBlockIdx.has(i)) return `Photo ${i}: 📷 IMAGE shown above — study what is actually in this photo`;
      return `Photo ${i}: 📷 PHOTO (image unavailable — match based on position and context)`;
    }).join("\n");

    contentBlocks.push({
      type: "text",
      text: `${hasVision ? "Study the photos shown above carefully. The actual visual content of each photo is what makes or breaks the match.\n\n" : ""}Content type: ${contentType}

Caption / Script:
${caption}

Creator's selected media (${photoArr.length} item${photoArr.length !== 1 ? "s" : ""}):
${photoInventory}

${hasVision ? "For each photo you can see: describe what you notice in it, then explain why that specific visual content serves a particular moment in the text. Be concrete — 'this photo shows X, which mirrors the line about Y'." : "Match each item to the most emotionally resonant moment in the content."}

Return JSON:
{
  "mediaplan": [
    {
      "mediaIndex": 0,
      "role": "Hero image / Opening frame / Closing shot / Slide 2 / etc",
      "matchesMoment": "the specific line or moment in the content this visual matches",
      "whyItWorks": "creative reason referencing what is actually in the photo (1-2 sentences)",
      "howToUse": "specific instructions — placement, timing, crop",
      "editingSuggestion": "text overlay suggestion, color grade, crop ratio"
    }
  ]
}`,
    });

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: contentBlocks }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "{}";
    console.log("[match-media] response length:", rawText.length, "| tail:", rawText.slice(-200));
    const parsed = safeParseJSON(extractJSON(rawText));
    console.log("[match-media] parsed plan items:", parsed?.mediaplan?.length ?? 0);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[match-media] error:", msg);
    return NextResponse.json({ error: `Media matching failed: ${msg}` }, { status: 500 });
  }
}
