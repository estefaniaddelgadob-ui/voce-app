"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Loader2, ThumbsUp, ThumbsDown, RefreshCw,
  ChevronDown, ChevronRight, Plus, AlertCircle,
  Camera, Edit2, CheckCircle2, Copy, Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type ContentType   = "instagram_caption" | "carousel_script" | "reel_script" | "story_sequence" | "linkedin_post";
type ToneOverride  = "persona" | "casual" | "bold" | "vulnerable" | "educational";
type LibraryFilter = "all" | "generated" | "approved" | "scheduled" | "published";

interface ContentDraft {
  id: string;
  title: string | null;
  body: string;
  platform: string | null;
  status: string;
  created_at: string;
  algorithm_note: string | null;
  media_type: string | null;
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

const THIS_YEAR    = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: THIS_YEAR - 2017 }, (_, i) => String(2018 + i));

const LIBRARY_TABS: { id: LibraryFilter; label: string }[] = [
  { id: "all",       label: "All"       },
  { id: "generated", label: "Generated" },
  { id: "approved",  label: "Approved"  },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
];

const LENGTH_OPTIONS: Partial<Record<ContentType, { id: string; label: string; tip: string }[]>> = {
  instagram_caption: [
    { id: "short",  label: "Short",     tip: "50–100 words — best for reach."          },
    { id: "medium", label: "Medium",    tip: "100–200 words — storytelling sweet spot." },
    { id: "long",   label: "Long",      tip: "200–300 words — great for saves."         },
  ],
  carousel_script: [
    { id: "3",  label: "3 slides",  tip: "Quick and punchy — best for reach."    },
    { id: "5",  label: "5 slides",  tip: "Most popular carousel format."         },
    { id: "7",  label: "7 slides",  tip: "Deeper value. More saves."             },
    { id: "10", label: "10 slides", tip: "Educational deep-dives."               },
  ],
  reel_script: [
    { id: "7s",  label: "7s",  tip: "Max reach — hook only."              },
    { id: "15s", label: "15s", tip: "Best for reach + saves. (recommended)" },
    { id: "30s", label: "30s", tip: "Story with a clear arc."              },
    { id: "60s", label: "60s", tip: "Tutorial or deeper storytelling."     },
  ],
  story_sequence: [
    { id: "3", label: "3 slides", tip: "Teaser or quick tip."   },
    { id: "5", label: "5 slides", tip: "Balanced story arc."    },
    { id: "7", label: "7 slides", tip: "Detailed walkthrough."  },
  ],
};

const DEFAULT_LENGTH: Partial<Record<ContentType, string>> = {
  instagram_caption: "medium",
  carousel_script:   "5",
  reel_script:       "15s",
  story_sequence:    "5",
};

const GENERATING_MESSAGES = [
  "Thinking in your voice...",
  "Crafting your hook...",
  "Finding your tone...",
  "Almost ready...",
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
  if (days < 7)  return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")  return <span className="rounded-full bg-voce-indigo/10 px-2 py-0.5 text-[11px] font-medium text-voce-indigo">Approved</span>;
  if (status === "scheduled") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Scheduled</span>;
  if (status === "published") return <span className="rounded-full bg-voce-teal/10 px-2 py-0.5 text-[11px] font-medium text-voce-teal">Published</span>;
  return <span className="rounded-full bg-[#F4F4F2] px-2 py-0.5 text-[11px] font-medium text-[#64748B]">Generated</span>;
}

// ── Google Photos prompt (opens Settings in new tab) ──────────────────────────

function GooglePhotosPrompt() {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-voce-indigo/10 px-3 py-2.5">
      <p className="text-xs text-voce-indigo">
        📷 Connect Google Photos in Settings to auto-match your media
      </p>
      <a
        href="/settings"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-voce-indigo px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90"
      >
        Open Settings
      </a>
    </div>
  );
}

// ── Media suggestions ──────────────────────────────────────────────────────────

interface ContentSection { label: string; text: string; }

