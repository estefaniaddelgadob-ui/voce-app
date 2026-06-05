"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
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

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Settings</h1>
        <p className="mt-1 text-sm text-[#64748B]">Manage your account and preferences.</p>
      </div>

      <div className="space-y-6">
        {[
          {
            section: "Account",
            items: [
              { label: "Display Name", value: "Your Name", type: "text" },
              { label: "Email",        value: "you@example.com", type: "email" },
            ],
          },
          {
            section: "Integrations",
            items: [
              { label: "LinkedIn",    value: "Not connected", type: "connect" },
              { label: "Twitter / X", value: "Not connected", type: "connect" },
            ],
          },
        ].map((group) => (
          <div key={group.section} className="rounded-xl border border-[#E2E2E0] bg-white">
            <div className="border-b border-[#E2E2E0] px-6 py-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">{group.section}</h2>
            </div>
            <div className="divide-y divide-[#E2E2E0]">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                    <p className="text-xs text-[#94A3B8]">{item.value}</p>
                  </div>
                  <button
                    className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.type === "connect"
                        ? "bg-voce-teal/10 text-voce-teal hover:bg-voce-teal/20"
                        : "border border-[#E2E2E0] text-[#64748B] hover:bg-[#F4F4F2]"
                    }`}
                  >
                    {item.type === "connect" ? "Connect" : "Edit"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out — visible on mobile where the sidebar isn't shown */}
        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6 md:hidden">
          <h2 className="mb-4 text-sm font-semibold text-[#0F172A]">Account</h2>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
