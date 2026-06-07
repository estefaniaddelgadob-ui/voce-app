import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const requestUrl  = new URL(request.url);
  const baseUrl     = `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/google-photos/callback`;

  console.log("[oauth] baseUrl:", baseUrl);
  console.log("[oauth] redirectUri:", redirectUri);
  console.log("[oauth] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.slice(0, 30) + "...");

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
  }

  // Get current user to encode userId in the state param.
  // The callback receives no session cookie, so state is the only
  // way to know which user to save tokens for.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64");

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/photoslibrary.readonly",
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
