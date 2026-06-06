"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mic, ImagePlus, AlignLeft, ChevronRight,
  Loader2, Trash2, CheckCircle2,
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
  user_summary: string | null;
  status: string;
  created_at: string;
}

interface PersonaProfile {
  display_name: string | null;
  bio: string | null;
  tone: string | null;
  communication_style: string | null;
  sample_captions: string[] | null;
  niche: string | null;
  audience: string | null;
  beliefs: string | null;
  instagram_handle: string | null;
}

interface RawAnalysis {
  ideas?: string[];
  themes?: string[];
  phrases?: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseRawIdeas(raw: string | null): RawAnalysis | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as RawAnalysis; }
  catch { return null; }
}

function fmtDate(iso: string) {
  const d    = new Date(iso);
  const now  = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Yesterday at ${time}`;
  if (days < 7)  return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDur(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ""}` : `${s}s`;
}

function calcPersonaScore(persona: PersonaProfile | null, notes: ThoughtNote[]): number {
  const n        = notes.length;
  const inputPts = n >= 10 ? 40 : n >= 5 ? 30 : n >= 3 ? 20 : n >= 1 ? 10 : 0;

  const totalSec = notes.reduce((s, note) => s + (note.duration_seconds ?? 0), 0);
  const audioPts = totalSec >= 600 ? 15 : totalSec >= 300 ? 10 : totalSec >= 120 ? 5 : 0;

  const handle   = (persona?.instagram_handle ?? persona?.display_name)?.trim();
  const niche    = (persona?.niche ?? persona?.bio)?.trim();
  const audience = persona?.audience?.trim();
  const beliefs  = (persona?.beliefs ?? persona?.communication_style)?.trim();
  const profilePts = (handle ? 5 : 0) + (niche ? 10 : 0) + (audience ? 5 : 0) + (beliefs ? 5 : 0);

  const captions   = (persona?.sample_captions ?? []).filter(Boolean);
  const captionPts = Math.min(captions.length * 5, 20);

  return Math.min(inputPts + audioPts + profilePts + captionPts, 100);
}

function statusLabel(s: number): string {
  if (s <= 20) return "Just getting started";
  if (s <= 40) return "Building your voice";
  if (s <= 70) return "Getting there";
  if (s <= 90) return "Strong persona";
  return "Fully trained ✓";
}

const INPUT =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

function noteIcon(type: string | null) {
  if (type === "photo") return { Icon: ImagePlus, color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };
  if (type === "text")  return { Icon: AlignLeft,  color: "#6366F1", bg: "rgba(99,102,241,0.1)" };
  return { Icon: Mic, color: "#6366F1", bg: "rgba(99,102,241,0.1)" };
}

// ── Note library card (same expandable pattern as persona page had) ─────────────

