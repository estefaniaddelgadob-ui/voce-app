"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mic, ImagePlus, ChevronDown, ChevronUp,
  Sparkles, Loader2, CheckCircle2, RefreshCw,
  Clock, Lightbulb, AlertCircle, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ThoughtNote {
  id: string;
  title: string | null;
  transcript: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  tags: string[] | null;
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
}

// ── Score engine ───────────────────────────────────────────────────────────────

interface MetricItem {
  label: string;
  current: number;
  target: number;
  pts: number;
}

interface ScoreData {
  total: number;
  metrics: MetricItem[];
}

function calcScore(persona: PersonaProfile | null, notes: ThoughtNote[]): ScoreData {
  const totalSec    = notes.reduce((s, n) => s + (n.duration_seconds ?? 0), 0);
  const uniqueTopics = new Set(notes.flatMap((n) => n.tags ?? [])).size;
  const captions    = (persona?.sample_captions ?? []).filter(Boolean);
  const formFilled  = [
    persona?.display_name?.trim(),
    persona?.bio?.trim(),
    persona?.communication_style?.trim(),
    persona?.tone,
  ].filter(Boolean).length;

  const metrics: MetricItem[] = [
    { label: "Voice notes",    current: notes.length,              target: 5,  pts: Math.min(notes.length / 5,      1) * 20 },
    { label: "Recording time", current: Math.round(totalSec / 60), target: 10, pts: Math.min(totalSec / 600,        1) * 20 },
    { label: "Topic variety",  current: uniqueTopics,              target: 5,  pts: Math.min(uniqueTopics / 5,      1) * 20 },
    { label: "Captions",       current: captions.length,           target: 1,  pts: captions.length >= 1 ? 20 : 0       },
    { label: "Profile form",   current: formFilled,                target: 4,  pts: (formFilled / 4) * 20                },
  ];

  return { total: Math.round(metrics.reduce((s, m) => s + m.pts, 0)), metrics };
}

function statusLabel(score: number) {
  if (score < 20) return "Just getting started";
  if (score < 40) return "Building your voice";
  if (score < 70) return "Getting there";
  if (score < 90) return "Strong persona";
  return "Fully trained";
}

// Progress bar goes amber → blue → teal → brand-purple as score climbs
function barHex(score: number) {
  if (score >= 90) return "#7F77DD";
  if (score >= 70) return "#1D9E75";
  if (score >= 40) return "#3B82F6";
  if (score >= 20) return "#F59E0B";
  return "#CBD5E1";
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d    = new Date(iso);
  const now  = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDur(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ""}` : `${s}s`;
}

// Shared input style — identical to all other pages
const INPUT =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-purple focus:ring-2 focus:ring-voce-purple/20";

const TONES = ["professional", "casual", "inspirational", "educational", "conversational"] as const;
type Tone = (typeof TONES)[number];

// ── SECTION 1 — Persona Strength Score ────────────────────────────────────────

function ScoreBreakdown({ metrics }: { metrics: MetricItem[] }) {
  return (
    <div className="mt-4 grid grid-cols-5 gap-2">
      {metrics.map((m) => {
        const pct  = Math.min(m.current / m.target, 1);
        const done = pct >= 1;
        return (
          <div key={m.label} className="rounded-lg border border-[#E2E2E0] bg-white p-2.5 text-center">
            <p className="text-[10px] font-medium leading-tight text-[#94A3B8]">{m.label}</p>
            <p className={`mt-1 text-sm font-semibold ${done ? "text-voce-teal" : "text-[#0F172A]"}`}>
              {m.current}
              <span className="text-[10px] font-normal text-[#94A3B8]">/{m.target}</span>
            </p>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#F4F4F2]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct * 100}%`, backgroundColor: done ? "#1D9E75" : "#7F77DD" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PersonaScoreCard({ score, notes }: { score: ScoreData; notes: ThoughtNote[] }) {
  const color  = barHex(score.total);
  const status = statusLabel(score.total);

  // Milestone banners — inline styles so hex+alpha never touches Tailwind JIT
  const milestone =
    score.total >= 100 ? { msg: "🎉 Fully trained! Voce knows your voice inside and out.", bg: "rgba(127,119,221,0.08)", color: "#7F77DD" }
    : score.total >= 70 ? { msg: "🚀 Your persona is really taking shape — content is starting to sound like you.", bg: "rgba(29,158,117,0.08)", color: "#1D9E75" }
    : score.total >= 40 ? { msg: "✨ Nice work! You're building a voice Voce can work with.", bg: "#EFF6FF", color: "#2563EB" }
    : null;

  const nudge       = score.total < 20;
  const notesNeeded = Math.max(0, 2 - notes.length);

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Persona Strength</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">{status}</p>
        </div>
        <span className="text-3xl font-bold" style={{ color }}>{score.total}%</span>
      </div>

      {/* Bar */}
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#F4F4F2]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score.total}%`, backgroundColor: color }}
        />
      </div>

      <ScoreBreakdown metrics={score.metrics} />

      {milestone && (
        <div className="mt-4 rounded-lg px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: milestone.bg, color: milestone.color }}>
          {milestone.msg}
        </div>
      )}

      {nudge && (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            Your persona needs a little more to go on!{" "}
            {notesNeeded > 0 && (
              <>Record <strong>{notesNeeded} more voice note{notesNeeded !== 1 ? "s" : ""}</strong> and{" "}</>
            )}
            fill in more of the profile below and we&apos;ll be ready to generate.
          </p>
        </div>
      )}
    </div>
  );
}

