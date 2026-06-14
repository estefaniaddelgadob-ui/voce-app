import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PRODUCTION_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://echoooo.app";

export async function GET(request: Request) {
  const url        = new URL(request.url);
  const baseUrl    = `${url.protocol}//${url.host}`;
  // Must exactly match the redirect_uri sent in the OAuth initiation step
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-photos/callback`
    : "https://echoooo.app/api/auth/google-photos/callback";
  const APP_URL    = PRODUCTION_URL;

  console.log("[callback] redirectUri used:", redirectUri);

  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  console.log("[callback] baseUrl:", baseUrl);
  console.log("[callback] redirectUri:", redirectUri);

  // Step 1 - log everything received
  console.log("[callback] received:", {
    code:  !!code,
    state: !!state,
    error,
    url: request.url,
  });

  // If Google returned an error
  if (error) {
    console.error("[callback] Google error:", error);
    return NextResponse.redirect(`${APP_URL}/settings?error=${error}`);
  }

  // If no code received
  if (!code) {
    console.error("[callback] No code received");
    return NextResponse.redirect(`${APP_URL}/settings?error=no_code`);
  }

  // Step 2 - exchange code for tokens
  console.log("[callback] exchanging code for tokens...");

  const clientId      = process.env.GOOGLE_CLIENT_ID;
  const clientSecret  = process.env.GOOGLE_CLIENT_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl   = process.env.NEXT_PUBLIC_SUPABASE_URL;

  console.log("[callback] env check:", {
    hasClientId:     !!clientId,
    hasClientSecret: !!clientSecret,
    hasServiceRole:  !!serviceRoleKey,
    hasSupabaseUrl:  !!supabaseUrl,
    clientIdStart:   clientId?.slice(0, 20),
  });

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId!,
        client_secret: clientSecret!,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    console.log("[callback] token response status:", tokenRes.status);
    console.log("[callback] token data:", JSON.stringify(tokenData));

    if (!tokenRes.ok) {
      console.error("[callback] token exchange failed:", tokenData);
      return NextResponse.redirect(
        `${APP_URL}/settings?error=token_failed&detail=${tokenData.error}`
      );
    }

    // Step 3 - decode state to get userId
    console.log("[callback] decoding state...");
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state!, "base64").toString());
      userId = decoded.userId;
      console.log("[callback] userId:", userId);
      if (!userId) throw new Error("userId missing from state");
    } catch (decodeErr) {
      console.error("[callback] failed to decode state:", decodeErr);
      return NextResponse.redirect(`${APP_URL}/settings?error=invalid_state`);
    }

    // Step 4 - save tokens to Supabase
    console.log("[callback] saving tokens to Supabase...");

    const supabase = createClient(supabaseUrl!, serviceRoleKey!);
    const expiry   = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();

    const { error: dbErr } = await supabase.from("persona_profile").upsert({
      user_id:                 userId,
      google_access_token:     tokenData.access_token,
      google_refresh_token:    tokenData.refresh_token ?? null,
      google_token_expiry:     expiry,
      google_photos_connected: true,
    }, { onConflict: "user_id" });

    if (dbErr) {
      console.error("[callback] DB save failed:", dbErr.message, dbErr.details);
      return NextResponse.redirect(`${APP_URL}/settings?error=db_failed`);
    }

    // Step 5 - verify save
    const { data: saved } = await supabase
      .from("persona_profile")
      .select("google_photos_connected, google_access_token")
      .eq("user_id", userId)
      .single();

    console.log("[callback] verify save:", {
      google_photos_connected: saved?.google_photos_connected,
      hasAccessToken:          !!saved?.google_access_token,
    });

    console.log("[callback] SUCCESS — redirecting to settings");
    return NextResponse.redirect(`${APP_URL}/settings?connected=true`);

  } catch (err) {
    console.error("[callback] unexpected error:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(`${APP_URL}/settings?error=unexpected`);
  }
}
