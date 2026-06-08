"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode]           = useState<Mode>("signin");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(
    searchParams.get("error") ? "Something went wrong. Please try again." : null
  );
  const [success, setSuccess]     = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.refresh();
      router.push("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setSuccess("Check your email for a confirmation link.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-3 text-base text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 py-10">
      <div className="w-full max-w-sm">

        {/* Logo — prominent on mobile */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1] shadow-lg">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2C5.79 2 4 3.79 4 6v4c0 2.21 1.79 4 4 4s4-1.79 4-4V6c0-2.21-1.79-4-4-4z"
                fill="white" fillOpacity="0.9"
              />
              <path d="M2 8.5C2 8.5 2 11 4 12.5"  stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M14 8.5C14 8.5 14 11 12 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0F172A]">Echoooo</h1>
          <p className="mt-1 text-sm text-[#64748B]">Capture your voice. Build your brand.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E2E2E0] bg-white p-6 shadow-sm">
          {/* Sign in / Sign up toggle */}
          <div className="mb-5 flex rounded-lg bg-[#F4F4F2] p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={[
                  "flex-1 rounded-md py-2 text-sm font-medium transition-all",
                  mode === m
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]",
                ].join(" ")}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Email</label>
              {/* py-3 + text-base keeps the input at least 44px tall on mobile */}
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Password</label>
              <input
                type="password"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                minLength={6}
                className={inputCls}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{success}</p>
            )}

            {/* min-h-[44px] ensures the button meets the touch target minimum */}
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full rounded-lg bg-[#6366F1] py-3 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[#94A3B8]">
          By continuing you agree to Echoooo&apos;s terms of service.
        </p>
      </div>
    </div>
  );
}
