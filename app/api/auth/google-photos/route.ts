import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

  // createBrowserClient (the default createClient) reads from localStorage —
  // it returns null in API routes. Use createServerClient with cookies instead.
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  console.log("[oauth] getUser result — user:", user?.id ?? "null", "| error:", userErr?.message ?? "none");

  if (!user) {
    console.error("[oauth] No user session — redirecting to login. This means the session cookie was not readable.");
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

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  console.log("[oauth] redirecting to:", authUrl.slice(0, 100));
  console.log("[oauth] redirect_uri:", redirectUri);
  console.log("[oauth] state created:", !!state);
  console.log("[oauth] full auth URL scope:", params.get("scope"));

  return NextResponse.redirect(authUrl);
}