function parseBody(body: string): { type: "reel" | "carousel" | "story" | "caption"; sections: ContentSection[] } {
  // Reel: has HOOK: label
  if (/^HOOK:/mi.test(body)) {
    const labels = body.match(/^(?:HOOK|BODY|POINT\s*\d*|CLOSE|CTA)[:\s]/mg) ?? [];
    const parts  = body.split(/^(?:HOOK|BODY|POINT\s*\d*|CLOSE|CTA)[:\s]/mi);
    const sections: ContentSection[] = labels.map((label, i) => ({
      label: label.replace(/[:\s]+$/, "").trim(),
      text:  (parts[i + 1] ?? "").trim().split("\n")[0].trim(),
    }));
    return { type: "reel", sections: sections.length > 0 ? sections : [{ label: "Script", text: "" }] };
  }
  // Carousel / Story sequence: has "Slide X" or "Frame X" / "Story X" pattern
  const slideMatch = body.match(/(?:Slide|Frame|Story|Card)\s*\d+/ig);
  if (slideMatch) {
    const isStory = /(?:Frame|Story)\s*\d+/i.test(body);
    const sections: ContentSection[] = slideMatch.map((label, i) => {
      const after = body.split(new RegExp(label, "i"))[i + 1] ?? "";
      return { label, text: after.trim().split("\n")[0].trim() };
    });
    return { type: isStory ? "story" : "carousel", sections };
  }
  return { type: "caption", sections: [{ label: "Caption", text: body }] };
}

function reelClipDesc(label: string): string {
  const l = label.toLowerCase();
  if (l === "hook")  return "energetic opening, talking directly to camera";
  if (l === "body" || l.startsWith("point")) return "demonstrating your point — action, text overlay, or talking head";
  if (l === "close" || l === "cta") return "warm, direct close — looking into the camera, clear CTA";
  return "short, punchy clip showing the concept in action";
}

const PHOTO_SLOTS = [
  { icon: "📷", kind: "Image suggestion", desc: "A close-up, candid shot — natural light, authentic expression"  },
  { icon: "📷", kind: "Image suggestion", desc: "A behind-the-scenes moment showing your process or space"        },
  { icon: "📷", kind: "Image suggestion", desc: "A lifestyle shot that reflects the mood of your caption"         },
  { icon: "📷", kind: "Image suggestion", desc: "A detail or close-up that reinforces your message"               },
];
const VIDEO_SLOTS = [
  { icon: "🎥", kind: "Video suggestion", desc: "A 3-5 second clip that matches the energy of your caption"       },
  { icon: "🎥", kind: "Video suggestion", desc: "A talking-head clip or ambient video that adds context"           },
  { icon: "🎥", kind: "Video suggestion", desc: "A quick transition or reveal that creates curiosity"              },
  { icon: "🎥", kind: "Video suggestion", desc: "A candid moment that feels authentic and unfiltered"              },
];

function mediaLabel(mediaType: string, isStory: boolean): string {
  if (mediaType === "videos") return isStory ? "Short clip" : "Short video clip";
  return isStory ? "Photo or image" : "Image";
}