function NoteLibraryCard({ note, onDelete }: {
  note: ThoughtNote;
  onDelete: (id: string) => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [takeaways, setTakeaways] = useState(note.user_summary ?? "");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setTakeSaved] = useState(false);

  const parsed  = parseRawIdeas(note.raw_ideas);
  const themes  = (note.themes ?? note.tags ?? []).slice(0, 3);
  const preview = parsed?.ideas?.[0] ?? note.transcript?.slice(0, 90);
  const dur     = fmtDur(note.duration_seconds);
  const { Icon, color, bg } = noteIcon(note.type);

  async function saveTakeaways() {
    setSaving(true); setTakeSaved(false);
    try {
      const supabase = createClient();
      await supabase.from("thought_notes").update({ user_summary: takeaways }).eq("id", note.id);
      setTakeSaved(true);
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

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
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
          {themes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {themes.map(t => (
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

      {expanded && (
        <div className="border-t border-[#E2E2E0] px-4 pb-5 pt-4 space-y-4">
          {note.transcript && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Transcript</p>
              <p className="rounded-lg bg-[#F4F4F2] px-4 py-3 text-sm leading-relaxed text-[#0F172A]">
                {note.transcript}
              </p>
            </div>
          )}

          {parsed?.ideas && parsed.ideas.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Key Ideas</p>
              <ul className="space-y-1.5">
                {parsed.ideas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#0F172A]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-voce-indigo" />
                    {idea}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(note.themes ?? note.tags ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Themes</p>
              <div className="flex flex-wrap gap-1.5">
                {(note.themes ?? note.tags ?? []).map(t => (
                  <span key={t}
                    className="rounded-full bg-voce-indigo/10 px-2.5 py-0.5 text-xs font-medium text-voce-indigo">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsed?.phrases && parsed.phrases.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Standout Phrases</p>
              <div className="space-y-1.5">
                {parsed.phrases.map((p, i) => (
                  <p key={i} className="border-l-2 border-voce-indigo/40 pl-3 text-sm italic text-[#64748B]">
                    &ldquo;{p}&rdquo;
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Key takeaways <span className="normal-case font-normal">(your own summary)</span>
            </label>
            <textarea
              value={takeaways}
              onChange={e => { setTakeaways(e.target.value); setTakeSaved(false); }}
              rows={3}
              placeholder="Add your own notes or key takeaways from this recording…"
              className={INPUT}
            />
            {takeaways !== (note.user_summary ?? "") && (
              <button
                onClick={saveTakeaways}
                disabled={saving}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-voce-indigo px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                {saving ? "Saving…" : saved ? "Saved" : "Save takeaways"}
              </button>
            )}
          </div>

          <div className="border-t border-[#F4F4F2] pt-1">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete this note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [persona,      setPersona]      = useState<PersonaProfile | null>(null);
  const [notes,        setNotes]        = useState<ThoughtNote[]>([]);
  const [contentStats, setContentStats] = useState({ total: 0, approved: 0, published: 0 });
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [pRes, nRes, cRes] = await Promise.all([
          supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
          supabase.from("thought_notes").select("*").eq("user_id", user.id)
            .neq("status", "archived").order("created_at", { ascending: false }),
          supabase.from("content_drafts").select("status").eq("user_id", user.id),
        ]);

        setPersona(pRes.data ?? null);
        setNotes((nRes.data as ThoughtNote[]) ?? []);

        const drafts = (cRes.data ?? []) as { status: string }[];
        setContentStats({
          total:     drafts.length,
          approved:  drafts.filter(d => d.status === "approved").length,
          published: drafts.filter(d => d.status === "published").length,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDeleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  const score  = calcPersonaScore(persona, notes);
  const status = statusLabel(score);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-voce-indigo" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 pr-8 md:pr-0">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Home</h1>
        <p className="mt-1 text-sm text-[#64748B]">Your personal voice dashboard.</p>
      </div>

      <div className="space-y-6">

        {/* ── Section 1: Persona Strength Summary ── */}
        <Link href="/my-persona"
          className="block rounded-xl border border-[#E2E2E0] bg-white p-5 transition hover:border-voce-indigo/40 hover:shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">Persona Strength</p>
            <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
          </div>
          <p className="mb-3 text-2xl font-bold text-voce-indigo">
            {score}%{" "}
            <span className="text-base font-medium text-[#0F172A]">· {status}</span>
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F4F4F2]">
            <div
              className="h-full rounded-full bg-voce-indigo transition-all duration-700"
              style={{ width: `${score}%` }}
            />
          </div>
        </Link>

        {/* ── Section 2: What Voce knows about you ── */}
        <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
          <h2 className="mb-1 text-base font-semibold text-[#0F172A]">What Voce knows about you</h2>
          <p className="mb-5 text-sm text-[#64748B]">
            Every input you add helps the AI learn your voice, ideas, and perspective.
          </p>

          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E2E2E0] py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F4F2]">
                <Mic className="h-6 w-6 text-[#94A3B8]" />
              </div>
              <p className="mt-3 text-sm font-medium text-[#0F172A]">Nothing here yet</p>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Go to Record to add your first input
              </p>
              <Link href="/record"
                className="mt-4 flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                Go to Record
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(n => (
                <NoteLibraryCard key={n.id} note={n} onDelete={handleDeleteNote} />
              ))}
            </div>
          )}
        </div>

        {/* ── Section 3: Content Stats ── */}
        <Link href="/content"
          className="block rounded-xl border border-[#E2E2E0] bg-white p-5 transition hover:border-voce-indigo/40 hover:shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Content</h2>
            <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Generated", value: contentStats.total     },
              { label: "Approved",  value: contentStats.approved  },
              { label: "Published", value: contentStats.published },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-[#F4F4F2] px-3 py-3 text-center">
                <p className="text-2xl font-bold text-[#0F172A] tabular-nums">{s.value}</p>
                <p className="text-[11px] text-[#94A3B8]">{s.label}</p>
              </div>
            ))}
          </div>
        </Link>

      </div>
    </div>
  );
}