// ── SECTION 2 — Voice Notes Feed ──────────────────────────────────────────────

function NoteCard({ note }: { note: ThoughtNote }) {
  const isVoice = !!note.audio_url || !!note.duration_seconds;
  const dur     = fmtDur(note.duration_seconds);
  const title   = note.title
    || (note.transcript ? `${note.transcript.slice(0, 60)}…` : "Untitled note");
  const tags    = (note.tags ?? []).slice(0, 4);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#E2E2E0] bg-white p-4">
      {/* Icon — inline rgba so no JIT opacity issue */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: isVoice ? "rgba(127,119,221,0.1)" : "rgba(29,158,117,0.1)" }}>
        {isVoice
          ? <Mic className="h-4 w-4 text-voce-purple" />
          : <ImagePlus className="h-4 w-4 text-voce-teal" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#0F172A]">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
          <span>{fmtDate(note.created_at)}</span>
          {dur && (
            <>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{dur}
              </span>
            </>
          )}
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t}
                className="rounded-full bg-[#F4F4F2] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceNotesFeed({ notes }: { notes: ThoughtNote[] }) {
  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">How Voce is learning about you</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">
            Every note you record teaches the AI your voice and perspective.
          </p>
        </div>
        <Link href="/record"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-voce-purple px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90">
          Add a voice note <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E2E2E0] py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F4F2]">
            <Mic className="h-6 w-6 text-[#94A3B8]" />
          </div>
          <p className="mt-3 text-sm font-medium text-[#0F172A]">No recordings yet</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Head to{" "}
            <Link href="/record" className="text-voce-purple underline underline-offset-2">
              /record
            </Link>{" "}
            to add your first voice note.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => <NoteCard key={n.id} note={n} />)}
        </div>
      )}
    </div>
  );
}

// ── SECTION 3 — Optional persona form (collapsible) ───────────────────────────

function initCaptions(persona: PersonaProfile | null): [string, string, string] {
  const c = persona?.sample_captions ?? [];
  return [c[0] ?? "", c[1] ?? "", c[2] ?? ""];
}

interface FormState {
  display_name: string;
  bio: string;
  tone: Tone;
  communication_style: string;
  sample_captions: [string, string, string];
}

