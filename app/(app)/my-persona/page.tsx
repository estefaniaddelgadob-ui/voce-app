"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Mic, ImagePlus, AlignLeft, ChevronRight, ChevronDown,
  Sparkles, Loader2, CheckCircle2, RefreshCw, Trash2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ThoughtNote {
  id: string;
  type: string | null;
  title: string | null;
  transcript: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  themes: string[] | null;
  tags:   string[] | null;
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
  style_fingerprint: string | null;
  input_language: string | null;
  output_language: string | null;
}

interface RawAnalysis {
  title?: string;
  ideas?: string[];
  themes?: string[];
  tone?: string;
  phrases?: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
  }
  return String(err);
}

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

const INPUT =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

const TONES     = ["warm","bold","educational","funny","inspirational","conversational"] as const;
const LANGUAGES = ["English","Spanish","Portuguese","French","Italian"]                  as const;
type Tone = (typeof TONES)[number];

// ── Score engine ───────────────────────────────────────────────────────────────

interface ScoreStats {
  total:        number;
  inputCount:   number;
  audioMinutes: number;
  profilePct:   number;
  captionCount: number;
}

function calcScore(persona: PersonaProfile | null, notes: ThoughtNote[]): ScoreStats {
  const n = notes.length;
  // 1. Input count  (0–40 pts)
  const inputPts = n >= 10 ? 40 : n >= 5 ? 30 : n >= 3 ? 20 : n >= 1 ? 10 : 0;

  // 2. Audio duration (0–15 pts)
  const totalSec  = notes.reduce((s, note) => s + (note.duration_seconds ?? 0), 0);
  const audioPts  = totalSec >= 600 ? 15 : totalSec >= 300 ? 10 : totalSec >= 120 ? 5 : 0;

  // 3. Profile form filled (0–25 pts)
  const handle    = persona?.display_name?.trim();
  const bio       = persona?.bio?.trim();
  const tone      = persona?.tone?.trim();
  const commStyle = persona?.communication_style?.trim();
  const profilePts = (handle ? 5 : 0) + (bio ? 10 : 0) + (tone ? 5 : 0) + (commStyle ? 5 : 0);

  // 4. Sample captions (5 pts each, max 20)
  const captions  = (persona?.sample_captions ?? []).filter(Boolean);
  const captionPts = Math.min(captions.length * 5, 20);

  const total = Math.min(inputPts + audioPts + profilePts + captionPts, 100);

  return {
    total,
    inputCount:   n,
    audioMinutes: Math.round(totalSec / 60),
    profilePct:   Math.round((profilePts / 25) * 100),
    captionCount: captions.length,
  };
}

function statusLabel(s: number) {
  if (s <= 20) return "Just getting started";
  if (s <= 40) return "Building your voice";
  if (s <= 70) return "Getting there";
  if (s <= 90) return "Strong persona";
  return "Fully trained ✓";
}

// ── Confetti ───────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#6366F1","#F59E0B","#1D9E75","#EC4899","#3B82F6","#EF4444","#8B5CF6"];

