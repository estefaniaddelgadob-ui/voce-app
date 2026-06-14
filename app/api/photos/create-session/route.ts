import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await admin
      .from("persona_profile")
      .select("google_access_token")
      .eq("user_id", user.id)
      .single();

    if (!profile?.google_access_token) {
      return NextResponse.json(
        { error: "Google Photos not connected — connect in Settings first" },
        { status: 400 }
      );
    }

    const res = await fetch("https://photospicker.googleapis.com/v1/sessions", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${profile.google_access_token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    const data = await res.json();
    console.log("[picker/create-session] status:", res.status, "id:", data.id);

    if (!res.ok) {
      const msg = data.error?.message ?? data.error?.status ?? "Failed to create picker session";
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    // pollingConfig.pollInterval is a duration string like "2s" — convert to ms
    const rawInterval = data.pollingConfig?.pollInterval ?? "2s";
    const pollIntervalMs = Math.round(parseFloat(rawInterval) * 1000) || 2000;

    return NextResponse.json({
      sessionId:      data.id,
      pickerUri:      data.pickerUri,
      pollIntervalMs,
    });
  } catch (err) {
    console.error("[picker/create-session] error:", err);
    return NextResponse.json({ error: "Failed to create picker session" }, { status: 500 });
  }
}
