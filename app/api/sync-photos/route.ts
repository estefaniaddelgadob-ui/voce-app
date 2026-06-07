import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    console.log("[sync-photos] getUser:", user?.id ?? "null", userErr?.message ?? "");
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Fetch tokens from persona_profile
    const { data: profile, error: profileErr } = await supabase
      .from("persona_profile")
      .select("google_access_token, google_refresh_token, google_token_expiry")
      .eq("user_id", user.id)
      .single();

    console.log("[sync-photos] profile:", {
      hasAccessToken:  !!profile?.google_access_token,
      hasRefreshToken: !!profile?.google_refresh_token,
      expiry:          profile?.google_token_expiry,
      profileErr:      profileErr?.message ?? null,
    });

    if (profileErr || !profile?.google_access_token) {
      return NextResponse.json({ error: "Google Photos not connected" }, { status: 400 });
    }

    let accessToken = profile.google_access_token;

    // Refresh access token if expired
    if (profile.google_token_expiry && new Date(profile.google_token_expiry) < new Date()) {
      console.log("[sync-photos] token expired — refreshing...");
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type:    "refresh_token",
          refresh_token: profile.google_refresh_token ?? "",
          client_id:     process.env.GOOGLE_CLIENT_ID     ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
      });
      const refreshed = await refreshRes.json();
      console.log("[sync-photos] refresh status:", refreshRes.status, refreshed.error ?? "ok");
      if (!refreshRes.ok) {
        return NextResponse.json({ error: "Token refresh failed", detail: refreshed.error }, { status: 400 });
      }
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
      await supabase.from("persona_profile")
        .update({ google_access_token: accessToken, google_token_expiry: newExpiry })
        .eq("user_id", user.id);
    }

    // Fetch up to 500 items from Google Photos API
    console.log("[sync-photos] fetching photos from Google...");
    const allItems: { id: string; baseUrl: string; mediaMetadata: { creationTime: string; video?: object } }[] = [];
    let pageToken: string | null = null;

    while (allItems.length < 500) {
      const body: Record<string, unknown> = {
        pageSize: 100,
        filters:  { mediaTypeFilter: { mediaTypes: ["PHOTO", "VIDEO"] } },
      };
      if (pageToken) body.pageToken = pageToken;

      const res = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
        method:  "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("[sync-photos] Google Photos API error:", res.status, errBody);
        break;
      }

      const json     = await res.json();
      const items    = json.mediaItems ?? [];
      allItems.push(...items);
      pageToken = json.nextPageToken ?? null;
      if (!pageToken || items.length === 0) break;
    }

    console.log("[sync-photos] fetched", allItems.length, "items from Google");
    if (allItems.length === 0) return NextResponse.json({ synced: 0 });

    // Upsert into photo_library
    const rows = allItems.map(item => ({
      user_id:         user.id,
      google_photo_id: item.id,
      url:             item.baseUrl,
      taken_at:        item.mediaMetadata?.creationTime ?? null,
      type:            item.mediaMetadata?.video ? "video" : "photo",
    }));

    const { error: upsertErr } = await supabase
      .from("photo_library")
      .upsert(rows, { onConflict: "user_id,google_photo_id" });

    if (upsertErr) {
      console.error("[sync-photos] upsert error:", upsertErr.message);
      throw upsertErr;
    }

    await supabase.from("persona_profile")
      .update({ google_photos_last_synced: new Date().toISOString() })
      .eq("user_id", user.id);

    console.log("[sync-photos] done — synced", rows.length, "items");
    return NextResponse.json({ synced: rows.length });
  } catch (err) {
    console.error("[sync-photos] unexpected error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
