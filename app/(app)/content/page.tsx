"use client";

import { useState, useEffect } from "react";
import {
  Sparkles, Loader2, ThumbsUp, ThumbsDown, RefreshCw,
  Save, ChevronDown, ChevronUp, Plus, AlertCircle, Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type ContentType    = "instagram_caption" | "carousel_script" | "reel_script" | "story_sequence" | "linkedin_post";
type ToneOverride   = "persona" | "casual" | "bold" | "vulnerable" | "educational";
type VariationCount = 1 | 2 | 3 | 4 | 5;
type Thumbs         = "up" | "down" | null;

interface ContentVariation {
  id: number;
  content: string;
  thumbs: Thumbs;
  feedback: string[];
  saved: boolean;
  regenerating: boolean;
}

interface Audience {
  id: string;
  name: string;
  age_range: string;
  location: string;
  interests: string[];
  pain_points: string;
  dreams: string;
  platforms: string[];
  tone: string[];
  description: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: "instagram_caption", label: "Instagram caption" },
  { id: "carousel_script",   label: "Carousel script"   },
  { id: "reel_script",       label: "Reel script"       },
  { id: "story_sequence",    label: "Story sequence"    },
  { id: "linkedin_post",     label: "LinkedIn post"     },
];

const TONE_OVERRIDES: { id: ToneOverride; label: string }[] = [
  { id: "persona",     label: "Same as persona"   },
  { id: "casual",      label: "More casual"       },
  { id: "bold",        label: "More bold"         },
  { id: "vulnerable",  label: "More vulnerable"   },
  { id: "educational", label: "More educational"  },
];

const LANGUAGES = ["English", "Spanish", "Portuguese", "French", "Italian"] as const;

const FEEDBACK_REASONS = [
  "Not my voice", "Too formal", "Too salesy",
  "Wrong energy", "Good ideas wrong words", "Too long",
] as const;

const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: THIS_YEAR - 2017 }, (_, i) => String(2018 + i));

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

// ── Variation card ─────────────────────────────────────────────────────────────

