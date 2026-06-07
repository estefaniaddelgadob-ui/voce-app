import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://voce-app.vercel.app";

const REDIRECT_URI = `${APP_URL}/api/auth/google-photos/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code       = searchParams.get("code");
  const googleErr  = searchParams.get("error");

  if (googleErr || !code) {
    console.error("Google Photos OAuth denied:", googleErr);
    return NextResponse.redirect(`${APP_URL}/settings?error=google_auth_failed`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID     ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", JSON.stringify(tokens));
      return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
    }

    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token) {
      console.error("No access_token in Google response:", JSON.stringify(tokens));
      return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
    }

    const expiry = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("Google Photos callback: no authenticated user — session may not be readable in this route");
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
      console.error("Google Photos DB upsert failed:", dbErr.message);
      return NextResponse.redirect(`${APP_URL}/settings?error=google_db_failed`);
    }

    return NextResponse.redirect(`${APP_URL}/settings?connected=true`);
  } catch (err) {
    console.error("Google Photos callback unexpected error:", err);
    return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
  }
}
