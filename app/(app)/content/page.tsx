"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Plus, AlertCircle,
  Camera, Edit2, CheckCircle2, Copy, Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type ContentType   = "instagram_caption" | "carousel_script" | "reel_script" | "story_sequence" | "linkedin_post";
type ToneOverride  = "persona" | "casual" | "bold" | "vulnerable" | "educational";
type LibraryFilter = "generated" | "approved" | "scheduled" | "published";

interface ContentDraft {
  id: string;
  title: string | null;
  body: string;
  platform: string | null;
  status: string;
  created_at: string;
  algorithm_note: string | null;
  format_tip: string | null;
  draft_hook: string | null;
  draft_body: string | null;
  draft_cta: string | null;
  media_type: string | null;
  media_year_from: string | null;
  media_year_to: string | null;
  content_type: string | null;
  length: string | null;
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
  "Wrong energy", "Good ideas, wrong words", "Too long",
  "Not specific enough",
] as const;

const LIBRARY_TABS: { id: LibraryFilter; label: string }[] = [
  { id: "generated", label: "Generated" },
  { id: "approved",  label: "Approved"  },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
];

const LENGTH_OPTIONS: Partial<Record<ContentType, { id: string; label: string; tip: string }[]>> = {
  instagram_caption: [
    { id: "extra_short", label: "Extra Short", tip: "30–50 words — one punchy thought."         },
    { id: "short",       label: "Short",       tip: "80–100 words — best for reach."            },
    { id: "medium",      label: "Medium",      tip: "150–200 words — storytelling sweet spot."  },
    { id: "long",        label: "Long",        tip: "250–300 words — great for saves."          },
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

function cleanContent(text: string): string {
  return text
    .replace(/  +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ \n/g, "\n")
    .replace(/\n /g, "\n")
    .trim();
}

function countWords(text: string): number {
  return text
    .split("\n")
    .filter(line => !line.trim().startsWith("#"))
    .join(" ")
    .split(/\s+/)
    .filter(w => w.length > 0 && !w.startsWith("#"))
    .length;
}

function enforceWordLimit(text: string, maxWords: number): string {
  if (countWords(text) <= maxWords) return text;
  const allWords     = text.trim().split(/\s+/);
  const bodyWords    = allWords.filter(w => !w.startsWith("#"));
  const hashtagWords = allWords.filter(w => w.startsWith("#"));

  // Try to end at a complete sentence within maxWords + small buffer
  const candidate = bodyWords.slice(0, maxWords + 10).join(" ");
  const sentences  = candidate.match(/[^.!?]+[.!?]+/g) ?? [];
  let result = "";
  let wc = 0;
  for (const sentence of sentences) {
    const sw = sentence.split(/\s+/).length;
    if (wc + sw <= maxWords + 10) { result += sentence; wc += sw; }
    else break;
  }

  const truncated = result.trim() || bodyWords.slice(0, maxWords).join(" ") + "...";
  return hashtagWords.length > 0 ? `${truncated}\n\n${hashtagWords.join(" ")}` : truncated;
}

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

// ── Google Photos prompt / photo grid ─────────────────────────────────────────

function GooglePhotosPrompt({ photosConnected }: { photosConnected: boolean }) {
  if (photosConnected) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#F4F4F2] px-3 py-2.5">
      <p className="text-xs text-[#64748B]">
        📷 Connect Google Photos in Settings to auto-match your media
      </p>
      <a
        href="/settings"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg border border-[#E2E2E0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#64748B] transition hover:bg-[#F4F4F2]"
      >
        Connect
      </a>
    </div>
  );
}

interface PhotoItem { id: string; url: string; type: string; taken_at: string | null; }

function PhotoGrid({ mediaType, yearFrom, yearTo }: {
  mediaType: string | null;
  yearFrom?: string | null;
  yearTo?: string | null;
}) {
  const [photos,   setPhotos]   = useState<PhotoItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const start = yearFrom ?? "2018";
        const end   = (!yearTo || yearTo === "present")
          ? String(new Date().getFullYear())
          : yearTo;

        console.log("[photos] yearFrom:", start, "yearTo:", end, "type filter:", mediaType);

        let query = supabase.from("photo_library")
          .select("id, url, type, taken_at")
          .eq("user_id", user.id)
          .gte("taken_at", `${start}-01-01T00:00:00Z`)
          .lte("taken_at", `${end}-12-31T23:59:59Z`)
          .order("taken_at", { ascending: false })
          .limit(20);
        if (mediaType === "photos") query = query.eq("type", "photo") as typeof query;
        if (mediaType === "videos") query = query.eq("type", "video") as typeof query;
        const { data, error } = await query;

        console.log("[photos] results:", data?.length ?? 0, "| first taken_at:", data?.[0]?.taken_at ?? "none", "| error:", error?.message ?? "none");
        setPhotos((data as PhotoItem[]) ?? []);
      } finally { setLoading(false); }
    }
    load();
  }, [mediaType, yearFrom, yearTo]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < 10) { next.add(id); }
      return next;
    });
  }

  if (loading) return (
    <div className="mt-3 flex h-10 items-center justify-center">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#94A3B8]" />
    </div>
  );
  if (photos.length === 0) {
    const typeLabel = mediaType === "videos" ? "videos" : mediaType === "photos" ? "photos" : "photos or videos";
    const rangeLabel = yearFrom && yearTo && yearTo !== "present"
      ? `${yearFrom}–${yearTo}` : yearFrom ? `${yearFrom} onwards` : "the selected period";
    return (
      <p className="mt-3 text-xs text-[#94A3B8]">
        No {typeLabel} found from {rangeLabel} — try a different year range or{" "}
        <a href="/settings" className="text-voce-indigo underline">sync your library in Settings</a>.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">From your library</p>
        {selected.size > 0 && (
          <span className="text-[10px] font-medium text-voce-indigo">{selected.size} selected</span>
        )}
      </div>
      <p className="mb-2 text-[10px] text-[#94A3B8]">Tap to select · up to 10 for carousel</p>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map(p => {
          const isSelected = selected.has(p.id);
          return (
            <button key={p.id} type="button" onClick={() => toggleSelect(p.id)}
              className={`relative aspect-square overflow-hidden rounded-lg transition ${
                isSelected ? "ring-2 ring-voce-indigo ring-offset-1" : "opacity-90 hover:opacity-100"
              }`}>
              {p.type === "video"
                ? <div className="flex h-full w-full items-center justify-center bg-[#F4F4F2] text-xl">🎥</div>
                : <img src={`${p.url}=w200-h200-c`} alt="" className="h-full w-full object-cover" />}
              {isSelected && (
                <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-voce-indigo">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Picker photo type (shared) ────────────────────────────────────────────────

interface PickerPhoto { id: string; baseUrl: string; mimeType: string; type: string; }

interface MediaPlanItem {
  mediaIndex:        number;
  role:              string;
  matchesMoment:     string;
  whyItWorks:        string;
  howToUse:          string;
  editingSuggestion: string;
}

// ── Picker media plan ──────────────────────────────────────────────────────────

function PickerMediaPlan({ body, contentType, photos }: {
  body:        string;
  contentType: string;
  photos:      PickerPhoto[];
}) {
  const [plan,    setPlan]    = useState<MediaPlanItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function generatePlan() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/match-media", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ caption: body, contentType, photos }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan(data.mediaplan ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate media plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-[#F8F8FF] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">📽️ Media Plan</p>
        {plan ? (
          <button onClick={generatePlan} disabled={loading}
            className="text-xs text-voce-indigo hover:underline disabled:opacity-60">
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        ) : (
          <button onClick={generatePlan} disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-voce-indigo px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
            {loading
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Matching…</>
              : "Match media →"}
          </button>
        )}
      </div>

      {/* Thumbnail strip before plan loads */}
      {!plan && !loading && (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.slice(0, 8).map(photo => (
            <div key={photo.id} className="aspect-square overflow-hidden rounded-lg bg-[#E2E2E0]">
              {photo.type === "video"
                ? <div className="flex h-full w-full items-center justify-center text-lg">🎥</div>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={`${photo.baseUrl}=w150-h150-c`} alt="" className="h-full w-full object-cover" />}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Plan results */}
      {plan && plan.map((item, i) => {
        const photo = photos[item.mediaIndex];
        if (!photo) return null;
        return (
          <div key={i} className="flex gap-3 rounded-xl bg-white p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#E2E2E0]">
              {photo.type === "video"
                ? <div className="flex h-full w-full items-center justify-center text-xl">🎥</div>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={`${photo.baseUrl}=w128-h128-c`} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <span className="inline-block rounded-full bg-voce-indigo/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-voce-indigo">
                {item.role}
              </span>
              <p className="text-xs font-medium text-[#0F172A]">{item.matchesMoment}</p>
              <p className="text-[11px] text-[#64748B]">{item.whyItWorks}</p>
              {item.howToUse && (
                <p className="text-[11px] text-voce-indigo">→ {item.howToUse}</p>
              )}
              {item.editingSuggestion && (
                <p className="text-[10px] italic text-[#94A3B8]">{item.editingSuggestion}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Slide helpers ──────────────────────────────────────────────────────────────

const SLIDE_PATTERN = /(?:Slide|Frame|Story|Card)\s*\d+[:\s]*/gi;

function hasSlides(text: string): boolean {
  return SLIDE_PATTERN.test(text);
}

function parseSlides(text: string): string[] {
  // Split on "Slide X:", "Frame X:", "Story X:", "Card X:" — strip the label, keep the content
  return text.split(/(?:Slide|Frame|Story|Card)\s*\d+[:\s]*/i)
    .map(s => s.trim())
    .filter(Boolean);
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

function MediaSuggestions({ body, mediaType = "both", photosConnected = false, yearFrom, yearTo }: {
  body: string; mediaType?: string | null; photosConnected?: boolean;
  yearFrom?: string | null; yearTo?: string | null;
}) {
  const { type, sections } = parseBody(body);
  const mt = mediaType ?? "both";
  // Only show PhotoGrid when connected AND media matching was used (mediaType is set)
  const showGrid = photosConnected && !!mediaType;

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
        {showGrid ? <PhotoGrid mediaType={mt} yearFrom={yearFrom} yearTo={yearTo} /> : <GooglePhotosPrompt photosConnected={photosConnected} />}
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
        {showGrid ? <PhotoGrid mediaType={mt} yearFrom={yearFrom} yearTo={yearTo} /> : <GooglePhotosPrompt photosConnected={photosConnected} />}
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
      {showGrid ? <PhotoGrid mediaType={mt} yearFrom={yearFrom} yearTo={yearTo} /> : <GooglePhotosPrompt photosConnected={photosConnected} />}
    </div>
  );
}

// ── Content draft card ─────────────────────────────────────────────────────────

function ContentDraftCard({ draft, onStatusChange, onDelete, photosConnected, isNew = false, onRead, pickerPhotos = [] }: {
  draft: ContentDraft;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  photosConnected: boolean;
  isNew?: boolean;
  onRead?: (id: string) => void;
  pickerPhotos?: PickerPhoto[];
}) {
  const [expanded,      setExpanded]     = useState(false);
  const [body,          setBody]         = useState(draft.body);
  const [draftHook,     setDraftHook]    = useState(draft.draft_hook);
  const [draftBody,     setDraftBody]    = useState(draft.draft_body);
  const [draftCta,      setDraftCta]     = useState(draft.draft_cta);
  const [editing,       setEditing]      = useState(false);
  const [showFeedback,  setShowFeedback] = useState(false);
  const [feedback,      setFeedback]     = useState<string[]>([]);
  const originalBodyRef = useRef(draft.body);
  const [status,       setStatus]       = useState(draft.status);
  const [approving,    setApproving]    = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saveState,    setSaveState]    = useState<"idle" | "saving" | "saved">("idle");
  const [copyState,    setCopyState]    = useState<"idle" | "copied">("idle");
  const [cardError,    setCardError]    = useState<string | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isApproved  = status === "approved";
  const isPublished = status === "published";
  const wordCount   = body.trim() ? body.trim().split(/\s+/).length : 0;
  const previewLine = draft.draft_hook ?? body.split("\n").find(l => l.trim()) ?? body.slice(0, 80);
  const hashtags    = body.match(/#[^\s#]+/g) ?? [];


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

  async function handleDelete() {
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true); setCardError(null);
    console.log("[delete] attempting:", draft.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("content_drafts").delete().eq("id", draft.id);
      console.log("[delete] result:", error);
      if (error) throw error;
      onDelete(draft.id);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRegenerate() {
    if (feedback.length === 0 || regenerating) return;
    setShowFeedback(false);
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

      const feedbackContext =
        `The creator rejected this content because: ${feedback.join(", ")}

Original rejected content:
${body}

Write a completely different version that addresses these specific issues. ` +
        (feedback.includes("Not my voice")
          ? "Go deeper into their actual speech patterns from the voice notes — use their exact vocabulary and rhythm. "
          : "") +
        (feedback.includes("Too formal")
          ? "Make it rawer and more conversational — less polished, more human. "
          : "") +
        (feedback.includes("Too salesy")
          ? "Pull back the sell entirely, lead with the story and let the value speak. "
          : "") +
        "Every word must sound like it came from them, no one else.";

      const draftContentType = (draft.content_type ?? "instagram_caption") as ContentType;
      const draftLength      = draft.length ?? undefined;
      const isReelRegen      = draftContentType === "reel_script";

      console.log("[regenerate] calling API with feedback:", feedback.join(", "), "| topic:", draft.title, "| contentType:", draftContentType);

      const res = await fetch("/api/generate-content", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:           draft.title ?? "content",
          persona:         personaRes.data,
          audience:        { name: "General", platforms: [draft.platform ?? "instagram"] },
          thoughtNotes:    thoughtsRes.data ?? [],
          contentType:     draftContentType,
          length:          draftLength,
          variations:      1,
          toneOverride:    "persona",
          feedbackContext,
        }),
      });
      const data = await res.json();
      console.log("[regenerate] API response:", JSON.stringify(data).slice(0, 300));

      if (data.error) throw new Error(data.error);

      const variation = data.variations?.[0];
      if (!variation) throw new Error("No variation returned from API");

      // Enforce hashtag limit on regenerated content
      if (variation.hashtags) {
        variation.hashtags = variation.hashtags
          .filter((t: string, i: number, self: string[]) => self.indexOf(t) === i)
          .slice(0, 5);
      }

      const newBody = cleanContent(variation.full_caption ?? variation.content ?? body);

      // Update both local state AND the DB
      setBody(newBody);
      setDraftHook(isReelRegen ? null : (variation.hook ? cleanContent(variation.hook) : null));
      setDraftBody(isReelRegen ? null : (variation.body ? cleanContent(variation.body) : null));
      setDraftCta(isReelRegen  ? null : (variation.cta  ? cleanContent(variation.cta)  : null));
      setFeedback([]);

      const { error: updateErr } = await supabase.from("content_drafts").update({
        body:           newBody,
        draft_hook:     isReelRegen ? null : (variation.hook ? cleanContent(variation.hook) : null),
        draft_body:     isReelRegen ? null : (variation.body ? cleanContent(variation.body) : null),
        draft_cta:      isReelRegen ? null : (variation.cta  ? cleanContent(variation.cta)  : null),
        algorithm_note: `Regenerated after rejection: ${feedback.join(", ")}`,
      }).eq("id", draft.id);

      if (updateErr) console.error("[regenerate] DB update error:", updateErr.message);
      else console.log("[regenerate] saved successfully for draft:", draft.id);

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Regeneration failed";
      console.error("[regenerate] error:", msg);
      setCardError(msg);
    } finally {
      setRegenerating(false);
    }
  }

  function toggleFeedback(r: string) {
    setFeedback(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  async function toggleEdit() {
    if (editing) {
      setEditing(false);
      if (body !== originalBodyRef.current) {
        setSaveState("saving");
        try {
          const supabase = createClient();
          await supabase.from("content_drafts").update({ body }).eq("id", draft.id);
          console.log("[edit] saved. original:", originalBodyRef.current.slice(0, 80), "→ edited:", body.slice(0, 80));
          originalBodyRef.current = body;
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        } catch { setSaveState("idle"); }
      }
    } else {
      setEditing(true);
      setExpanded(true);
      setTimeout(() => { textareaRef.current?.focus(); }, 10);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={() => {
          const opening = !expanded;
          setExpanded(opening);
          if (opening) onRead?.(draft.id);
        }}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#FAFAF8]"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {isNew && (
              <span className="rounded-full bg-voce-indigo px-2.5 py-0.5 text-[11px] font-semibold text-white">
                New ✨
              </span>
            )}
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

      {/* Error — always visible */}
      {cardError && (
        <div className="mx-4 mb-1 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {cardError}
        </div>
      )}

      {/* Edit | Copy | Regenerate — always visible */}
      <div className="grid grid-cols-3 gap-px border-t border-[#F4F4F2] bg-[#F4F4F2]">
        <button onClick={toggleEdit}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 bg-white text-xs font-medium transition ${
            editing ? "text-voce-indigo" : "text-[#64748B] hover:text-voce-indigo"
          }`}>
          {saveState === "saving"
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : saveState === "saved" && !editing
            ? <><CheckCircle2 className="h-3.5 w-3.5 text-voce-teal" /><span className="text-voce-teal">Saved</span></>
            : <><Edit2 className="h-3.5 w-3.5" />{editing ? " Done" : " Edit"}</>}
        </button>
        <button onClick={handleCopy}
          className="flex min-h-[40px] items-center justify-center gap-1.5 bg-white text-xs font-medium text-[#64748B] transition hover:text-voce-indigo">
          {copyState === "copied"
            ? <><CheckCircle2 className="h-3.5 w-3.5 text-voce-teal" /><span className="text-voce-teal">Copied</span></>
            : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
        <button onClick={() => { setShowFeedback(v => !v); setFeedback([]); }}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 bg-white text-xs font-medium transition ${
            showFeedback ? "text-amber-700" : "text-[#64748B] hover:text-amber-700"
          }`}>
          {regenerating
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
            : <><RefreshCw className="h-3.5 w-3.5" /> Regenerate</>}
        </button>
      </div>

      {/* Feedback chips — shown when Regenerate clicked */}
      {showFeedback && (
        <div className="border-t border-[#F4F4F2] space-y-2 px-4 py-3">
          <p className="text-xs font-medium text-[#64748B]">What was off?</p>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_REASONS.map(r => (
              <button key={r} type="button" onClick={() => toggleFeedback(r)}
                className={["rounded-full px-2.5 py-1 text-xs font-medium transition",
                  feedback.includes(r) ? "bg-amber-100 text-amber-700" : "border border-[#E2E2E0] text-[#64748B] hover:border-amber-300"].join(" ")}>
                {r}
              </button>
            ))}
          </div>
          {feedback.length > 0 && (
            <button onClick={handleRegenerate} disabled={regenerating}
              className="flex min-h-[36px] w-full items-center justify-center gap-2 rounded-lg bg-voce-indigo text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {regenerating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerating…</>
                : <><RefreshCw className="h-3.5 w-3.5" /> Regenerate with feedback</>}
            </button>
          )}
        </div>
      )}

      {/* Expanded — full caption + approve + delete */}
      {expanded && (
        <div className="border-t border-[#E2E2E0] px-4 pb-5 pt-4 space-y-4">

          {/* Content display — structured when hook/body/cta available, textarea when editing */}
          {editing ? (
            <div>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={Math.max(4, body.split("\n").length + 2)}
                className="w-full resize-none rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-[#0F172A] outline-none ring-2 ring-voce-indigo/20 transition"
              />
              <p className="mt-1 text-right text-xs text-[#94A3B8]">{wordCount} words</p>
            </div>
          ) : draftHook ? (
            <div className="space-y-4 rounded-xl bg-[#F8F8FF] p-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Hook</p>
                <p className="text-base font-semibold leading-snug text-[#0F172A]">{draftHook}</p>
              </div>
              {draftBody && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Body</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[#0F172A]">{draftBody}</p>
                </div>
              )}
              {draftCta && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">CTA</p>
                  <p className="text-sm font-medium text-voce-indigo">{draftCta}</p>
                </div>
              )}
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map(h => (
                    <span key={h} className="rounded-full bg-[#E8E8FF] px-2.5 py-0.5 text-[11px] font-medium text-voce-indigo">{h}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {hasSlides(body) ? (
                <div className="space-y-2">
                  {parseSlides(body).map((slide, i) => (
                    <div key={i} className="rounded-xl bg-[#F8F8FF] px-4 py-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Slide {i + 1}</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-[#0F172A]">{slide}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={body}
                  readOnly
                  rows={Math.max(4, body.split("\n").length + 2)}
                  className="w-full cursor-default resize-none rounded-xl bg-[#F8F8FF] px-4 py-3 text-sm leading-relaxed text-[#0F172A] outline-none"
                />
              )}
              <p className="mt-1 text-right text-xs text-[#94A3B8]">{wordCount} words</p>
            </div>
          )}

          {/* ── Approve (only when not approved/published) ── */}
          {!isApproved && !isPublished && (
            <button onClick={handleApprove} disabled={approving || deleting}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-voce-indigo text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              ✓ Approve
            </button>
          )}

          {/* Approved / Published status */}
          {isApproved && !isPublished && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-voce-indigo">
                <CheckCircle2 className="h-4 w-4" /> Approved ✓
              </p>
              <button onClick={handlePublish} disabled={publishing}
                className="flex min-h-[40px] items-center gap-2 rounded-xl bg-voce-teal px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark as published
              </button>
            </div>
          )}
          {isPublished && (
            <p className="flex items-center gap-2 text-sm font-medium text-voce-teal">
              <CheckCircle2 className="h-4 w-4" /> Published
            </p>
          )}

          {/* Delete */}
          <button onClick={handleDelete} disabled={deleting || approving}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-medium text-red-400 transition hover:bg-red-50 disabled:opacity-60">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>

          {/* Media suggestions — picker-aware */}
          {pickerPhotos.length > 0 ? (
            <PickerMediaPlan
              body={body}
              contentType={draft.content_type ?? "instagram_caption"}
              photos={pickerPhotos}
            />
          ) : (
            <MediaSuggestions body={body} mediaType={draft.media_type} photosConnected={photosConnected}
              yearFrom={draft.media_year_from} yearTo={draft.media_year_to} />
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
  const [contentLength,    setContentLength]    = useState<string>(DEFAULT_LENGTH["instagram_caption"] ?? "medium");
  const [outputLang,       setOutputLang]       = useState("English");
  const [matchMedia,       setMatchMedia]       = useState(false);
  const [pickerPhotos,     setPickerPhotos]     = useState<{ id: string; baseUrl: string; mimeType: string; type: string }[]>([]);
  const [pickerLoading,    setPickerLoading]    = useState(false);
  const [pickerError,      setPickerError]      = useState<string | null>(null);
  const [generating,       setGenerating]       = useState(false);
  const [msgIdx,           setMsgIdx]           = useState(0);
  const [error,            setError]            = useState<string | null>(null);

  // Library
  const [drafts,           setDrafts]           = useState<ContentDraft[]>([]);
  const [loadingDrafts,    setLoadingDrafts]    = useState(true);
  const [libraryFilter,    setLibraryFilter]    = useState<LibraryFilter>("generated");
  const [genSuccessMsg,    setGenSuccessMsg]    = useState<string | null>(null);
  const [photosConnected,  setPhotosConnected]  = useState(false);
  const [newDraftIds,      setNewDraftIds]      = useState<Set<string>>(new Set());
  const libraryRef = useRef<HTMLDivElement>(null);

  // Reload drafts whenever the user returns to this browser tab
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") reloadDrafts();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function openGooglePhotosPicker() {
    setPickerLoading(true); setPickerError(null);
    try {
      const sessionRes = await fetch("/api/photos/create-session", { method: "POST" });
      const { sessionId, pickerUri, pollIntervalMs, error: sessErr } = await sessionRes.json();
      if (sessErr) throw new Error(sessErr);

      const popup = window.open(pickerUri, "GooglePhotosPicker", "width=650,height=750,scrollbars=yes,resizable=yes");
      if (!popup) throw new Error("Popup blocked — please allow popups for this site and try again.");

      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(interval);
              // Final check after user closes popup
              const finalRes = await fetch(`/api/photos/get-selected?sessionId=${sessionId}`);
              const { ready, items, error: finalErr } = await finalRes.json();
              if (finalErr) { reject(new Error(finalErr)); return; }
              if (ready && items?.length > 0) setPickerPhotos(items);
              resolve();
              return;
            }
            const pollRes = await fetch(`/api/photos/get-selected?sessionId=${sessionId}`);
            const { ready, items, error: pollErr } = await pollRes.json();
            if (pollErr) { clearInterval(interval); popup.close(); reject(new Error(pollErr)); return; }
            if (ready) { clearInterval(interval); popup.close(); setPickerPhotos(items ?? []); resolve(); }
          } catch (e) { clearInterval(interval); popup.close(); reject(e); }
        }, pollIntervalMs ?? 2000);

        // 10 minute safety timeout
        setTimeout(() => { clearInterval(interval); popup.close(); reject(new Error("Picker timed out — please try again.")); }, 600_000);
      });
    } catch (err) {
      setPickerError(err instanceof Error ? err.message : "Failed to open photo picker");
    } finally {
      setPickerLoading(false);
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
          supabase.from("persona_profile").select("output_language, google_photos_connected")
            .eq("user_id", user.id).single(),
          supabase.from("content_drafts").select("*")
            .eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);
        const list = (audRes.data as Audience[]) ?? [];
        setAudiences(list);
        if (list.length > 0) setAudienceId(list[0].id);
        if (personaRes.data?.output_language) setOutputLang(personaRes.data.output_language);
        setPhotosConnected(personaRes.data?.google_photos_connected === true);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log("[generate] clicked — topic:", topic, "audienceId:", audienceId, "variations:", variations);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      console.log("[generate] user:", user.id);

      const [personaRes, thoughtsRes] = await Promise.all([
        supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
        supabase.from("thought_notes").select("title, transcript, ideas, standout_phrases, themes, created_at")
          .eq("user_id", user.id).eq("status", "processed")
          .order("created_at", { ascending: false }).limit(10),
      ]);
      console.log("[generate] persona:", personaRes.data?.display_name, "thoughts:", thoughtsRes.data?.length);

      const audience = audiences.find(a => a.id === audienceId);
      if (!audience) throw new Error("Audience not found");

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
          selectedMediaContext: pickerPhotos.length > 0 ? {
            count:     pickerPhotos.length,
            types:     pickerPhotos.map(p => p.type),
            hasVideos: pickerPhotos.some(p => p.type === "video"),
          } : null,
        }),
      });
      const data = await res.json();
      console.log("[generate] API response:", JSON.stringify(data).slice(0, 400));
      if (data.error) throw new Error(data.error);

      type VariationRaw = { id: number; content?: string; hook?: string; body?: string; cta?: string; full_caption?: string; hashtags?: string[] };
      const rawVariations: VariationRaw[] = data.variations ?? [
        { id: 1, full_caption: `HOOK:\n${data.hook ?? ""}\n\nBODY:\n${data.body ?? ""}\n\nCTA:\n${data.cta ?? ""}` },
      ];
      console.log("[generate] parsed", rawVariations.length, "variation(s)");

      // Hard-enforce ≤5 unique hashtags regardless of what the AI returns
      rawVariations.forEach(v => {
        if (v.hashtags) {
          v.hashtags = v.hashtags.filter((t, i, self) => self.indexOf(t) === i).slice(0, 5);
        }
      });

      // Save every variation immediately — surface any DB error visibly
      // platform is intentionally null — the CHECK constraint only allows a fixed list
      // and audience platforms may contain values outside that list (tiktok, facebook, etc.)
      const maxCaptionWords =
        contentType === "instagram_caption"
          ? contentLength === "extra_short" ? 50 : contentLength === "short" ? 100 : contentLength === "medium" ? 200 : contentLength === "long" ? 300 : null
          : contentType === "reel_script"
          ? contentLength === "7s" ? 20 : contentLength === "15s" ? 40 : contentLength === "30s" ? 80 : contentLength === "60s" ? 160 : null
          : null;
      console.log("[wordcount] setup — contentType:", JSON.stringify(contentType), "contentLength:", JSON.stringify(contentLength), "maxCaptionWords:", maxCaptionWords, "rawVariations:", rawVariations.length);
      const inserts = rawVariations.map(v => {
        const rawCaption = v.full_caption ?? v.content ?? "";
        console.log("[wordcount] full_caption words:", rawCaption.split(" ").length, "limit:", maxCaptionWords, "contentType:", contentType, "length:", contentLength);
        const cleaned = cleanContent(rawCaption);
        const body    = maxCaptionWords ? enforceWordLimit(cleaned, maxCaptionWords) : cleaned;
        const wc      = body.split(/\s+/).filter(Boolean).length;
        console.log("[wordcount] after enforcement:", wc, "enforced:", maxCaptionWords !== null);
        return {
          user_id:        user.id,
          title:          topic,
          body,
          platform:       null,
          status:       "generated",
          content_type: contentType,
          length:       contentLength,
          // Reels display as a single spoken block — don't break into labelled sections
          draft_hook: contentType === "reel_script" ? null : (v.hook ? cleanContent(v.hook) : null),
          draft_body: contentType === "reel_script" ? null : (v.body ? cleanContent(v.body) : null),
          draft_cta:  contentType === "reel_script" ? null : (v.cta  ? cleanContent(v.cta)  : null),
          media_type:      null,
          media_year_from: null,
          media_year_to:   null,
        };
      });

      console.log("[generate] inserting with status:", inserts[0]?.status, "count:", inserts.length);
      const { data: saved, error: saveErr } = await supabase
        .from("content_drafts").insert(inserts).select();
      console.log("[generate] saved:", saved?.length ?? 0, "saveErr:", saveErr ? JSON.stringify(saveErr) : null);

      if (saveErr) {
        // Most common cause: status CHECK constraint doesn't include 'generated'.
        // Run this SQL in Supabase:
        //   ALTER TABLE content_drafts DROP CONSTRAINT IF EXISTS content_drafts_status_check;
        //   ALTER TABLE content_drafts ADD CONSTRAINT content_drafts_status_check
        //     CHECK (status IN ('draft','generated','approved','scheduled','published'));
        const sqlHint = saveErr.message.includes("check") || saveErr.message.includes("constraint")
          ? " ⚠️ Run the status constraint SQL in Supabase (see README or commit notes)."
          : "";
        setError(`Content generated but couldn't save to database: ${saveErr.message}.${sqlHint}`);
        const tempDrafts = rawVariations.map((v, i) => {
          const rawCaption = v.full_caption ?? v.content ?? "";
          const tempCleaned = cleanContent(rawCaption);
          const body = maxCaptionWords ? enforceWordLimit(tempCleaned, maxCaptionWords) : tempCleaned;
          return {
            id:              `temp-${Date.now()}-${i}`,
            title:           topic,
            body,
            platform:        audience.platforms?.[0] ?? null,
            status:       "generated",
            content_type: contentType,
            length:       contentLength,
            created_at:   new Date().toISOString(),
            draft_hook: contentType === "reel_script" ? null : (v.hook ?? null),
            draft_body: v.body ?? null,
            draft_cta:  v.cta  ?? null,
            media_type:      null,
            media_year_from: null,
            media_year_to:   null,
          } as ContentDraft;
        });
        setDrafts(prev => [...tempDrafts, ...prev]);
      } else if (saved) {
        const savedDrafts = (saved as ContentDraft[]).map(d => ({
          ...d,
          body: maxCaptionWords ? enforceWordLimit(d.body, maxCaptionWords) : d.body,
        }));
        setDrafts(prev => [...savedDrafts, ...prev]);
        const newIds = savedDrafts.map(d => d.id);
        setNewDraftIds(prev => new Set([...Array.from(prev), ...newIds]));
        setGenSuccessMsg(`${saved.length} post${saved.length !== 1 ? "s" : ""} generated ✓`);
        setTimeout(() => setGenSuccessMsg(null), 4000);
        setLibraryFilter("generated"); // auto-switch so user sees new content immediately
        setTopic("");
        reloadDrafts();
      }

      setGenOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[generate] error:", msg);
      setError(`Something went wrong — ${msg}`);
    } finally {
      setGenerating(false);
    }
  }

  // ── Library helpers ────────────────────────────────────────────────────────────

  function handleStatusChange(id: string, newStatus: string) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    reloadDrafts();
  }

  function handleDeleteDraft(id: string) {
    setDrafts(prev => prev.filter(d => d.id !== id));
  }

  const filteredDrafts = drafts.filter(d => d.status === libraryFilter);

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

                {/* STEP 3 — Photo picker */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Step 3 — Add photos or videos
                    <span className="ml-2 font-normal normal-case text-[#94A3B8]">optional</span>
                  </p>
                  <p className="mb-2 text-sm font-medium text-[#0F172A]">
                    Select specific photos or videos to pair with this content?
                  </p>
                  <div className="flex gap-2">
                    {(["No", "Yes"] as const).map(opt => (
                      <button key={opt} type="button"
                        onClick={() => { setMatchMedia(opt === "Yes"); if (opt === "No") { setPickerPhotos([]); setPickerError(null); }}}
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
                    <div className="mt-4 rounded-xl bg-[#F8F8FF] p-4">
                      {pickerPhotos.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-[#64748B]">
                            Pick exactly the photos or videos you want to pair with this content.
                          </p>
                          {photosConnected ? (
                            <button
                              type="button"
                              onClick={openGooglePhotosPicker}
                              disabled={pickerLoading}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-voce-indigo bg-voce-indigo/5 px-4 py-3 text-sm font-medium text-voce-indigo transition hover:bg-voce-indigo/10 disabled:opacity-60"
                            >
                              {pickerLoading
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening Google Photos…</>
                                : <><Camera className="h-4 w-4" /> Select from Google Photos</>}
                            </button>
                          ) : (
                            <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
                              <a href="/settings" className="font-semibold underline">Connect Google Photos</a>
                              {" "}in Settings first, then come back to pick photos.
                            </div>
                          )}
                          {pickerError && <p className="text-xs text-red-500">{pickerError}</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                              {pickerPhotos.length} item{pickerPhotos.length !== 1 ? "s" : ""} selected
                            </p>
                            <button
                              type="button"
                              onClick={openGooglePhotosPicker}
                              disabled={pickerLoading}
                              className="text-xs text-voce-indigo hover:underline disabled:opacity-60"
                            >
                              {pickerLoading ? "Opening…" : "Change selection"}
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {pickerPhotos.slice(0, 8).map(photo => (
                              <div key={photo.id} className="aspect-square overflow-hidden rounded-lg bg-[#E2E2E0]">
                                {photo.type === "video"
                                  ? <div className="flex h-full w-full items-center justify-center text-lg">🎥</div>
                                  // eslint-disable-next-line @next/next/no-img-element
                                  : <img src={`${photo.baseUrl}=w150-h150-c`} alt="" className="h-full w-full object-cover" />}
                              </div>
                            ))}
                            {pickerPhotos.length > 8 && (
                              <div className="flex aspect-square items-center justify-center rounded-lg bg-[#E2E2E0] text-xs font-medium text-[#64748B]">
                                +{pickerPhotos.length - 8}
                              </div>
                            )}
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
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[#E2E2E0] bg-[#F4F4F2]" />
            ))}
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
                onDelete={handleDeleteDraft}
                photosConnected={photosConnected}
                isNew={newDraftIds.has(d.id)}
                onRead={(id) => setNewDraftIds(prev => { const next = new Set(Array.from(prev)); next.delete(id); return next; })}
                pickerPhotos={pickerPhotos}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
