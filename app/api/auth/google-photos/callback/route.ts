import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? "https://voce-app.vercel.app";
const REDIRECT_URI = `${APP_URL}/api/auth/google-photos/callback`;

// Admin client bypasses RLS — needed because there is no user session in this
// server route (Google redirects here without carrying Supabase cookies).
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not configured");
  return createSupabaseAdmin(url, key);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code      = searchParams.get("code");
  const googleErr = searchParams.get("error");
  const state     = searchParams.get("state");

  console.log("[callback] APP_URL:", APP_URL);
  console.log("[callback] REDIRECT_URI:", REDIRECT_URI);
  console.log("[callback] code present:", !!code, "| state present:", !!state);
  console.log("[callback] google error param:", googleErr);

  if (googleErr || !code) {
    console.error("[callback] Denied by Google:", googleErr);
    return NextResponse.redirect(`${APP_URL}/settings?error=google_auth_failed`);
  }

  // Decode userId from state param
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state ?? "", "base64").toString());
    userId = decoded.userId;
    console.log("[callback] Decoded userId from state:", userId);
    if (!userId) throw new Error("userId missing from state");
  } catch (err) {
    console.error("[callback] Failed to decode state param:", err);
    return NextResponse.redirect(`${APP_URL}/settings?error=google_auth_failed`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code:          code as string,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    console.log("Token exchange status:", tokenResponse.status);
    console.log("Token exchange response:", JSON.stringify(tokenData));
    console.log("Redirect URI used:", REDIRECT_URI);
    console.log("Client ID used:", process.env.GOOGLE_CLIENT_ID?.slice(0, 40));

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    console.log("[callback] access_token present:", !!access_token, "| refresh_token present:", !!refresh_token);

    if (!access_token) {
      console.error("[callback] No access_token in response:", JSON.stringify(tokenData));
      return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
    }

    const expiry = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

    // Use admin client — no session cookie needed
    const admin = getAdminClient();
    const { error: dbErr } = await admin.from("persona_profile").upsert({
      user_id:                 userId,
      google_access_token:     access_token,
      google_refresh_token:    refresh_token ?? null,
      google_token_expiry:     expiry,
      google_photos_connected: true,
    }, { onConflict: "user_id" });

    if (dbErr) {
      console.error("[callback] DB upsert failed:", dbErr.message, dbErr.details, dbErr.hint);
      return NextResponse.redirect(`${APP_URL}/settings?error=google_db_failed`);
    }

    console.log("[callback] Success — tokens saved for userId:", userId);
    return NextResponse.redirect(`${APP_URL}/settings?connected=true`);
  } catch (err) {
    console.error("[callback] Unexpected error:", err instanceof Error ? err.message : String(err));
    console.error("[callback] Stack:", err instanceof Error ? err.stack : "no stack");
    return NextResponse.redirect(`${APP_URL}/settings?error=google_token_failed`);
  }
}
