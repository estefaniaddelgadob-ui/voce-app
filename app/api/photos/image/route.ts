import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getFreshGoogleToken } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoUrl = searchParams.get("url");
    const size     = searchParams.get("size") ?? "w300-h300-c";

    if (!photoUrl) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Not authenticated", { status: 401 });

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
      return new NextResponse("Google Photos not connected", { status: 400 });
    }

    const token     = await getFreshGoogleToken(admin, user.id, profile);
    const googleUrl = `${photoUrl}=${size}`;

    console.log("[thumbnails] fetching image | token present:", !!token, "| size:", size);

    const imgRes = await fetch(googleUrl, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    console.log("[thumbnails] Google response status:", imgRes.status, "| content-type:", imgRes.headers.get("content-type"));

    if (!imgRes.ok) {
      console.error("[thumbnails] Google Photos returned error:", imgRes.status, "for url:", photoUrl.slice(0, 60));
      return new NextResponse(`Google Photos returned ${imgRes.status}`, { status: imgRes.status });
    }

    const bytes       = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(bytes, {
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[thumbnails] error:", err);
    return new NextResponse("Failed to fetch image", { status: 500 });
  }
}
