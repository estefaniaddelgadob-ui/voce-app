"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic, ImagePlus, AlignLeft, ChevronRight, ChevronLeft,
  Loader2, Trash2, CheckCircle2, Search, X, Plus, RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ThoughtNote {
  id: string;
  type: string | null;
  title: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  themes: string[] | null;
  tags: string[] | null;
  raw_ideas: string | null;
  ideas: string | null;
  standout_phrases: string | null;
  user_summary: string | null;
  status: string;
  created_at: string;
}

interface RawAnalysis {
  ideas?: string[];
  phrases?: string[];
}

type FilterTab = "all" | "voice" | "photo" | "import";

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseRawIdeas(raw: string | null): RawAnalysis | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as RawAnalysis; }
  catch { return null; }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function fmtDur(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ""}` : `${s}s`;
}

function noteIcon(type: string | null) {
  if (type === "photo") return { Icon: ImagePlus, color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };
  if (type === "text")  return { Icon: AlignLeft,  color: "#6366F1", bg: "rgba(99,102,241,0.1)" };
  return { Icon: Mic, color: "#6366F1", bg: "rgba(99,102,241,0.1)" };
}

const INPUT =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

// ── Note card ──────────────────────────────────────────────────────────────────

function NoteCard({ note, onDelete }: {
  note: ThoughtNote;
  onDelete: (id: string) => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [themes,    setThemes]    = useState<string[]>(note.themes ?? note.tags ?? []);
  const [newTheme,  setNewTheme]  = useState("");
  const [takeaways, setTakeaways] = useState(note.user_summary ?? "");
  const [dirty,     setDirty]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const parsed         = parseRawIdeas(note.raw_ideas);
  const ideasFromField   = note.ideas ? note.ideas.split("\n").filter(Boolean) : [];
  const phrasesFromField = note.standout_phrases ? note.standout_phrases.split("\n").filter(Boolean) : [];
  const displayIdeas   = (parsed?.ideas?.length   ? parsed.ideas   : ideasFromField);
  const displayPhrases = (parsed?.phrases?.length ? parsed.phrases : phrasesFromField);
  const preview = displayIdeas[0] ?? note.transcript?.slice(0, 90);
  const dur     = fmtDur(note.duration_seconds);
  const { Icon, color, bg } = noteIcon(note.type);

  function removeTheme(t: string) {
    setThemes(prev => prev.filter(x => x !== t));
    setDirty(true); setSaved(false);
  }

  function addTheme() {
    const t = newTheme.trim();
    if (t && !themes.includes(t)) { setThemes(prev => [...prev, t]); setDirty(true); setSaved(false); }
    setNewTheme("");
  }

  function onTakeawaysChange(v: string) {
    setTakeaways(v); setDirty(true); setSaved(false);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("thought_notes")
        .update({ user_summary: takeaways, themes })
        .eq("id", note.id);
      setSaved(true); setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("thought_notes").delete().eq("id", note.id);
    onDelete(note.id);
  }

  const previewThemes = (note.themes ?? note.tags ?? []).slice(0, 3);

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#FAFAF8]"
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: bg }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#94A3B8]">
            {fmtDate(note.created_at)}{dur ? ` · ${dur}` : ""}
          </p>
          {preview && (
            <p className="mt-0.5 line-clamp-2 text-sm text-[#0F172A]">{preview}</p>
          )}
          {previewThemes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {previewThemes.map(t => (
                <span key={t}
                  className="rounded-full bg-[#F4F4F2] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 text-[#94A3B8] transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}>
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#E2E2E0] px-4 pb-5 pt-4 space-y-4">

          {/* Transcript */}
          {note.transcript && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Transcript</p>
              <p className="rounded-lg bg-[#F4F4F2] px-4 py-3 text-sm leading-relaxed text-[#0F172A]">
                {note.transcript}
              </p>
            </div>
          )}

          {/* Ideas */}
          {displayIdeas.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Key Ideas</p>
              <ul className="space-y-1.5">
                {displayIdeas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#0F172A]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-voce-indigo" />
                    {idea}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Themes — editable */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Themes</p>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {themes.map((t, i) => (
                <span key={i}
                  className="flex items-center gap-1 rounded-full bg-voce-indigo/10 px-2.5 py-0.5 text-xs font-medium text-voce-indigo">
                  {t}
                  <button onClick={() => removeTheme(t)} className="ml-0.5 transition hover:opacity-60">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTheme}
                onChange={e => setNewTheme(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTheme(); } }}
                placeholder="+ Add a theme"
                className="rounded-lg border border-[#E2E2E0] bg-white px-3 py-1.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20"
              />
              {newTheme.trim() && (
                <button onClick={addTheme}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-voce-indigo/10 text-voce-indigo transition hover:bg-voce-indigo/20">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Standout phrases */}
          {displayPhrases.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Standout Phrases</p>
              <div className="space-y-1.5">
                {displayPhrases.map((p, i) => (
                  <p key={i} className="border-l-2 border-voce-indigo/40 pl-3 text-sm italic text-[#64748B]">
                    &ldquo;{p}&rdquo;
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Key takeaways */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Key takeaways <span className="normal-case font-normal">(your own summary)</span>
            </label>
            <textarea
              value={takeaways}
              onChange={e => onTakeawaysChange(e.target.value)}
              rows={3}
              placeholder="Add your own notes or key takeaways from this recording…"
              className={INPUT}
            />
          </div>

          {/* Save / delete row */}
          <div className="flex items-center gap-3 pt-1">
            {dirty && (
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-voce-indigo px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
                  : saved
                  ? <><CheckCircle2 className="h-3 w-3" /> Saved</>
                  : "Save changes"}
              </button>
            )}
            {saved && !dirty && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-voce-teal">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <button
              onClick={handleDelete}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",    label: "All"       },
  { id: "voice",  label: "🎙️ Voice"  },
  { id: "photo",  label: "📷 Photo"  },
  { id: "import", label: "📝 Import" },
];

export default function LibraryPage() {
  const router = useRouter();
  const [notes,            setNotes]            = useState<ThoughtNote[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState("");
  const [filter,           setFilter]           = useState<FilterTab>("all");
  const [reAnalysing,      setReAnalysing]      = useState(false);
  const [reAnalyseProgress, setReAnalyseProgress] = useState<{ done: number; total: number } | null>(null);

  async function fetchNotes() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("thought_notes")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      setNotes((data as ThoughtNote[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNotes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function reAnalyseNotes() {
    setReAnalysing(true);
    setReAnalyseProgress(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find notes with transcript but empty ideas
      const { data: candidates } = await supabase.from("thought_notes")
        .select("id, transcript, ideas")
        .eq("user_id", user.id)
        .not("transcript", "is", null);

      const toBackfill = (candidates ?? []).filter(
        (n: { id: string; transcript: string | null; ideas: string | null }) =>
          n.transcript?.trim() && (!n.ideas || n.ideas.trim() === "")
      );

      if (toBackfill.length === 0) { setReAnalysing(false); return; }

      setReAnalyseProgress({ done: 0, total: toBackfill.length });

      for (let i = 0; i < toBackfill.length; i++) {
        const note = toBackfill[i];
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: note.transcript }),
          });
          const analysis = await res.json();
          if (analysis.error) continue;

          await supabase.from("thought_notes").update({
            title:            analysis.title   ?? null,
            ideas:            (analysis.ideas  ?? []).join("\n"),
            standout_phrases: (analysis.phrases ?? []).join("\n"),
            themes:           analysis.themes   ?? [],
            raw_ideas:        JSON.stringify(analysis),
          }).eq("id", note.id);
        } catch {
          // skip failed notes, continue with rest
        }
        setReAnalyseProgress({ done: i + 1, total: toBackfill.length });
      }

      await fetchNotes();
    } finally {
      setReAnalysing(false);
      setReAnalyseProgress(null);
    }
  }

  function handleDeleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  const filtered = notes
    .filter(n => {
      if (filter === "voice")  return n.type === "voice";
      if (filter === "photo")  return n.type === "photo";
      if (filter === "import") return n.type === "text";
      return true;
    })
    .filter(n => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        n.transcript?.toLowerCase().includes(q) ||
        (n.themes ?? n.tags ?? []).some(t => t.toLowerCase().includes(q))
      );
    });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-voce-indigo" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 pr-8 md:pr-0">
        <div className="flex items-start gap-1">
          <button
            onClick={() => router.back()}
            className="-ml-2 mt-0.5 p-2 text-[#94A3B8] transition hover:text-[#0F172A]"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">What Voce knows about you</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Every input you add helps the AI learn your voice, ideas, and perspective.
            </p>
          </div>
        </div>
        <button
          onClick={reAnalyseNotes}
          disabled={reAnalysing}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E2E2E0] px-3 py-2 text-xs font-medium text-[#64748B] transition hover:border-voce-indigo hover:text-voce-indigo disabled:opacity-60"
        >
          {reAnalysing
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />
                {reAnalyseProgress ? `${reAnalyseProgress.done}/${reAnalyseProgress.total}` : "Analysing…"}</>
            : <><RefreshCw className="h-3.5 w-3.5" /> Re-analyse notes</>}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search transcripts and themes…"
          className="w-full rounded-xl border border-[#E2E2E0] bg-white py-2.5 pl-9 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex rounded-xl bg-[#F4F4F2] p-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={[
              "flex min-h-[36px] flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all",
              filter === tab.id
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#94A3B8] hover:text-[#64748B]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F4F2]">
            <Mic className="h-6 w-6 text-[#94A3B8]" />
          </div>
          {notes.length === 0 ? (
            <>
              <p className="mt-3 text-sm font-medium text-[#0F172A]">Nothing here yet</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Go to Record to add your first input</p>
              <Link href="/record"
                className="mt-4 flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                Go to Record
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium text-[#0F172A]">No results</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Try a different search or filter</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <NoteCard key={n.id} note={n} onDelete={handleDeleteNote} />
          ))}
        </div>
      )}
    </div>
  );
}
