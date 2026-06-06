"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Loader2, ThumbsUp, ThumbsDown, RefreshCw,
  ChevronDown, ChevronUp, ChevronRight, Plus, AlertCircle,
  Camera, Edit2, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type ContentType  = "instagram_caption" | "carousel_script" | "reel_script" | "story_sequence" | "linkedin_post";
type ToneOverride = "persona" | "casual" | "bold" | "vulnerable" | "educational";
type LibraryFilter = "all" | "generated" | "approved" | "published";

interface ContentDraft {
  id: string;
  title: string | null;
  body: string;
  platform: string | null;
  status: string;
  created_at: string;
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
  { id: "persona",     label: "Same as persona"  },
  { id: "casual",      label: "More casual"      },
  { id: "bold",        label: "More bold"        },
  { id: "vulnerable",  label: "More vulnerable"  },
  { id: "educational", label: "More educational" },
];

const LANGUAGES = ["English", "Spanish", "Portuguese", "French", "Italian"] as const;

const FEEDBACK_REASONS = [
  "Not my voice", "Too formal", "Too salesy",
  "Wrong energy", "Good ideas wrong words", "Too long",
] as const;

const THIS_YEAR   = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: THIS_YEAR - 2017 }, (_, i) => String(2018 + i));

const LIBRARY_TABS: { id: LibraryFilter; label: string }[] = [
  { id: "all",       label: "All"       },
  { id: "generated", label: "Generated" },
  { id: "approved",  label: "Approved"  },
  { id: "published", label: "Published" },
];

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d    = new Date(iso);
  const now  = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="rounded-full bg-voce-indigo/10 px-2 py-0.5 text-[11px] font-medium text-voce-indigo">
      Approved
    </span>
  );
  if (status === "published") return (
    <span className="rounded-full bg-voce-teal/10 px-2 py-0.5 text-[11px] font-medium text-voce-teal">
      Published
    </span>
  );
  return (
    <span className="rounded-full bg-[#F4F4F2] px-2 py-0.5 text-[11px] font-medium text-[#64748B]">
      Generated
    </span>
  );
}

// ── Content draft card ─────────────────────────────────────────────────────────

