"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase";

const TONES = ["professional", "casual", "inspirational", "educational", "conversational"] as const;
type Tone = (typeof TONES)[number];

const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  casual: "Casual",
  inspirational: "Inspirational",
  educational: "Educational",
  conversational: "Conversational",
};

interface PersonaForm {
  display_name: string;
  bio: string;
  tone: Tone;
  communication_style: string;
  sample_captions: [string, string, string];
}

const EMPTY: PersonaForm = {
  display_name: "",
  bio: "",
  tone: "professional",
  communication_style: "",
  sample_captions: ["", "", ""],
};

type SaveState = "idle" | "saving" | "saved" | "error";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">{label}</label>
      {hint && <p className="mb-2 text-xs text-[#94A3B8]">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#7F77DD] focus:ring-2 focus:ring-[#7F77DD]/20";

export default function MyPersonaPage() {
  const [form, setForm] = useState<PersonaForm>(EMPTY);
  const [fingerprint, setFingerprint] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("persona_profile")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          bio: data.bio ?? "",
          tone: (data.tone as Tone) ?? "professional",
          communication_style: data.communication_style ?? "",
          sample_captions: (data.sample_captions?.length >= 3
            ? data.sample_captions.slice(0, 3)
            : [...(data.sample_captions ?? []), "", "", ""].slice(0, 3)) as [string, string, string],
        });
        setFingerprint(data.style_fingerprint ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  function set<K extends keyof PersonaForm>(key: K, value: PersonaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCaption(index: number, value: string) {
    const next = [...form.sample_captions] as [string, string, string];
    next[index] = value;
    set("sample_captions", next);
  }

  async function handleSave() {
    setSaveState("saving");
    setGenerating(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upsert persona fields
      const { error: dbErr } = await supabase.from("persona_profile").upsert(
        {
          user_id: user.id,
          display_name: form.display_name,
          bio: form.bio,
          tone: form.tone,
          communication_style: form.communication_style,
          sample_captions: form.sample_captions.filter(Boolean),
        },
        { onConflict: "user_id" }
      );
      if (dbErr) throw dbErr;

      // 2. Generate style fingerprint
      const res = await fetch("/api/generate-fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.display_name,
          bio: form.bio,
          tone: form.tone,
          communicationStyle: form.communication_style,
          sampleCaptions: form.sample_captions,
        }),
      });
      const { fingerprint: fp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);

      // 3. Save fingerprint
      await supabase
        .from("persona_profile")
        .update({ style_fingerprint: fp })
        .eq("user_id", user.id);

      setFingerprint(fp);
      setSaveState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateFingerprint() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.display_name,
          bio: form.bio,
          tone: form.tone,
          communicationStyle: form.communication_style,
          sampleCaptions: form.sample_captions,
        }),
      });
      const { fingerprint: fp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("persona_profile")
          .update({ style_fingerprint: fp })
          .eq("user_id", user.id);
      }
      setFingerprint(fp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#7F77DD]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">My Persona</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Tell us who you are. We&apos;ll build an AI model of your unique voice.
        </p>
      </div>

      <div className="space-y-6">
        {/* About You */}
        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
            About You
          </h2>
          <div className="space-y-4">
            <Field label="Display Name">
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="e.g. Sarah Chen"
                className={inputCls}
              />
            </Field>
            <Field label="Short Bio" hint="2–3 sentences about who you are and what you do.">
              <textarea
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                rows={3}
                placeholder="e.g. I'm a business coach for women leaving corporate. I help them find clarity, build confidence, and launch on their own terms."
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Your Voice */}
        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
            Your Voice
          </h2>
          <div className="space-y-4">
            <Field label="Tone">
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("tone", t)}
                    className={[
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                      form.tone === t
                        ? "bg-[#7F77DD] text-white"
                        : "border border-[#E2E2E0] text-[#64748B] hover:border-[#7F77DD] hover:text-[#7F77DD]",
                    ].join(" ")}
                  >
                    {TONE_LABELS[t]}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              label="Communication Style"
              hint="How you naturally express yourself. Be specific — this shapes every piece of content generated for you."
            >
              <textarea
                value={form.communication_style}
                onChange={(e) => set("communication_style", e.target.value)}
                rows={3}
                placeholder='e.g. "I use short punchy sentences. I ask a lot of questions. I swear occasionally for emphasis. I avoid corporate speak. I use real examples from my life."'
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Sample Captions */}
        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
            Sample Content
          </h2>
          <p className="mb-4 text-xs text-[#94A3B8]">
            Paste 3 examples of your best past posts. The AI will study these to capture your voice.
          </p>
          <div className="space-y-4">
            {([0, 1, 2] as const).map((i) => (
              <Field key={i} label={`Caption ${i + 1}`}>
                <textarea
                  value={form.sample_captions[i]}
                  onChange={(e) => setCaption(i, e.target.value)}
                  rows={4}
                  placeholder="Paste one of your best posts here…"
                  className={inputCls}
                />
              </Field>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || generating}
            className="flex items-center gap-2 rounded-lg bg-[#7F77DD] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6E66CC] disabled:opacity-60"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating fingerprint…</>
            ) : saveState === "saved" ? (
              <><CheckCircle2 className="h-4 w-4" /> Saved</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Save &amp; Generate Style Fingerprint</>
            )}
          </button>
          {saveState === "saved" && (
            <p className="text-sm text-[#1D9E75]">✓ Persona saved</p>
          )}
        </div>

        {/* Style Fingerprint */}
        {fingerprint && (
          <div className="rounded-xl border border-[#7F77DD]/20 bg-[#7F77DD]/5 p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7F77DD]" />
                <h2 className="text-sm font-semibold text-[#7F77DD]">Your Style Fingerprint</h2>
              </div>
              <button
                onClick={regenerateFingerprint}
                disabled={generating}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#7F77DD] transition hover:bg-[#7F77DD]/10 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Regenerate
              </button>
            </div>
            <p className="text-sm leading-relaxed text-[#0F172A]">{fingerprint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