function PersonaFormSection({
  persona, onSaved,
}: {
  persona: PersonaProfile | null;
  onSaved: () => void;
}) {
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState<FormState>(() => ({
    display_name:       persona?.display_name       ?? "",
    bio:                persona?.bio                ?? "",
    tone:               (persona?.tone as Tone)     ?? "professional",
    communication_style: persona?.communication_style ?? "",
    sample_captions:    initCaptions(persona),
  }));
  const [fingerprint, setFp]      = useState(persona?.style_fingerprint ?? "");
  const [saving,  setSaving]      = useState(false);
  const [genning, setGenning]     = useState(false);
  const [saved,   setSaved]       = useState(false);
  const [error,   setError]       = useState<string | null>(null);

  // Re-sync form when parent loads data
  useEffect(() => {
    if (!persona) return;
    setForm({
      display_name:       persona.display_name       ?? "",
      bio:                persona.bio                ?? "",
      tone:               (persona.tone as Tone)     ?? "professional",
      communication_style: persona.communication_style ?? "",
      sample_captions:    initCaptions(persona),
    });
    setFp(persona.style_fingerprint ?? "");
  }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setSaved(false);
  }
  function setCaption(i: number, v: string) {
    const next = [...form.sample_captions] as [string, string, string];
    next[i] = v;
    set("sample_captions", next);
  }

  async function handleSave() {
    setSaving(true); setGenning(true); setError(null); setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: dbErr } = await supabase.from("persona_profile").upsert(
        {
          user_id: user.id,
          display_name:       form.display_name,
          bio:                form.bio,
          tone:               form.tone,
          communication_style: form.communication_style,
          sample_captions:    form.sample_captions.filter(Boolean),
        },
        { onConflict: "user_id" }
      );
      if (dbErr) throw dbErr;

      const res = await fetch("/api/generate-fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName:        form.display_name,
          bio:                form.bio,
          tone:               form.tone,
          communicationStyle: form.communication_style,
          sampleCaptions:     form.sample_captions,
        }),
      });
      const { fingerprint: fp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);

      await supabase.from("persona_profile")
        .update({ style_fingerprint: fp }).eq("user_id", user.id);

      setFp(fp);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false); setGenning(false);
    }
  }

  async function regenerate() {
    setGenning(true); setError(null);
    try {
      const res = await fetch("/api/generate-fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName:        form.display_name,
          bio:                form.bio,
          tone:               form.tone,
          communicationStyle: form.communication_style,
          sampleCaptions:     form.sample_captions,
        }),
      });
      const { fingerprint: fp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("persona_profile")
        .update({ style_fingerprint: fp }).eq("user_id", user.id);
      setFp(fp);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setGenning(false);
    }
  }

  const hasSomeData = !!(
    form.display_name || form.bio ||
    form.communication_style || form.sample_captions.some(Boolean)
  );

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white">
      {/* Toggle */}
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-5 text-left">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F4F2]">
            <Lightbulb className="h-4 w-4 text-voce-purple" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">
              Help us learn faster{" "}
              <span className="ml-1 rounded-full bg-[#F4F4F2] px-2 py-0.5 text-xs font-medium text-[#94A3B8]">
                optional
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[#94A3B8]">
              Tell us a little more while we&apos;re still learning from your recordings
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasSomeData && !open && (
            <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-medium text-voce-teal">
              Filled in
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-[#94A3B8]" />
                : <ChevronDown className="h-4 w-4 text-[#94A3B8]" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#E2E2E0] px-6 pb-6 pt-5">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Display Name</label>
                <input type="text" value={form.display_name}
                  onChange={(e) => set("display_name", e.target.value)}
                  placeholder="e.g. Sarah Chen" className={INPUT} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Tone</label>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map((t) => (
                    <button key={t} type="button" onClick={() => set("tone", t)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium transition-all",
                        form.tone === t
                          ? "bg-voce-purple text-white"
                          : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-purple hover:text-voce-purple",
                      ].join(" ")}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Short Bio{" "}
                <span className="text-xs font-normal text-[#94A3B8]">2–3 sentences about who you are</span>
              </label>
              <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={2}
                placeholder="e.g. I'm a business coach for women leaving corporate…"
                className={INPUT} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Communication Style{" "}
                <span className="text-xs font-normal text-[#94A3B8]">how you naturally write and talk</span>
              </label>
              <textarea value={form.communication_style}
                onChange={(e) => set("communication_style", e.target.value)} rows={2}
                placeholder='"Short punchy sentences. Ask lots of questions. Real talk, no corporate speak."'
                className={INPUT} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Sample Captions{" "}
                <span className="text-xs font-normal text-[#94A3B8]">paste up to 3 of your best past posts</span>
              </label>
              <div className="space-y-3">
                {([0, 1, 2] as const).map((i) => (
                  <textarea key={i} value={form.sample_captions[i]}
                    onChange={(e) => setCaption(i, e.target.value)} rows={3}
                    placeholder={`Caption ${i + 1}…`} className={INPUT} />
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleSave} disabled={saving || genning}
                className="flex items-center gap-2 rounded-lg bg-voce-purple px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
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
                  <Sparkles className="h-4 w-4 text-voce-purple" />
                  <p className="text-sm font-semibold text-voce-purple">Your Style Fingerprint</p>
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
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MyPersonaPage() {
  const [persona,  setPersona]  = useState<PersonaProfile | null>(null);
  const [notes,    setNotes]    = useState<ThoughtNote[]>([]);
  const [loading,  setLoading]  = useState(true);

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

  const score = calcScore(persona, notes);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-voce-purple" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">My Persona</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Voce learns your voice over time — from your recordings, your style, and your story.
        </p>
      </div>

      <div className="space-y-6">
        <PersonaScoreCard score={score} notes={notes} />
        <VoiceNotesFeed notes={notes} />
        <PersonaFormSection persona={persona} onSaved={fetchData} />
      </div>
    </div>
  );
}
