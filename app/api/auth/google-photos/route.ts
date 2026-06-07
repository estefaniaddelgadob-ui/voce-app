import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

// Must exactly match what is registered in Google Cloud Console
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-photos/callback`
  : "https://voce-app.vercel.app/api/auth/google-photos/callback";

export async function GET() {
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.slice(0, 30) + "...");
  console.log("REDIRECT_URI:", REDIRECT_URI);

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
  }

  // Get current user so we can pass their ID through the OAuth state param.
  // The callback has no Supabase session (Google redirects without cookies),
  // so this is the only way to know which user to save tokens for.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://voce-app.vercel.app"}/login`
    );
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64");

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/photoslibrary.readonly",
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
