import { SupabaseClient } from "@supabase/supabase-js";

interface TokenProfile {
  google_access_token:  string;
  google_refresh_token: string | null;
  google_token_expiry:  string | null;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error("[token] refresh failed:", data.error, data.error_description);
    return null;
  }
  return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 };
}

// Returns a valid (possibly freshly refreshed) access token.
// Saves the new token + expiry to persona_profile if a refresh happened.
export async function getFreshGoogleToken(
  admin:   SupabaseClient,
  userId:  string,
  profile: TokenProfile,
): Promise<string> {
  const { google_access_token, google_refresh_token, google_token_expiry } = profile;

  // Consider token expired 5 minutes before actual expiry to avoid edge-case failures
  const isExpired = google_token_expiry
    ? Date.now() > new Date(google_token_expiry).getTime() - 5 * 60 * 1000
    : false;

  console.log("[token] expired:", isExpired, "| expiry:", google_token_expiry ?? "unknown");

  if (!isExpired) return google_access_token;

  if (!google_refresh_token) {
    console.warn("[token] token expired but no refresh_token stored — using stale token");
    return google_access_token;
  }

  const refreshed = await refreshAccessToken(google_refresh_token);
  console.log("[token] refreshed successfully:", !!refreshed);

  if (!refreshed) return google_access_token; // fallback to stale on refresh failure

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await admin.from("persona_profile").update({
    google_access_token: refreshed.access_token,
    google_token_expiry: newExpiry,
  }).eq("user_id", userId);

  console.log("[token] new expiry saved:", newExpiry);
  return refreshed.access_token;
}
