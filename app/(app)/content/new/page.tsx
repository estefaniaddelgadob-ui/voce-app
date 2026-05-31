"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, Save, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Audience {
  id: string;
  name: string;
  niche: string;
  who_they_are: string;
  biggest_struggles: string;
  goals: string;
  content_pillars: string[];
  primary_platform: string;
  content_goal: string;
}

interface GeneratedContent {
  hook: string;
  body: string;
  cta: string;
}

type PageState = "idle" | "generating" | "done" | "saving" | "saved";

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#7F77DD] focus:ring-2 focus:ring-[#7F77DD]/20";

function SectionLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-[#94A3B8]">{hint}</p>}
    </div>
  );
}

export default function NewContentPage() {
  const [topic, setTopic] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [content, setContent] = useState<GeneratedContent>({ hook: "", body: "", cta: "" });
  const [state, setState] = useState<PageState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingAudiences, setLoadingAudiences] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("audiences")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data as Audience[]) ?? [];
      setAudiences(list);
      if (list.length > 0) setAudienceId(list[0].id);
      setLoadingAudiences(false);
    }
    load();
  }, []);

  async function handleGenerate() {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    if (!audienceId) { setError("Please select an audience."); return; }

    setState("generating");
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [personaRes, thoughtsRes] = await Promise.all([
        supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
        supabase
          .from("thought_notes")
          .select("title, transcript")
          .eq("user_id", user.id)
          .eq("status", "processed")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const persona = personaRes.data ?? {};
      const thoughtNotes = thoughtsRes.data ?? [];
      const audience = audiences.find((a) => a.id === audienceId);
      if (!audience) throw new Error("Audience not found");

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, persona, audience, thoughtNotes }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setContent({ hook: data.hook ?? "", body: data.body ?? "", cta: data.cta ?? "" });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setState("idle");
    }
  }

  async function handleSave() {
    setState("saving");
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const audience = audiences.find((a) => a.id === audienceId);
      const fullBody = `HOOK:\n${content.hook}\n\nBODY:\n${content.body}\n\nCTA:\n${content.cta}`;

      const { error } = await supabase.from("content_drafts").insert({
        user_id: user.id,
        title: topic,
        body: fullBody,
        platform: audience?.primary_platform ?? null,
        status: "draft",
      });
      if (error) throw error;
      setState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setState("done");
    }
  }

  function reset() {
    setTopic("");
    setContent({ hook: "", body: "", cta: "" });
    setState("idle");
    setError(null);
  }

  const selectedAudience = audiences.find((a) => a.id === audienceId);
  const isGenerating = state === "generating";
  const hasContent = state === "done" || state === "saving" || state === "saved";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Generate Content</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Tell us the topic. We&apos;ll write it in your voice, for your audience.
        </p>
      </div>

      {/* Input form */}
      <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
              What do you want to post about?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="e.g. The moment I realised I had to quit my job to save my mental health"
              className={inputCls}
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
              Which audience is this for?
            </label>
            {loadingAudiences ? (
              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading audiences…
              </div>
            ) : audiences.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No audiences yet.{" "}
                <a href="/my-audiences" className="font-medium underline">
                  Create one first
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={audienceId}
                  onChange={(e) => setAudienceId(e.target.value)}
                  className={inputCls}
                  disabled={isGenerating}
                >
                  {audiences.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.niche ? ` — ${a.niche}` : ""}
                    </option>
                  ))}
                </select>
                {selectedAudience && (
                  <div className="flex flex-wrap gap-2 px-1">
                    <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
                      <Users className="h-3 w-3" /> {selectedAudience.primary_platform}
                    </span>
                    <span className="text-xs text-[#94A3B8]">·</span>
                    <span className="text-xs text-[#94A3B8]">goal: {selectedAudience.content_goal}</span>
                    {selectedAudience.content_pillars?.length > 0 && (
                      <>
                        <span className="text-xs text-[#94A3B8]">·</span>
                        <span className="text-xs text-[#94A3B8]">
                          pillars: {selectedAudience.content_pillars.slice(0, 3).join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        {!hasContent && (
          <div className="mt-5">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim() || !audienceId}
              className="flex items-center gap-2 rounded-lg bg-[#7F77DD] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6E66CC] disabled:opacity-60"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Writing in your voice…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate Content</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Generated content */}
      {hasContent && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
            <SectionLabel label="Hook" hint="Opening line — stops the scroll" />
            <textarea
              value={content.hook}
              onChange={(e) => setContent((c) => ({ ...c, hook: e.target.value }))}
              rows={3}
              className={inputCls}
            />
          </div>

          <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
            <SectionLabel label="Body" hint="Main content — tell the story or share the value" />
            <textarea
              value={content.body}
              onChange={(e) => setContent((c) => ({ ...c, body: e.target.value }))}
              rows={10}
              className={inputCls}
            />
          </div>

          <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
            <SectionLabel label="CTA" hint="Call to action — what you want them to do next" />
            <textarea
              value={content.cta}
              onChange={(e) => setContent((c) => ({ ...c, cta: e.target.value }))}
              rows={2}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-3">
            {state === "saved" ? (
              <div className="flex items-center gap-2 text-sm font-medium text-[#1D9E75]">
                <CheckCircle2 className="h-4 w-4" /> Saved to Drafts
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={state === "saving"}
                className="flex items-center gap-2 rounded-lg bg-[#1D9E75] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#178a65] disabled:opacity-60"
              >
                {state === "saving" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="h-4 w-4" /> Approve &amp; Save to Drafts</>
                )}
              </button>
            )}
            <button
              onClick={reset}
              className="rounded-lg border border-[#E2E2E0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F4F4F2]"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
