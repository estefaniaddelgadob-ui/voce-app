"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, Loader2, CheckCircle2, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase";

function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <LogOut className="h-4 w-4" />}
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}

// ── Google Photos section ──────────────────────────────────────────────────────

interface PhotosProfile {
  google_photos_connected: boolean | null;
  google_photos_last_synced: string | null;
}

function GooglePhotosSection() {
  const searchParams = useSearchParams();
  const [profile,  setProfile]  = useState<PhotosProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [actionErr,     setActionErr]     = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnected,  setDisconnected]  = useState(false);

  const justConnected = searchParams.get("connected") === "true";
  const connectError  = searchParams.get("error");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("persona_profile")
          .select("google_photos_connected, google_photos_last_synced")
          .eq("user_id", user.id).single();
        setProfile(data as PhotosProfile ?? null);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDisconnect() {
    setDisconnecting(true); setActionErr(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("persona_profile").update({
        google_access_token:     null,
        google_refresh_token:    null,
        google_token_expiry:     null,
        google_photos_connected: false,
      }).eq("user_id", user.id);
      setProfile(null);
      setDisconnected(true);
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = !disconnected && (profile?.google_photos_connected === true || justConnected);

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white">
      <div className="border-b border-[#E2E2E0] px-6 py-4">
        <h2 className="text-sm font-semibold text-[#0F172A]">Integrations</h2>
      </div>
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#0F172A]">Google Photos</p>
              {isConnected ? (
                <p className="mt-0.5 text-xs text-voce-teal">
                  Connected — pick photos directly when generating content
                </p>
              ) : disconnected ? (
                <p className="mt-0.5 text-xs text-amber-600">
                  Disconnected — reconnect to enable photo picking
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-[#94A3B8]">
                  Connect to pick photos directly when creating content
                </p>
              )}
              {connectError && (
                <p className="mt-1 text-xs text-red-500">Google Photos connection failed — please try again.</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-voce-teal/10 px-3 py-1.5 text-xs font-medium text-voce-teal">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </span>
              ) : (
                <a href="/api/auth/google-photos"
                  className="rounded-lg bg-voce-indigo px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90">
                  Connect Google Photos
                </a>
              )}
            </div>
          </div>

          {/* Disconnect — small, below status row, only when connected */}
          {isConnected && (
            <div className="mt-3 flex justify-end">
              <button onClick={handleDisconnect} disabled={disconnecting}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-60">
                {disconnecting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Disconnecting…</>
                  : <><Unlink className="h-3.5 w-3.5" /> Disconnect</>}
              </button>
            </div>
          )}
          </>
        )}
        {actionErr && <p className="mt-3 text-xs text-red-500">{actionErr}</p>}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

function SettingsContent() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Settings</h1>
        <p className="mt-1 text-sm text-[#64748B]">Manage your account and preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <div className="rounded-xl border border-[#E2E2E0] bg-white">
          <div className="border-b border-[#E2E2E0] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Account</h2>
          </div>
          <div className="divide-y divide-[#E2E2E0]">
            {[
              { label: "Display Name", value: "Your Name", type: "text" },
              { label: "Email",        value: "you@example.com", type: "email" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                  <p className="text-xs text-[#94A3B8]">{item.value}</p>
                </div>
                <button className="min-h-[44px] rounded-lg border border-[#E2E2E0] px-3 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-[#F4F4F2]">
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Google Photos integration */}
        <GooglePhotosSection />

        {/* Sign out — visible on mobile where the sidebar isn't shown */}
        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6 md:hidden">
          <h2 className="mb-4 text-sm font-semibold text-[#0F172A]">Account</h2>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-center text-gray-400">Loading settings...</div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