function MediaSuggestions({ body, mediaType = "both" }: { body: string; mediaType?: string | null }) {
  const { type, sections } = parseBody(body);
  const mt = mediaType ?? "both";

  if (type === "reel") {
    return (
      <div className="mt-4 space-y-2 rounded-xl bg-[#F8F8FF] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Media plan</p>
        {sections.map((s, i) => (
          <div key={i} className="rounded-lg bg-white px-3 py-2.5">
            <p className="text-xs font-semibold text-[#0F172A]">{s.label}</p>
            <p className="mt-0.5 text-xs text-[#64748B]">🎥 Clip: {reelClipDesc(s.label)}</p>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-[#94A3B8]">
          You&apos;ll merge these clips into one Reel in your video editor.
        </p>
        <GooglePhotosPrompt />
      </div>
    );
  }

  if (type === "carousel" || type === "story") {
    const icon  = mt === "videos" ? "🎥" : "📷";
    const label = mediaLabel(mt, type === "story");
    return (
      <div className="mt-4 space-y-2 rounded-xl bg-[#F8F8FF] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
          {type === "story" ? "Story media plan" : "Slide media plan"}
        </p>
        {sections.map((s, i) => (
          <div key={i} className="rounded-lg bg-white px-3 py-2.5">
            <p className="text-xs font-semibold text-[#0F172A]">{s.label}</p>
            <p className="mt-0.5 text-xs text-[#64748B]">
              {icon} {label} — on-brand, minimal background, illustrates this {type === "story" ? "frame" : "slide"}
            </p>
          </div>
        ))}
        <GooglePhotosPrompt />
      </div>
    );
  }

  // Caption / LinkedIn: filter slots by mediaType
  const slots = mt === "photos" ? PHOTO_SLOTS
    : mt === "videos"  ? VIDEO_SLOTS
    : [PHOTO_SLOTS[0], PHOTO_SLOTS[1], VIDEO_SLOTS[0], VIDEO_SLOTS[1]];

  return (
    <div className="mt-4 rounded-xl bg-[#F8F8FF] p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Suggested media</p>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((s, i) => (
          <div key={i} className="rounded-lg bg-white px-3 py-2.5">
            <p className="text-xs font-semibold text-[#0F172A]">{s.icon} {s.kind}</p>
            <p className="mt-0.5 text-[11px] text-[#94A3B8]">{s.desc}</p>
          </div>
        ))}
      </div>
      <GooglePhotosPrompt />
    </div>
  );
}

// ── Content draft card ─────────────────────────────────────────────────────────

function ContentDraftCard({ draft, onStatusChange }: {
  draft: ContentDraft;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [body,         setBody]         = useState(draft.body);
  const [editing,      setEditing]      = useState(false);
  const [thumbs,       setThumbs]       = useState<"up" | "down" | null>(null);
  const [feedback,     setFeedback]     = useState<string[]>([]);
  const [status,       setStatus]       = useState(draft.status);
  const [approving,    setApproving]    = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saveState,    setSaveState]    = useState<"idle" | "saving" | "saved">("idle");
  const [copyState,    setCopyState]    = useState<"idle" | "copied">("idle");
  const [cardError,    setCardError]    = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isApproved  = status === "approved";
  const isPublished = status === "published";
  const wordCount   = body.trim() ? body.trim().split(/\s+/).length : 0;
  const previewLine = body.split("\n").find(l => l.trim()) ?? body.slice(0, 80);

  async function handleSave() {
    if (saveState !== "idle") return;
    setSaveState("saving");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("content_drafts")
        .update({ body }).eq("id", draft.id);
      if (error) throw error;
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // fallback: select textarea
      textareaRef.current?.select();
    }
  }

  async function quickApprove() {
    setApproving(true); setCardError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("content_drafts")
        .update({ status: "approved" }).eq("id", draft.id);
      if (error) throw error;
      setStatus("approved");
      onStatusChange(draft.id, "approved");
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Approve failed — check status constraint in Supabase");
    } finally {
      setApproving(false);
    }
  }

  async function handleApprove() {
    setApproving(true); setCardError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("content_drafts")
        .update({ body, status: "approved" }).eq("id", draft.id);
      if (error) throw error;
      setStatus("approved");
      onStatusChange(draft.id, "approved");
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Approve failed — check status constraint in Supabase");
    } finally {
      setApproving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true); setCardError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("content_drafts")
        .update({ status: "published" }).eq("id", draft.id);
      if (error) throw error;
      setStatus("published");
      onStatusChange(draft.id, "published");
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Could not mark as published");
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
      await supabase.from("content_drafts").update({ body: newContent }).eq("id", draft.id);
    } catch {
      // keep existing content
    } finally {
      setRegenerating(false);
    }
  }

  function toggleFeedback(r: string) {
    setFeedback(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  function toggleEdit() {
    if (editing) {
      setEditing(false);
    } else {
      setEditing(true);
      setTimeout(() => { textareaRef.current?.focus(); }, 10);
    }
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
            <p className="mt-0.5 line-clamp-1 text-xs text-[#94A3B8]">Topic: {draft.title}</p>
          )}
        </div>
        <div
          className="mt-0.5 shrink-0 text-[#94A3B8] transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}
        >
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-[#E2E2E0] px-4 pb-5 pt-4 space-y-4">

          {/* Error */}
          {cardError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {cardError}
            </div>
          )}

          {/* Textarea */}
          <div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              readOnly={!editing}
              rows={Math.max(4, body.split("\n").length + 2)}
              className={`w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed text-[#0F172A] outline-none transition ${
                editing
                  ? "bg-white ring-2 ring-voce-indigo/20"
                  : "cursor-default bg-[#F8F8FF]"
              }`}
            />
            <p className="mt-1 text-right text-xs text-[#94A3B8]">{wordCount} words</p>
          </div>

          {/* Save / Edit / Copy buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E2E0] px-3 py-1.5 text-xs font-medium text-[#64748B] transition hover:border-voce-indigo/50 hover:text-voce-indigo disabled:opacity-60"
            >
              {saveState === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saveState === "saved" ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-voce-teal" /><span className="text-voce-teal">Saved ✓</span></>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Save</>
              )}
            </button>

            <button
              onClick={toggleEdit}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                editing
                  ? "border-voce-indigo bg-voce-indigo/5 text-voce-indigo"
                  : "border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/50 hover:text-voce-indigo"
              }`}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {editing ? "Done editing" : "Edit"}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E2E0] px-3 py-1.5 text-xs font-medium text-[#64748B] transition hover:border-voce-indigo/50 hover:text-voce-indigo"
            >
              {copyState === "copied" ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-voce-teal" /><span className="text-voce-teal">Copied ✓</span></>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copy</>
              )}
            </button>
          </div>

          {/* ── Status-specific actions ── */}

          {isPublished && (
            <div className="flex items-center gap-2 text-sm font-medium text-voce-teal">
              <CheckCircle2 className="h-4 w-4" /> Published
            </div>
          )}

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

          {!isApproved && !isPublished && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Thumbs up — quick approve */}
                <button onClick={quickApprove} disabled={approving}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                    thumbs === "up"
                      ? "border-voce-teal bg-voce-teal/10 text-voce-teal"
                      : "border-[#E2E2E0] text-[#64748B] hover:border-voce-teal/50"
                  }`}>
                  {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                </button>

                {/* Thumbs down */}
                <button onClick={() => setThumbs(t => t === "down" ? null : "down")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
                    thumbs === "down"
                      ? "border-red-400 bg-red-50 text-red-500"
                      : "border-[#E2E2E0] text-[#64748B] hover:border-red-300"
                  }`}>
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>

                {/* Approve */}
                <button onClick={handleApprove} disabled={approving}
                  className="ml-auto flex min-h-[36px] items-center gap-1.5 rounded-lg bg-voce-indigo px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
                  {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
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
                    <button onClick={handleRegenerate} disabled={regenerating}
                      className="flex min-h-[36px] items-center gap-2 rounded-lg border border-voce-indigo px-3 py-1.5 text-sm font-medium text-voce-indigo transition hover:bg-voce-indigo/5 disabled:opacity-60">
                      {regenerating
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerating…</>
                        : <><RefreshCw className="h-3.5 w-3.5" /> Regenerate</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Algorithm note */}
          {draft.algorithm_note && (
            <p className="text-xs text-voce-indigo">💡 {draft.algorithm_note}</p>
          )}

          {/* Media suggestions */}
          <MediaSuggestions body={body} mediaType={draft.media_type} />

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
  const [contentLength,    setContentLength]    = useState<string>(DEFAULT_LENGTH["instagram_caption"] ?? "medium");
  const [outputLang,       setOutputLang]       = useState("English");
  const [matchMedia,       setMatchMedia]       = useState(false);
  const [mediaType,        setMediaType]        = useState<"both" | "photos" | "videos">("both");
  const [mediaYearFrom,    setMediaYearFrom]    = useState(String(THIS_YEAR - 1));
  const [mediaYearTo,      setMediaYearTo]      = useState("present");
  const [generating,       setGenerating]       = useState(false);
  const [msgIdx,           setMsgIdx]           = useState(0);
  const [error,            setError]            = useState<string | null>(null);

  // Library
  const [drafts,           setDrafts]           = useState<ContentDraft[]>([]);
  const [loadingDrafts,    setLoadingDrafts]    = useState(true);
  const [libraryFilter,    setLibraryFilter]    = useState<LibraryFilter>("all");
  const [genSuccessMsg,    setGenSuccessMsg]    = useState<string | null>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  // Reset length to default when content type changes
  useEffect(() => {
    setContentLength(DEFAULT_LENGTH[contentType] ?? "");
  }, [contentType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cycle generating messages
  useEffect(() => {
    if (!generating) { setMsgIdx(0); return; }
    const interval = setInterval(
      () => setMsgIdx(i => (i + 1) % GENERATING_MESSAGES.length),
      1500
    );
    return () => clearInterval(interval);
  }, [generating]);

  // ── Load data ──────────────────────────────────────────────────────────────────

  async function reloadDrafts() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("content_drafts")
        .select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });
      console.log("[reloadDrafts]", { count: data?.length, error });
      if (data) setDrafts(data as ContentDraft[]);
    } catch (err) {
      console.error("[reloadDrafts] error:", err);
    }
  }

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
        console.log("[load] drafts count:", draftsRes.data?.length ?? 0);
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
    setGenerating(true); setError(null); setGenSuccessMsg(null);
    console.log("[generate] clicked — topic:", topic, "audienceId:", audienceId, "variations:", variations);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      console.log("[generate] user:", user.id);

      const [personaRes, thoughtsRes] = await Promise.all([
        supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
        supabase.from("thought_notes").select("title, transcript")
          .eq("user_id", user.id).eq("status", "processed")
          .order("created_at", { ascending: false }).limit(10),
      ]);
      console.log("[generate] persona:", personaRes.data?.display_name, "thoughts:", thoughtsRes.data?.length);

      const audience = audiences.find(a => a.id === audienceId);
      if (!audience) throw new Error("Audience not found");

      const mediaLabel = mediaType === "photos" ? "photos" : mediaType === "videos" ? "videos" : "photos and videos";
      const mediaContext = matchMedia
        ? `Match with ${mediaLabel} from ${mediaYearFrom} to ${mediaYearTo === "present" ? "now" : mediaYearTo}`
        : null;

      console.log("[generate] calling API...");
      const res = await fetch("/api/generate-content", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          persona:      { ...personaRes.data, output_language: outputLang },
          audience,
          thoughtNotes: thoughtsRes.data ?? [],
          contentType,
          length:       contentLength,
          variations,
          toneOverride,
          mediaType:    matchMedia ? mediaType : null,
          dateContext:  mediaContext,
        }),
      });
      const data = await res.json();
      console.log("[generate] API response:", JSON.stringify(data).slice(0, 400));
      if (data.error) throw new Error(data.error);

      type VariationRaw = { id: number; content?: string; full_caption?: string; hashtags?: string[]; algorithm_note?: string };
      const rawVariations: VariationRaw[] = data.variations ?? [
        { id: 1, full_caption: `HOOK:\n${data.hook ?? ""}\n\nBODY:\n${data.body ?? ""}\n\nCTA:\n${data.cta ?? ""}` },
      ];
      console.log("[generate] parsed", rawVariations.length, "variations");

      // Save every variation immediately — surface any DB error visibly
      // platform is intentionally null — the CHECK constraint only allows a fixed list
      // and audience platforms may contain values outside that list (tiktok, facebook, etc.)
      const inserts = rawVariations.map(v => {
        const caption = v.full_caption ?? v.content ?? "";
        const body = v.hashtags?.length ? `${caption}\n\n${v.hashtags.join(" ")}` : caption;
        return {
          user_id:        user.id,
          title:          topic,
          body,
          platform:       null,
          status:         "generated",
          algorithm_note: v.algorithm_note ?? null,
          media_type:     matchMedia ? mediaType : null,
        };
      });

      console.log("[generate] saving to content_drafts...", inserts.map(i => ({ user_id: i.user_id, status: i.status, platform: i.platform })));
      const { data: saved, error: saveErr } = await supabase
        .from("content_drafts").insert(inserts).select();
      console.log("[generate] saved:", saved?.length ?? 0, "saveErr:", saveErr ? JSON.stringify(saveErr) : null);

      // Verify the rows actually landed in the DB
      const { data: verify } = await supabase
        .from("content_drafts")
        .select("id, status, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      console.log("DB verify after save:", verify);

      if (saveErr) {
        // Surface DB error — still show content but warn user
        setError(`Saved to screen but DB write failed: ${saveErr.message}. Check your content_drafts constraints.`);
        // Put the variations in drafts as temporary in-memory items
        const tempDrafts = rawVariations.map((v, i) => {
          const caption = v.full_caption ?? v.content ?? "";
          const body = v.hashtags?.length ? `${caption}\n\n${v.hashtags.join(" ")}` : caption;
          return {
            id:             `temp-${Date.now()}-${i}`,
            title:          topic,
            body,
            platform:       audience.platforms?.[0] ?? null,
            status:         "generated",
            created_at:     new Date().toISOString(),
            algorithm_note: v.algorithm_note ?? null,
            media_type:     matchMedia ? mediaType : null,
          } as ContentDraft;
        });
        setDrafts(prev => [...tempDrafts, ...prev]);
      } else if (saved) {
        setDrafts(prev => [...(saved as ContentDraft[]), ...prev]);
        setGenSuccessMsg(`${saved.length} post${saved.length !== 1 ? "s" : ""} generated ✓`);
        setTimeout(() => setGenSuccessMsg(null), 4000);
      }

      setGenOpen(false);
      // Scroll to library
      setTimeout(() => libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      console.error("[generate] error:", msg);
      setError(`Something went wrong — ${msg}`);
    } finally {
      setGenerating(false);
    }
  }

  // ── Library helpers ────────────────────────────────────────────────────────────

  function handleStatusChange(id: string, newStatus: string) {
    // Update local state immediately for instant UI feedback
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    // Then refetch from Supabase to confirm DB state and sync tab counts
    reloadDrafts();
  }

  const filteredDrafts = drafts.filter(d => {
    if (libraryFilter === "generated") return d.status === "generated";
    if (libraryFilter === "approved")  return d.status === "approved";
    if (libraryFilter === "scheduled") return d.status === "scheduled";
    if (libraryFilter === "published") return d.status === "published";
    return true; // "all" tab
  });

  const selectedAudience = audiences.find(a => a.id === audienceId);

  return (
    <div>
      <div className="mb-6 pr-8 md:pr-0">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Content</h1>
        <p className="mt-1 text-sm text-[#64748B]">Your voice. Your audience. In seconds.</p>
      </div>

      {/* ── Generation panel ── */}
      <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
        {/* Header */}
        <button
          onClick={() => { if (!generating) setGenOpen(v => !v); }}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#FAFAF8]"
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
            genOpen ? "bg-voce-indigo text-white" : "bg-voce-indigo/10 text-voce-indigo"
          }`}>
            <Plus className="h-4 w-4" />
          </div>
          <span className="flex-1 text-sm font-semibold text-[#0F172A]">Generate new content</span>
          {!generating && (
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-200"
              style={{ transform: genOpen ? "rotate(180deg)" : "none" }}
            />
          )}
        </button>

        {/* Body */}
        {genOpen && (
          <div className="border-t border-[#E2E2E0]">
            {generating ? (
              /* Generating animation */
              <div className="flex flex-col items-center gap-5 py-14">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-voce-indigo/10 animate-pulse">
                  <Sparkles className="h-8 w-8 text-voce-indigo" />
                </div>
                <p className="text-sm font-medium text-voce-indigo transition-all duration-500">
                  {GENERATING_MESSAGES[msgIdx]}
                </p>
              </div>
            ) : (
              <div className="px-5 pb-6 pt-5 space-y-6">

                {/* STEP 1 — Audience */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Step 1 — Choose your audience
                  </p>
                  {loadingAudiences ? (
                    <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : audiences.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      No audiences yet.{" "}
                      <a href="/my-persona" className="font-semibold underline">Create one first →</a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select value={audienceId} onChange={e => setAudienceId(e.target.value)} className={inputCls}>
                        {audiences.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      {selectedAudience?.description && (
                        <p className="px-1 text-xs text-[#94A3B8]">{selectedAudience.description}</p>
                      )}
                      <a href="/my-persona"
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

                  {LENGTH_OPTIONS[contentType] && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#0F172A]">
                        Length <span className="font-normal text-[#94A3B8]">— choose what performs best</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {LENGTH_OPTIONS[contentType]!.map(opt => (
                          <button key={opt.id} type="button" onClick={() => setContentLength(opt.id)}
                            className={[
                              "flex flex-col items-start rounded-lg border px-3 py-2 text-left transition",
                              contentLength === opt.id
                                ? "border-voce-indigo bg-voce-indigo/5"
                                : "border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/50",
                            ].join(" ")}>
                            <span className={`text-sm font-medium ${contentLength === opt.id ? "text-voce-indigo" : ""}`}>{opt.label}</span>
                            <span className="mt-0.5 text-[10px] text-[#94A3B8]">{opt.tip}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                      <select value={toneOverride}
                        onChange={e => setToneOverride(e.target.value as ToneOverride)}
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

                {/* STEP 3 — Media (YES/NO always visible) */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Step 3 — Match with your media
                    <span className="ml-2 font-normal normal-case text-[#94A3B8]">optional</span>
                  </p>
                  <p className="mb-2 text-sm font-medium text-[#0F172A]">
                    Match content with photos/videos from my library?
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

                  {matchMedia && (
                    <div className="mt-4 space-y-4 rounded-xl bg-[#F8F8FF] p-4">

                      {/* Media type chips */}
                      <div>
                        <p className="mb-2 text-xs font-medium text-[#64748B]">Media type</p>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { id: "both",   label: "📷🎥 Both"         },
                            { id: "photos", label: "📷 Photos only"    },
                            { id: "videos", label: "🎥 Videos only"    },
                          ] as const).map(opt => (
                            <button key={opt.id} type="button" onClick={() => setMediaType(opt.id)}
                              className={[
                                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                                mediaType === opt.id
                                  ? "bg-voce-indigo text-white"
                                  : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/50",
                              ].join(" ")}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

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

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || !audienceId}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-voce-indigo text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
                >
                  <Sparkles className="h-5 w-5" /> Generate Content
                </button>

              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content library ── */}
      <div className="mt-8" ref={libraryRef}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F172A]">Content library</h2>
          {genSuccessMsg && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-voce-teal">
              <CheckCircle2 className="h-4 w-4" /> {genSuccessMsg}
            </span>
          )}
        </div>

        <div className="mb-4 flex rounded-xl bg-[#F4F4F2] p-1">
          {LIBRARY_TABS.map(tab => (
            <button key={tab.id} onClick={() => setLibraryFilter(tab.id)}
              className={[
                "flex min-h-[36px] flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all",
                libraryFilter === tab.id
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#94A3B8] hover:text-[#64748B]",
              ].join(" ")}>
              {tab.label}
            </button>
          ))}
        </div>

        {loadingDrafts ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-voce-indigo" />
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] py-14 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-[#E2E2E0]" />
            <p className="text-sm font-medium text-[#0F172A]">No content here yet</p>
            <p className="mt-1 text-xs text-[#94A3B8]">Generate your first post above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDrafts.map(d => (
              <ContentDraftCard
                key={d.id}
                draft={d}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
