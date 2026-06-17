import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getFreshGoogleToken } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await admin
      .from("persona_profile")
      .select("google_access_token, google_refresh_token, google_token_expiry")
      .eq("user_id", user.id)
      .single();

    if (!profile?.google_access_token) {
      return NextResponse.json({ error: "Google Photos not connected" }, { status: 400 });
    }

    const token = await getFreshGoogleToken(admin, user.id, profile);

    // Check if the user has finished selecting
    const sessionRes = await fetch(
      `https://photospicker.googleapis.com/v1/sessions/${sessionId}`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );
    const sessionData = await sessionRes.json();

    if (!sessionRes.ok) {
      const msg = sessionData.error?.message ?? "Session check failed";
      return NextResponse.json({ error: msg }, { status: sessionRes.status });
    }

    // mediaItemsSet is the boolean that indicates the user finished selecting
    if (!sessionData.mediaItemsSet) {
      return NextResponse.json({ ready: false, items: [] });
    }

    // User finished — fetch selected items
    const itemsRes = await fetch(
      `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );
    const itemsData = await itemsRes.json();
    console.log("[picker/get-selected] items:", itemsData.mediaItems?.length ?? 0);

    // Clean up session
    await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      method:  "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    }).catch(() => {}); // silent — session may already be expired

    // Google Photos Picker API nests baseUrl/mimeType inside mediaFile, not at item root
    console.log("[picker/get-selected] first raw item:", JSON.stringify(itemsData.mediaItems?.[0]).slice(0, 300));

    const items = (itemsData.mediaItems ?? []).map((item: {
      id: string;
      type?: string;  // "PHOTO" | "VIDEO" (may also be lowercase or absent)
      mediaFile?: {
        baseUrl?: string;
        mimeType?: string;
      };
    }) => {
      const baseUrl  = item.mediaFile?.baseUrl ?? "";
      const mimeType = item.mediaFile?.mimeType ?? "";
      // Derive type from both the enum field AND mimeType for robustness
      const rawType  = (item.type ?? "").toUpperCase();
      const isVideo  = rawType === "VIDEO" || mimeType.toLowerCase().startsWith("video/");
      const type     = isVideo ? "video" : "photo";
      const mime     = mimeType || (isVideo ? "video/mp4" : "image/jpeg");
      console.log("[thumbnail-debug] id:", item.id.slice(0, 12), "| rawType:", item.type, "| mimeType:", mimeType, "| resolved:", type, "| baseUrl:", !!baseUrl);
      return { id: item.id, baseUrl, mimeType: mime, type };
    });

    return NextResponse.json({ ready: true, items });
  } catch (err) {
    console.error("[picker/get-selected] error:", err);
    return NextResponse.json({ error: "Failed to get selected items" }, { status: 500 });
  }
}