function VariationCard({
  variation, index, onThumbsUp, onThumbsDown, onFeedbackToggle,
  onRegenerate, onApprove,
}: {
  variation: ContentVariation;
  index: number;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onFeedbackToggle: (r: string) => void;
  onRegenerate: () => void;
  onApprove: () => void;
}) {
  const [text, setText] = useState(variation.content);

  return (
    <div className={`rounded-xl border bg-white p-5 transition-all ${
      variation.saved
        ? "border-voce-teal/50 bg-voce-teal/5"
        : variation.thumbs === "down"
        ? "border-red-200"
        : "border-[#E2E2E0]"
    }`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
          Version {index + 1}
        </span>
        {variation.saved && (
          <span className="text-xs font-medium text-voce-teal">✓ Saved to drafts</span>
        )}
      </div>

      {/* Editable content */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={Math.max(4, text.split("\n").length + 2)}
        className="w-full resize-none rounded-lg bg-[#F8F8FF] px-4 py-3 text-sm leading-relaxed text-[#0F172A] outline-none transition focus:bg-white focus:ring-2 focus:ring-voce-indigo/20"
      />

      {/* Actions row */}
      {!variation.saved && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={onThumbsUp}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
              variation.thumbs === "up"
                ? "border-voce-teal bg-voce-teal/10 text-voce-teal"
                : "border-[#E2E2E0] text-[#64748B] hover:border-voce-teal/50"
            }`}>
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={onThumbsDown}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
              variation.thumbs === "down"
                ? "border-red-400 bg-red-50 text-red-500"
                : "border-[#E2E2E0] text-[#64748B] hover:border-red-300"
            }`}>
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>

          <button onClick={onApprove}
            className="ml-auto flex min-h-[36px] items-center gap-1.5 rounded-lg bg-voce-indigo px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90">
            <Save className="h-3.5 w-3.5" /> Approve
          </button>
        </div>
      )}

      {/* Feedback chips */}
      {variation.thumbs === "down" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-[#64748B]">What was off?</p>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_REASONS.map(r => (
              <button key={r} type="button" onClick={() => onFeedbackToggle(r)}
                className={[
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  variation.feedback.includes(r)
                    ? "bg-red-100 text-red-600"
                    : "border border-[#E2E2E0] text-[#64748B] hover:border-red-300",
                ].join(" ")}>
                {r}
              </button>
            ))}
          </div>
          {variation.feedback.length > 0 && (
            <button onClick={onRegenerate} disabled={variation.regenerating}
              className="flex min-h-[36px] items-center gap-2 rounded-lg border border-voce-indigo px-3 py-1.5 text-sm font-medium text-voce-indigo transition hover:bg-voce-indigo/5 disabled:opacity-60">
              {variation.regenerating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerating…</>
                : <><RefreshCw className="h-3.5 w-3.5" /> Regenerate</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  // Audiences
  const [audiences,        setAudiences]        = useState<Audience[]>([]);
  const [loadingAudiences, setLoadingAud]       = useState(true);
  const [audienceId,       setAudienceId]       = useState("");

  // Step 2
  const [contentType,      setContentType]      = useState<ContentType>("instagram_caption");
  const [topic,            setTopic]            = useState("");
  const [variations,       setVariations]       = useState<VariationCount>(1);
  const [toneOverride,     setToneOverride]     = useState<ToneOverride>("persona");
  const [outputLang,       setOutputLang]       = useState("English");

  // Step 3 — media matching
  const [mediaOpen,        setMediaOpen]        = useState(false);
  const [matchMedia,       setMatchMedia]       = useState(false);
  const [mediaYearFrom,    setMediaYearFrom]    = useState(String(THIS_YEAR - 1));
  const [mediaYearTo,      setMediaYearTo]      = useState("present");

  // Results
  const [results,          setResults]          = useState<ContentVariation[]>([]);
  const [generating,       setGenerating]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  // ── Load audiences + persona default language ─────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [audRes, personaRes] = await Promise.all([
          supabase.from("audiences").select("*")
            .eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("persona_profile").select("output_language")
            .eq("user_id", user.id).single(),
        ]);
        const list = (audRes.data as Audience[]) ?? [];
        setAudiences(list);
        if (list.length > 0) setAudienceId(list[0].id);
        if (personaRes.data?.output_language) {
          setOutputLang(personaRes.data.output_language);
        }
      } finally {
        setLoadingAud(false);
      }
    }
    load();
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    if (!audienceId)   { setError("Please select an audience."); return; }
    setGenerating(true); setError(null); setResults([]);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [personaRes, thoughtsRes] = await Promise.all([
        supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
        supabase.from("thought_notes").select("title, transcript")
          .eq("user_id", user.id).eq("status", "processed")
          .order("created_at", { ascending: false }).limit(10),
      ]);

      const audience = audiences.find(a => a.id === audienceId);
      if (!audience) throw new Error("Audience not found");

      const mediaContext = matchMedia
        ? `Match with photos/videos from ${mediaYearFrom} to ${mediaYearTo === "present" ? "now" : mediaYearTo}`
        : null;

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          persona:      { ...personaRes.data, output_language: outputLang },
          audience,
          thoughtNotes: thoughtsRes.data ?? [],
          contentType,
          variations,
          toneOverride,
          dateContext:  mediaContext,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rawVariations: { id: number; content: string }[] = data.variations ?? [
        { id: 1, content: `HOOK:\n${data.hook ?? ""}\n\nBODY:\n${data.body ?? ""}\n\nCTA:\n${data.cta ?? ""}` },
      ];

      setResults(rawVariations.map(v => ({
        id: v.id, content: v.content,
        thumbs: null, feedback: [], saved: false, regenerating: false,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // ── Variation actions ─────────────────────────────────────────────────────────

  function updateVariation(id: number, patch: Partial<ContentVariation>) {
    setResults(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
  }

  async function handleRegenerate(variation: ContentVariation) {
    updateVariation(variation.id, { regenerating: true });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [personaRes, thoughtsRes] = await Promise.all([
        supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
        supabase.from("thought_notes").select("title, transcript")
          .eq("user_id", user.id).eq("status", "processed").limit(10),
      ]);

      const audience = audiences.find(a => a.id === audienceId);
      if (!audience) throw new Error("Audience not found");

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic, persona: { ...personaRes.data, output_language: outputLang },
          audience, thoughtNotes: thoughtsRes.data ?? [],
          contentType, variations: 1, toneOverride,
          feedbackContext: variation.feedback.join(", "),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const raw = data.variations?.[0]?.content
        ?? `HOOK:\n${data.hook ?? ""}\n\nBODY:\n${data.body ?? ""}\n\nCTA:\n${data.cta ?? ""}`;

      updateVariation(variation.id, { content: raw, thumbs: null, feedback: [], regenerating: false });
    } catch {
      updateVariation(variation.id, { regenerating: false });
    }
  }

  async function handleApprove(variation: ContentVariation) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const audience = audiences.find(a => a.id === audienceId);
      await supabase.from("content_drafts").insert({
        user_id: user.id,
        title:    topic,
        body:     variation.content,
        platform: audience?.platforms?.[0] ?? null,
        status:   "draft",
      });
      updateVariation(variation.id, { saved: true });
    } catch {
      setError("Could not save to drafts.");
    }
  }

  const selectedAudience = audiences.find(a => a.id === audienceId);
  const hasResults       = results.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 pr-8 md:pr-0">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Generate Content</h1>
        <p className="mt-1 text-sm text-[#64748B]">Your voice. Your audience. In seconds.</p>
      </div>

      {/* Setup card */}
      <div className="space-y-6 rounded-xl border border-[#E2E2E0] bg-white p-5">

        {/* ── STEP 1 — Audience ── */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Step 1 — Choose your audience
          </p>
          {loadingAudiences ? (
            <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audiences…
            </div>
          ) : audiences.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              No audiences yet.{" "}
              <a href="/audience" className="font-semibold underline">Create one first →</a>
            </div>
          ) : (
            <div className="space-y-2">
              <select value={audienceId} onChange={e => setAudienceId(e.target.value)} className={inputCls}>
                {audiences.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {selectedAudience?.description && (
                <p className="px-1 text-xs text-[#94A3B8]">{selectedAudience.description}</p>
              )}
              <a href="/audience"
                className="inline-flex items-center gap-1 text-xs text-voce-indigo hover:underline">
                <Plus className="h-3 w-3" /> Create new audience
              </a>
            </div>
          )}
        </div>

        {/* ── STEP 2 — What to create ── */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Step 2 — What do you want to create?
          </p>

          {/* Content type chips */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0F172A]">Content type</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(ct => (
                <button key={ct.id} type="button" onClick={() => setContentType(ct.id)}
                  className={[
                    "rounded-full px-3 py-1.5 text-sm font-medium transition",
                    contentType === ct.id
                      ? "bg-voce-indigo text-white"
                      : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/50",
                  ].join(" ")}>
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
              What do you want to post about?
            </label>
            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
              placeholder="e.g. The moment I realised I had to leave my job to save my mental health"
              className={inputCls} />
          </div>

          {/* Variations — large square number buttons 1-5 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0F172A]">
              Number of variations
            </label>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as VariationCount[]).map(n => (
                <button key={n} type="button" onClick={() => setVariations(n)}
                  className={[
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base font-bold transition",
                    variations === n
                      ? "border-voce-indigo bg-voce-indigo text-white shadow-sm"
                      : "border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/50 hover:text-voce-indigo",
                  ].join(" ")}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Tone + Language row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0F172A]">
                Tone <span className="font-normal text-[#94A3B8]">optional override</span>
              </label>
              <select value={toneOverride} onChange={e => setToneOverride(e.target.value as ToneOverride)}
                className={inputCls}>
                {TONE_OVERRIDES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#0F172A]">Output language</label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(l => (
                  <button key={l} type="button" onClick={() => setOutputLang(l)}
                    className={[
                      "rounded-full px-3 py-1 text-sm font-medium transition",
                      outputLang === l
                        ? "bg-voce-indigo text-white"
                        : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/50",
                    ].join(" ")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP 3 — Match with your media (optional) ── */}
        <div>
          <button type="button" onClick={() => setMediaOpen(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-[#64748B] transition hover:text-[#0F172A]">
            {mediaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Step 3 — Match with your media
            <span className="text-xs font-normal text-[#94A3B8]">optional</span>
          </button>

          {mediaOpen && (
            <div className="mt-4 space-y-4">
              {/* YES / NO toggle */}
              <div>
                <p className="mb-2 text-sm font-medium text-[#0F172A]">
                  Match generated content with photos/videos from my library?
                </p>
                <div className="flex gap-2">
                  {(["No", "Yes"] as const).map(opt => (
                    <button key={opt} type="button"
                      onClick={() => setMatchMedia(opt === "Yes")}
                      className={[
                        "flex h-11 w-20 items-center justify-center rounded-xl border text-sm font-semibold transition",
                        (opt === "Yes") === matchMedia
                          ? "border-voce-indigo bg-voce-indigo text-white"
                          : "border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/50",
                      ].join(" ")}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year range — shown only when matchMedia = true */}
              {matchMedia && (
                <div className="space-y-3 rounded-xl bg-[#F8F8FF] p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#64748B]">From year</label>
                      <select value={mediaYearFrom} onChange={e => setMediaYearFrom(e.target.value)}
                        className={inputCls}>
                        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#64748B]">To year</label>
                      <select value={mediaYearTo} onChange={e => setMediaYearTo(e.target.value)}
                        className={inputCls}>
                        <option value="present">Present</option>
                        {[...YEAR_OPTIONS].reverse().map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-voce-indigo/5 px-3 py-2.5">
                    <Camera className="mt-0.5 h-4 w-4 shrink-0 text-voce-indigo" />
                    <p className="text-xs text-[#64748B]">
                      We&apos;ll suggest matching photos and videos from your Google Photos library
                      for each piece of content generated.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !topic.trim() || !audienceId}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-voce-indigo text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
      >
        {generating
          ? <><Loader2 className="h-5 w-5 animate-spin" /> Writing in your voice…</>
          : <><Sparkles className="h-5 w-5" /> Generate Content</>}
      </button>

      {/* Results */}
      {hasResults && (
        <div className="mt-8 space-y-4">
          <p className="text-sm font-semibold text-[#0F172A]">
            {results.length} {results.length === 1 ? "version" : "versions"} generated
          </p>
          {results.map((v, i) => (
            <VariationCard
              key={v.id}
              variation={v}
              index={i}
              onThumbsUp={() => updateVariation(v.id, { thumbs: "up", feedback: [] })}
              onThumbsDown={() => updateVariation(v.id, { thumbs: "down" })}
              onFeedbackToggle={r => {
                const next = v.feedback.includes(r)
                  ? v.feedback.filter(x => x !== r)
                  : [...v.feedback, r];
                updateVariation(v.id, { feedback: next });
              }}
              onRegenerate={() => handleRegenerate(v)}
              onApprove={() => handleApprove(v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
