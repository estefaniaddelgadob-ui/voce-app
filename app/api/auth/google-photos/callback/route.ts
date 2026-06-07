import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? "https://voce-app.vercel.app";
const REDIRECT_URI = `${APP_URL}/api/auth/google-photos/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code      = searchParams.get("code");
  const googleErr = searchParams.get("error");

  console.log("[callback] APP_URL:", APP_URL);
  console.log("[callback] REDIRECT_URI being sent to token endpoint:", REDIRECT_URI);
  console.log("[callback] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.slice(0, 40) + "...");
  console.log("[callback] GOOGLE_CLIENT_SECRET set:", !!process.env.GOOGLE_CLIENT_SECRET);
  console.log("[callback] code present:", !!code, "| code prefix:", code?.slice(0, 20));
  console.log("[callback] google error param:", googleErr);

  if (googleErr || !code) {
    console.error("[callback] Denied by Google — googleErr:", googleErr);
    return NextResponse.redirect(`${APP_URL}/settings?error=google_auth_failed`);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code:          code as string,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  process.env.NEXT_PUBLIC_APP_URL + "/api/auth/google-photos/callback",
        grant_type:    "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    // Log everything so we can see the exact error
    console.log("Token exchange status:", tokenResponse.status);
    console.log("Token exchange response:", JSON.stringify(tokenData));
    console.log("Redirect URI used:", process.env.NEXT_PUBLIC_APP_URL + "/api/auth/google-photos/callback");
    console.log("Client ID used:", process.env.GOOGLE_CLIENT_ID?.slice(0, 40));

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(process.env.NEXT_PUBLIC_APP_URL + "/settings?error=google_auth_failed");
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    console.log("[callback] access_token present:", !!access_token, "| refresh_token present:", !!refresh_token);

    if (!access_token) {
      console.error("[callback] No access_token in response — full tokenData:", JSON.stringify(tokenData));
      return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
    }

    const expiry = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

    const supabase = createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    console.log("[callback] Supabase getUser — user id:", user?.id ?? "null", "| error:", userErr?.message ?? "none");

    if (!user) {
      console.error("[callback] No authenticated user — cannot save tokens. userErr:", userErr?.message);
      return NextResponse.redirect(`${APP_URL}/settings?error=google_auth_failed`);
    }

    const { error: dbErr } = await supabase.from("persona_profile").upsert({
      user_id:                 user.id,
      google_access_token:     access_token,
      google_refresh_token:    refresh_token ?? null,
      google_token_expiry:     expiry,
      google_photos_connected: true,
    }, { onConflict: "user_id" });

    if (dbErr) {
      console.error("[callback] DB upsert failed:", dbErr.message, dbErr.details, dbErr.hint);
      return NextResponse.redirect(`${APP_URL}/settings?error=google_db_failed`);
    }

    console.log("[callback] Success — redirecting to /settings?connected=true");
    return NextResponse.redirect(`${APP_URL}/settings?connected=true`);
  } catch (err) {
    console.error("[callback] Unexpected exception:", err instanceof Error ? err.message : String(err));
    console.error("[callback] Stack:", err instanceof Error ? err.stack : "no stack");
    return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
  }
}