function Confetti({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);

  const pieces = useMemo(() =>
    Array.from({ length: 48 }).map((_, i) => ({
      left:     `${5 + Math.random() * 90}%`,
      top:      `${20 + Math.random() * 45}%`,
      width:    `${6 + Math.random() * 9}px`,
      height:   `${6 + Math.random() * 9}px`,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round:    Math.random() > 0.5,
      delay:    `${Math.random() * 0.45}s`,
      duration: `${1.1 + Math.random() * 0.9}s`,
    })),
  []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <div key={i} className="absolute animate-confetti-rise"
          style={{
            left: p.left, top: p.top, width: p.width, height: p.height,
            backgroundColor: p.color, borderRadius: p.round ? "50%" : "2px",
            animationDelay: p.delay, "--duration": p.duration,
          } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ── Section 1 — Persona form (always visible, top of page) ────────────────────

function initCaptions(p: PersonaProfile | null): [string, string, string] {
  const c = p?.sample_captions ?? [];
  return [c[0] ?? "", c[1] ?? "", c[2] ?? ""];
}

interface FormState {
  instagram_handle: string;
  bio: string;
  tones: Tone[];
  communication_style: string;
  sample_captions: [string, string, string];
  input_language: string;
  output_language: string;
}

function parseTones(raw: string | null): Tone[] {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(s => (TONES as readonly string[]).includes(s)) as Tone[];
}

function PersonaForm({ persona, onSaved }: {
  persona: PersonaProfile | null;
  onSaved: () => void;
}) {
  const [form, setForm]    = useState<FormState>(() => ({
    instagram_handle:   persona?.display_name        ?? "",
    bio:                persona?.bio                 ?? "",
    tones:              parseTones(persona?.tone),
    communication_style: persona?.communication_style ?? "",
    sample_captions:    initCaptions(persona),
    input_language:     persona?.input_language      ?? "English",
    output_language:    persona?.output_language     ?? "English",
  }));
  const [fingerprint, setFp] = useState(persona?.style_fingerprint ?? "");
  const [saving,   setSaving] = useState(false);
  const [genning,  setGen]    = useState(false);
  const [saved,    setSaved]  = useState(false);
  const [error,    setError]  = useState<string | null>(null);

  useEffect(() => {
    if (!persona) return;
    setForm({
      instagram_handle:   persona.display_name        ?? "",
      bio:                persona.bio                 ?? "",
      tones:              parseTones(persona.tone),
      communication_style: persona.communication_style ?? "",
      sample_captions:    initCaptions(persona),
      input_language:     persona.input_language      ?? "English",
      output_language:    persona.output_language     ?? "English",
    });
    setFp(persona.style_fingerprint ?? "");
  }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v })); setSaved(false);
  }
  function setCaption(i: number, v: string) {
    const next = [...form.sample_captions] as [string, string, string];
    next[i] = v; set("sample_captions", next);
  }
  function toggleTone(t: Tone) {
    const next = form.tones.includes(t)
      ? form.tones.filter(x => x !== t)
      : [...form.tones, t];
    setForm(p => ({ ...p, tones: next })); setSaved(false);
  }

  async function handleSave() {
    setSaving(true); setGen(true); setError(null); setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: dbErr } = await supabase.from("persona_profile").upsert(
        {
          user_id:            user.id,
          display_name:       form.instagram_handle,
          bio:                form.bio,
          tone:               form.tones.join(","),
          communication_style: form.communication_style,
          sample_captions:    form.sample_captions.filter(Boolean),
          input_language:     form.input_language,
          output_language:    form.output_language,
        },
        { onConflict: "user_id" }
      );
      if (dbErr) throw dbErr;

      const res = await fetch("/api/generate-fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName:        form.instagram_handle,
          bio:                form.bio,
          tone:               form.tones.join(", "),
          communicationStyle: form.communication_style,
          sampleCaptions:     form.sample_captions,
        }),
      });
      const { fingerprint: fp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);

      await supabase.from("persona_profile")
        .update({ style_fingerprint: fp }).eq("user_id", user.id);

      setFp(fp); setSaved(true); onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false); setGen(false);
    }
  }

  async function regenerate() {
    setGen(true); setError(null);
    try {
      const res = await fetch("/api/generate-fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.instagram_handle, bio: form.bio,
          tone: form.tones.join(", "), communicationStyle: form.communication_style,
          sampleCaptions: form.sample_captions,
        }),
      });
      const { fingerprint: fp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("persona_profile")
        .update({ style_fingerprint: fp }).eq("user_id", user.id);
      setFp(fp); onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setGen(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-voce-indigo/10">
          <Sparkles className="h-4 w-4 text-voce-indigo" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Help us learn faster</h2>
          <p className="text-xs text-[#94A3B8]">
            Tell us a little more while we&apos;re still learning from your recordings
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Instagram handle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Instagram handle</label>
            <div className="flex items-center rounded-lg border border-[#E2E2E0] bg-white transition focus-within:border-voce-indigo focus-within:ring-2 focus-within:ring-voce-indigo/20">
              <span className="px-3 text-sm text-[#94A3B8] select-none">@</span>
              <input
                type="text"
                value={form.instagram_handle}
                onChange={e => set("instagram_handle", e.target.value)}
                placeholder="yourusername"
                className="flex-1 rounded-r-lg bg-transparent py-2.5 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
              />
            </div>
          </div>

          {/* Tone — multi-select chips */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#0F172A]">Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(t => (
                <button key={t} type="button" onClick={() => toggleTone(t)}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    form.tones.includes(t)
                      ? "bg-voce-indigo text-white"
                      : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo hover:text-voce-indigo",
                  ].join(" ")}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Short bio <span className="font-normal text-[#94A3B8]">2–3 sentences</span>
          </label>
          <textarea value={form.bio} onChange={e => set("bio", e.target.value)} rows={2}
            placeholder="e.g. I'm a business coach for women leaving corporate…" className={INPUT} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Communication style <span className="font-normal text-[#94A3B8]">how you naturally write and talk</span>
          </label>
          <textarea value={form.communication_style}
            onChange={e => set("communication_style", e.target.value)} rows={2}
            placeholder='"Short punchy sentences. Real talk, no corporate speak."' className={INPUT} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Sample captions <span className="font-normal text-[#94A3B8]">paste up to 3 of your best past posts</span>
          </label>
          <div className="space-y-3">
            {([0, 1, 2] as const).map(i => (
              <textarea key={i} value={form.sample_captions[i]}
                onChange={e => setCaption(i, e.target.value)} rows={3}
                placeholder={`Caption ${i + 1}…`} className={INPUT} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Input language</label>
            <select value={form.input_language} onChange={e => set("input_language", e.target.value)} className={INPUT}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Output language</label>
            <select value={form.output_language} onChange={e => set("output_language", e.target.value)} className={INPUT}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button onClick={handleSave} disabled={saving || genning}
            className="flex items-center gap-2 rounded-lg bg-voce-indigo px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
            {genning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating fingerprint…</>
              : saved
              ? <><CheckCircle2 className="h-4 w-4" /> Saved</>
              : <><Sparkles className="h-4 w-4" /> Save &amp; generate style fingerprint</>}
          </button>
          {saved && <p className="text-sm text-voce-teal">✓ Persona updated</p>}
        </div>
      </div>

      {fingerprint && (
        <div className="mt-5 rounded-xl border border-[#E2E2E0] bg-[#F8F8FF] p-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-voce-indigo" />
              <p className="text-sm font-semibold text-voce-indigo">Your Style Fingerprint</p>
            </div>
            <button onClick={regenerate} disabled={genning}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E2E0] px-2.5 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-[#F4F4F2] disabled:opacity-50">
              {genning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Regenerate
            </button>
          </div>
          <p className="text-sm leading-relaxed text-[#0F172A]">{fingerprint}</p>
        </div>
      )}
    </div>
  );
}

// ── Section 2 — Persona strength score ────────────────────────────────────────

function ScoreCard({ stats }: { stats: ScoreStats }) {
  const status = statusLabel(stats.total);

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Persona Strength</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">{status}</p>
        </div>
        <span className="text-3xl font-bold text-voce-indigo tabular-nums">
          {stats.total}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-[#F4F4F2]">
        <div
          className="h-full rounded-full bg-voce-indigo transition-all duration-700"
          style={{ width: `${stats.total}%` }}
        />
      </div>

      {/* 4 stat pills */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "inputs",    value: stats.inputCount   },
          { label: "min audio", value: stats.audioMinutes },
          { label: "% profile", value: stats.profilePct, suffix: "%" },
          { label: "captions",  value: stats.captionCount },
        ].map(s => (
          <div key={s.label}
            className="rounded-lg bg-[#F4F4F2] px-3 py-2.5 text-center">
            <p className="text-xl font-bold text-[#0F172A] tabular-nums">
              {s.value}{s.suffix ?? ""}
            </p>
            <p className="text-[11px] text-[#94A3B8]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 3 — Library feed with expandable cards ────────────────────────────

function noteIcon(type: string | null, hasDuration: boolean) {
  if (type === "photo") return { Icon: ImagePlus, color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };
  if (type === "text")  return { Icon: AlignLeft,  color: "#6366F1", bg: "rgba(99,102,241,0.1)" };
  if (hasDuration || type === "voice") return { Icon: Mic, color: "#6366F1", bg: "rgba(99,102,241,0.1)" };
  return { Icon: Mic, color: "#6366F1", bg: "rgba(99,102,241,0.1)" };
}

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
  const { Icon, color, bg } = noteIcon(note.type, !!note.duration_seconds);

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
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#FAFAF8]"
      >
        {/* Type icon */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: bg }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Date + duration */}
          <p className="text-xs text-[#94A3B8]">
            {fmtDate(note.created_at)}{dur ? ` · ${dur}` : ""}
          </p>
          {/* Preview */}
          {preview && (
            <p className="mt-0.5 line-clamp-2 text-sm text-[#0F172A]">{preview}</p>
          )}
          {/* Theme pills */}
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

        {/* Chevron */}
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

          {/* All themes */}
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

          {/* Phrases */}
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

          {/* Editable key takeaways */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Key takeaways <span className="normal-case font-normal not-italic">(your own summary)</span>
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

          {/* Delete */}
          <div className="pt-1 border-t border-[#F4F4F2]">
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

function NoteLibrary({ notes, onDelete }: {
  notes: ThoughtNote[];
  onDelete: (id: string) => void;
}) {
  return (
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
            <NoteLibraryCard key={n.id} note={n} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const MILESTONES = [40, 70, 100] as const;

export default function MyPersonaPage() {
  const [persona,  setPersona]  = useState<PersonaProfile | null>(null);
  const [notes,    setNotes]    = useState<ThoughtNote[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [confetti, setConfetti] = useState(false);

  const seenMilestonesRef = useRef(new Set<number>());
  const prevScoreRef      = useRef<number | null>(null);

  async function fetchData() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pRes, nRes] = await Promise.all([
        supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
        supabase.from("thought_notes").select("*").eq("user_id", user.id)
          .neq("status", "archived").order("created_at", { ascending: false }),
      ]);
      setPersona(pRes.data ?? null);
      setNotes((nRes.data as ThoughtNote[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = calcScore(persona, notes);

  useEffect(() => {
    if (prevScoreRef.current === null) { prevScoreRef.current = stats.total; return; }
    const prev = prevScoreRef.current;
    prevScoreRef.current = stats.total;
    for (const m of MILESTONES) {
      if (prev < m && stats.total >= m && !seenMilestonesRef.current.has(m)) {
        seenMilestonesRef.current.add(m);
        setConfetti(true);
        break;
      }
    }
  }, [stats.total]);

  function handleDeleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-voce-indigo" />
      </div>
    );
  }

  return (
    <div>
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      <div className="mb-8 pr-8 md:pr-0">
        <h1 className="text-2xl font-semibold text-[#0F172A]">My Persona</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Voce learns your voice over time — from your recordings, your style, and your story.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Profile form — always visible, top */}
        <PersonaForm persona={persona} onSaved={fetchData} />

        {/* 2. Strength score */}
        <ScoreCard stats={stats} />

        {/* 3. Library feed */}
        <NoteLibrary notes={notes} onDelete={handleDeleteNote} />
      </div>
    </div>
  );
}