function ContentDraftCard({ draft, showMediaPlaceholder, onStatusChange }: {
  draft: ContentDraft;
  showMediaPlaceholder: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [body,         setBody]         = useState(draft.body);
  const [thumbs,       setThumbs]       = useState<"up" | "down" | null>(null);
  const [feedback,     setFeedback]     = useState<string[]>([]);
  const [status,       setStatus]       = useState(draft.status);
  const [approving,    setApproving]    = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isApproved  = status === "approved";
  const isPublished = status === "published";
  const wordCount   = body.trim() ? body.trim().split(/\s+/).length : 0;
  const previewLine = body.split("\n").find(l => l.trim()) ?? body.slice(0, 80);

  async function quickApprove() {
    setApproving(true);
    try {
      const supabase = createClient();
      await supabase.from("content_drafts")
        .update({ status: "approved" }).eq("id", draft.id);
      setStatus("approved");
      onStatusChange(draft.id, "approved");
    } finally {
      setApproving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const supabase = createClient();
      await supabase.from("content_drafts")
        .update({ body, status: "approved" }).eq("id", draft.id);
      setStatus("approved");
      onStatusChange(draft.id, "approved");
    } finally {
      setApproving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const supabase = createClient();
      await supabase.from("content_drafts")
        .update({ status: "published" }).eq("id", draft.id);
      setStatus("published");
      onStatusChange(draft.id, "published");
    } finally {
      setPublishing(false);
    }
  }

  async function handleRegenerate() {
    if (feedback.length === 0 || regenerating) return;
    setRegenerating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [personaRes, thoughtsRes] = await Promise.all([
        supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
        supabase.from("thought_notes").select("title, transcript")
          .eq("user_id", user.id).eq("status", "processed").limit(5),
      ]);
      const res = await fetch("/api/generate-content", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:           draft.title ?? "content",
          persona:         personaRes.data,
          audience:        { name: "General", platforms: [draft.platform ?? "instagram"] },
          thoughtNotes:    thoughtsRes.data ?? [],
          contentType:     "instagram_caption",
          variations:      1,
          toneOverride:    "persona",
          feedbackContext: feedback.join(", "),
        }),
      });
      const data = await res.json();
      const newContent = data.variations?.[0]?.content ?? body;
      setBody(newContent);
      setThumbs(null);
      setFeedback([]);
      await supabase.from("content_drafts")
        .update({ body: newContent }).eq("id", draft.id);
    } catch {
      // silently fail — old content remains
    } finally {
      setRegenerating(false);
    }
  }

  function toggleFeedback(r: string) {
    setFeedback(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#FAFAF8]"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-[#94A3B8]">{fmtDate(draft.created_at)}</span>
          </div>
          <p className="line-clamp-1 text-sm text-[#0F172A]">{previewLine}</p>
          {draft.title && (
            <p className="mt-0.5 line-clamp-1 text-xs text-[#94A3B8]">
              Topic: {draft.title}
            </p>
          )}
        </div>
        <div
          className="mt-0.5 shrink-0 text-[#94A3B8] transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}
        >
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#E2E2E0] px-4 pb-5 pt-4 space-y-4">

          {/* Editable textarea */}
          <div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={Math.max(4, body.split("\n").length + 2)}
              className="w-full resize-none rounded-xl bg-[#F8F8FF] px-4 py-3 text-sm leading-relaxed text-[#0F172A] outline-none transition focus:bg-white focus:ring-2 focus:ring-voce-indigo/20"
            />
            <p className="mt-1 text-right text-xs text-[#94A3B8]">{wordCount} words</p>
          </div>

          {/* Media placeholder */}
          {showMediaPlaceholder && (
            <div className="rounded-lg bg-[#F4F4F2] px-4 py-3">
              <p className="text-xs leading-relaxed text-[#64748B]">
                📷 Media matching coming soon — connect your Google Photos in Settings to
                automatically match photos and videos to your content.
              </p>
            </div>
          )}

          {/* ── Published state ── */}
          {isPublished && (
            <div className="flex items-center gap-2 text-sm font-medium text-voce-teal">
              <CheckCircle2 className="h-4 w-4" /> Published
            </div>
          )}

          {/* ── Approved state ── */}
          {isApproved && !isPublished && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-voce-indigo">
                <CheckCircle2 className="h-4 w-4" /> Approved ✓
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex min-h-[40px] items-center gap-2 rounded-xl bg-voce-teal px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {publishing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />}
                Mark as published
              </button>
            </div>
          )}

          {/* ── Generated state: action buttons ── */}
          {!isApproved && !isPublished && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Thumbs up — quick approve */}
                <button
                  onClick={quickApprove}
                  disabled={approving}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                    thumbs === "up"
                      ? "border-voce-teal bg-voce-teal/10 text-voce-teal"
                      : "border-[#E2E2E0] text-[#64748B] hover:border-voce-teal/50"
                  }`}
                >
                  {approving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ThumbsUp className="h-3.5 w-3.5" />}
                </button>

                {/* Thumbs down — show feedback */}
                <button
                  onClick={() => setThumbs(t => t === "down" ? null : "down")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
                    thumbs === "down"
                      ? "border-red-400 bg-red-50 text-red-500"
                      : "border-[#E2E2E0] text-[#64748B] hover:border-red-300"
                  }`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>

                {/* Edit — focus textarea */}
                <button
                  onClick={() => { textareaRef.current?.focus(); textareaRef.current?.select(); }}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E2E2E0] px-3 py-1.5 text-sm text-[#64748B] transition hover:border-voce-indigo/50 hover:text-voce-indigo"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>

                {/* Approve */}
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="ml-auto flex min-h-[36px] items-center gap-1.5 rounded-lg bg-voce-indigo px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {approving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve
                </button>
              </div>

              {/* Feedback chips */}
              {thumbs === "down" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#64748B]">What was off?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_REASONS.map(r => (
                      <button key={r} type="button" onClick={() => toggleFeedback(r)}
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-medium transition",
                          feedback.includes(r)
                            ? "bg-red-100 text-red-600"
                            : "border border-[#E2E2E0] text-[#64748B] hover:border-red-300",
                        ].join(" ")}>
                        {r}
                      </button>
                    ))}
                  </div>
                  {feedback.length > 0 && (
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="flex min-h-[36px] items-center gap-2 rounded-lg border border-voce-indigo px-3 py-1.5 text-sm font-medium text-voce-indigo transition hover:bg-voce-indigo/5 disabled:opacity-60"
                    >
                      {regenerating
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerating…</>
                        : <><RefreshCw className="h-3.5 w-3.5" /> Regenerate</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  // Generation panel
  const [genOpen,          setGenOpen]          = useState(false);
  const [audiences,        setAudiences]        = useState<Audience[]>([]);
  const [loadingAudiences, setLoadingAud]       = useState(true);
  const [audienceId,       setAudienceId]       = useState("");
  const [contentType,      setContentType]      = useState<ContentType>("instagram_caption");
  const [topic,            setTopic]            = useState("");
  const [variations,       setVariations]       = useState(3);
  const [toneOverride,     setToneOverride]     = useState<ToneOverride>("persona");
  const [outputLang,       setOutputLang]       = useState("English");
  const [mediaOpen,        setMediaOpen]        = useState(false);
  const [matchMedia,       setMatchMedia]       = useState(false);
  const [mediaYearFrom,    setMediaYearFrom]    = useState(String(THIS_YEAR - 1));
  const [mediaYearTo,      setMediaYearTo]      = useState("present");
  const [generating,       setGenerating]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  // Library
  const [drafts,           setDrafts]           = useState<ContentDraft[]>([]);
  const [loadingDrafts,    setLoadingDrafts]    = useState(true);
  const [libraryFilter,    setLibraryFilter]    = useState<LibraryFilter>("all");
  const [mediaMatchedIds,  setMediaMatchedIds]  = useState<Set<string>>(new Set());

  // ── Load data ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [audRes, personaRes, draftsRes] = await Promise.all([
          supabase.from("audiences").select("*")
            .eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("persona_profile").select("output_language")
            .eq("user_id", user.id).single(),
          supabase.from("content_drafts").select("*")
            .eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);
        const list = (audRes.data as Audience[]) ?? [];
        setAudiences(list);
        if (list.length > 0) setAudienceId(list[0].id);
        if (personaRes.data?.output_language) setOutputLang(personaRes.data.output_language);
        setDrafts((draftsRes.data as ContentDraft[]) ?? []);
      } finally {
        setLoadingAud(false);
        setLoadingDrafts(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate ──────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    if (!audienceId)   { setError("Please select an audience."); return; }
    setGenerating(true); setError(null);

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

      const audience    = audiences.find(a => a.id === audienceId);
      if (!audience) throw new Error("Audience not found");

      const mediaContext = matchMedia
        ? `Match with photos/videos from ${mediaYearFrom} to ${mediaYearTo === "present" ? "now" : mediaYearTo}`
        : null;

      const res = await fetch("/api/generate-content", {
        method:  "POST",
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

      // Save every variation to DB immediately
      const inserts = rawVariations.map(v => ({
        user_id:  user.id,
        title:    topic,
        body:     v.content,
        platform: audience.platforms?.[0] ?? null,
        status:   "generated",
      }));

      const { data: saved } = await supabase.from("content_drafts")
        .insert(inserts).select();

      if (saved) {
        setDrafts(prev => [...(saved as ContentDraft[]), ...prev]);
        if (matchMedia) {
          const newIds = (saved as ContentDraft[]).map(d => d.id);
          setMediaMatchedIds(prev => { const next = new Set(prev); newIds.forEach(id => next.add(id)); return next; });
        }
      }

      setGenOpen(false); // collapse after generation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // ── Library helpers ────────────────────────────────────────────────────────────

  function handleStatusChange(id: string, newStatus: string) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
  }

  const filteredDrafts = drafts.filter(d => {
    if (libraryFilter === "generated") return d.status === "generated" || d.status === "draft";
    if (libraryFilter === "approved")  return d.status === "approved";
    if (libraryFilter === "published") return d.status === "published";
    return true;
  });

  const selectedAudience = audiences.find(a => a.id === audienceId);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pr-8 md:pr-0">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Content</h1>
        <p className="mt-1 text-sm text-[#64748B]">Your voice. Your audience. In seconds.</p>
      </div>

      {/* ── Generation panel ── */}
      <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
        {/* Collapsed header */}
        <button
          onClick={() => setGenOpen(v => !v)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#FAFAF8]"
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
            genOpen ? "bg-voce-indigo text-white" : "bg-voce-indigo/10 text-voce-indigo"
          }`}>
            <Plus className="h-4 w-4" />
          </div>
          <span className="flex-1 text-sm font-semibold text-[#0F172A]">Generate new content</span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-200"
            style={{ transform: genOpen ? "rotate(180deg)" : "none" }}
          />
        </button>

        {/* Expanded form */}
        {genOpen && (
          <div className="border-t border-[#E2E2E0] px-5 pb-6 pt-5 space-y-6">

            {/* STEP 1 — Audience */}
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

            {/* STEP 2 — What to create */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Step 2 — What do you want to create?
              </p>

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

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                  What do you want to post about?
                </label>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                  placeholder="e.g. The moment I realised I had to leave my job to save my mental health"
                  className={inputCls} />
              </div>

              <div>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-voce-indigo tabular-nums">{variations}</span>
                  <span className="text-sm font-medium text-[#64748B]">
                    {variations === 1 ? "variation" : "variations"}
                  </span>
                </div>
                <input type="range" min={1} max={30} value={variations}
                  onChange={e => setVariations(Number(e.target.value))}
                  className="w-full cursor-pointer" style={{ accentColor: "#6366F1" }} />
                <div className="mt-1 flex justify-between text-[10px] text-[#94A3B8]">
                  <span>1</span><span>30</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#0F172A]">
                    Tone <span className="font-normal text-[#94A3B8]">optional override</span>
                  </label>
                  <select value={toneOverride} onChange={e => setToneOverride(e.target.value as ToneOverride)} className={inputCls}>
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

            {/* STEP 3 — Media (optional) */}
            <div>
              <button type="button" onClick={() => setMediaOpen(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-[#64748B] transition hover:text-[#0F172A]">
                {mediaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Step 3 — Match with your media
                <span className="text-xs font-normal text-[#94A3B8]">optional</span>
              </button>

              {mediaOpen && (
                <div className="mt-4 space-y-4">
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

                  {matchMedia && (
                    <div className="space-y-3 rounded-xl bg-[#F8F8FF] p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-[#64748B]">From year</label>
                          <select value={mediaYearFrom} onChange={e => setMediaYearFrom(e.target.value)} className={inputCls}>
                            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-[#64748B]">To year</label>
                          <select value={mediaYearTo} onChange={e => setMediaYearTo(e.target.value)} className={inputCls}>
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

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim() || !audienceId}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-voce-indigo text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
            >
              {generating
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Writing in your voice…</>
                : <><Sparkles className="h-5 w-5" /> Generate Content</>}
            </button>

          </div>
        )}
      </div>

      {/* ── Content library ── */}
      <div className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-[#0F172A]">Content library</h2>

        {/* Filter tabs */}
        <div className="mb-4 flex rounded-xl bg-[#F4F4F2] p-1">
          {LIBRARY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setLibraryFilter(tab.id)}
              className={[
                "flex min-h-[36px] flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all",
                libraryFilter === tab.id
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#94A3B8] hover:text-[#64748B]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loadingDrafts ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-voce-indigo" />
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] py-14 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-[#E2E2E0]" />
            <p className="text-sm font-medium text-[#0F172A]">No content here yet</p>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Generate your first post above!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDrafts.map(d => (
              <ContentDraftCard
                key={d.id}
                draft={d}
                showMediaPlaceholder={mediaMatchedIds.has(d.id)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
