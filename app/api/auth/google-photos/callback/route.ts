import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`);
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-photos/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID     ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokens.error_description ?? "Token exchange failed");

    const { access_token, refresh_token, expires_in } = tokens;
    const expiry = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error: dbErr } = await supabase.from("persona_profile").upsert({
      user_id:                  user.id,
      google_access_token:      access_token,
      google_refresh_token:     refresh_token ?? null,
      google_token_expiry:      expiry,
      google_photos_connected:  true,
    }, { onConflict: "user_id" });

    if (dbErr) throw dbErr;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=true`);
  } catch (err) {
    console.error("Google Photos callback error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_token_failed`);
  }
}
