"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mic, ImagePlus, ChevronDown, ChevronUp,
  Sparkles, Loader2, CheckCircle2, RefreshCw,
  Clock, Lightbulb, AlertCircle,
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
  unit: string;
  pts: number;
}

interface ScoreData {
  total: number;
  metrics: MetricItem[];
}

function calcScore(persona: PersonaProfile | null, notes: ThoughtNote[]): ScoreData {
  const totalSec = notes.reduce((s, n) => s + (n.duration_seconds ?? 0), 0);
  const uniqueTopics = new Set(notes.flatMap((n) => n.tags ?? [])).size;
  const captions = (persona?.sample_captions ?? []).filter(Boolean);
  const formFieldsFilled = [
    persona?.display_name?.trim(),
    persona?.bio?.trim(),
    persona?.communication_style?.trim(),
    persona?.tone,
  ].filter(Boolean).length;

  const m: MetricItem[] = [
    { label: "Voice notes", current: notes.length, target: 5, unit: "notes", pts: Math.min(notes.length / 5, 1) * 20 },
    { label: "Recording time", current: Math.round(totalSec / 60), target: 10, unit: "min", pts: Math.min(totalSec / 600, 1) * 20 },
    { label: "Topic variety", current: uniqueTopics, target: 5, unit: "topics", pts: Math.min(uniqueTopics / 5, 1) * 20 },
    { label: "Sample captions", current: captions.length, target: 1, unit: "captions", pts: captions.length >= 1 ? 20 : 0 },
    { label: "Profile form", current: formFieldsFilled, target: 4, unit: "fields", pts: (formFieldsFilled / 4) * 20 },
  ];

  return { total: Math.round(m.reduce((s, i) => s + i.pts, 0)), metrics: m };
}

function statusLabel(score: number): string {
  if (score < 20) return "Just getting started";
  if (score < 40) return "Building your voice";
  if (score < 70) return "Getting there";
  if (score < 90) return "Strong persona";
  return "Fully trained";
}

function barColor(score: number): string {
  if (score >= 90) return "#7F77DD";
  if (score >= 70) return "#1D9E75";
  if (score >= 40) return "#3B82F6";
  if (score >= 20) return "#F59E0B";
  return "#CBD5E1";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDur(sec: number | null): string | null {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s > 0 ? s + "s" : ""}`.trim() : `${s}s`;
}

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#7F77DD] focus:ring-2 focus:ring-[#7F77DD]/20";

const TONES = ["professional", "casual", "inspirational", "educational", "conversational"] as const;
type Tone = (typeof TONES)[number];

// ── Section 1: Persona Strength Score ─────────────────────────────────────────

function ScoreBreakdown({ metrics }: { metrics: MetricItem[] }) {
  return (
    <div className="mt-4 grid grid-cols-5 gap-2">
      {metrics.map((m) => {
        const pct = Math.min(m.current / m.target, 1);
        const done = pct >= 1;
        return (
          <div key={m.label} className="rounded-lg border border-[#E2E2E0] bg-white p-2.5 text-center">
            <p className="text-[10px] font-medium text-[#94A3B8] leading-tight">{m.label}</p>
            <p className={`mt-1 text-sm font-semibold ${done ? "text-[#1D9E75]" : "text-[#0F172A]"}`}>
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
  const color = barColor(score.total);
  const status = statusLabel(score.total);

  const milestone =
    score.total >= 100 ? { msg: "🎉 Fully trained! Voce knows your voice inside and out.", bg: "#F3F0FE", color: "#7F77DD" }
    : score.total >= 70 ? { msg: "🚀 Your persona is really taking shape — content is starting to sound like you.", bg: "#ECFDF5", color: "#1D9E75" }
    : score.total >= 40 ? { msg: "✨ Nice work! You're building a voice Voce can work with.", bg: "#EFF6FF", color: "#2563EB" }
    : null;

  const needsNudge = score.total < 20;
  const notesNeeded = Math.max(0, 2 - notes.length);

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Persona Strength</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">{status}</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold" style={{ color }}>{score.total}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#F4F4F2]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score.total}%`, backgroundColor: color }}
        />
      </div>

      {/* Breakdown */}
      <ScoreBreakdown metrics={score.metrics} />

      {/* Milestone banner */}
      {milestone && (
        <div className="mt-4 rounded-lg px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: milestone.bg, color: milestone.color }}>
          {milestone.msg}
        </div>
      )}

      {/* Nudge */}
      {needsNudge && (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            Your persona needs a little more to go on!{" "}
            {notesNeeded > 0 && (
              <>Record <strong>{notesNeeded} more voice note{notesNeeded !== 1 ? "s" : ""}</strong> and</>
            )}{" "}
            fill in a bit more of your profile below and we&apos;ll be ready to generate.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Section 2: Voice Notes Feed ────────────────────────────────────────────────

function NoteCard({ note }: { note: ThoughtNote }) {
  const isVoice = !!note.audio_url || !!note.duration_seconds;
  const dur = formatDur(note.duration_seconds);
  const title = note.title || (note.transcript ? note.transcript.slice(0, 60) + "…" : "Untitled note");
  const tags = (note.tags ?? []).slice(0, 4);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#E2E2E0] bg-white p-4">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isVoice ? "bg-[#7F77DD]/10" : "bg-[#1D9E75]/10"}`}>
        {isVoice
          ? <Mic className="h-4 w-4 text-[#7F77DD]" />
          : <ImagePlus className="h-4 w-4 text-[#1D9E75]" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#0F172A]">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
          <span>{formatDate(note.created_at)}</span>
          {dur && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{dur}
              </span>
            </>
          )}
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-[#F4F4F2] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
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
        <Link
          href="/record"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#7F77DD] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#6E66CC]"
        >
          <Mic className="h-3.5 w-3.5" /> Add a voice note
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E2E2E0] py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7F77DD]/10">
            <Mic className="h-6 w-6 text-[#7F77DD]" />
          </div>
          <p className="mt-3 text-sm font-medium text-[#0F172A]">No recordings yet</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Head to{" "}
            <Link href="/record" className="text-[#7F77DD] underline underline-offset-2">
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

// ── Section 3: Optional persona form ──────────────────────────────────────────

interface PersonaFormState {
  display_name: string;
  bio: string;
  tone: Tone;
  communication_style: string;
  sample_captions: [string, string, string];
}

function PersonaFormSection({
  persona,
  onSaved,
}: {
  persona: PersonaProfile | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PersonaFormState>({
    display_name: persona?.display_name ?? "",
    bio: persona?.bio ?? "",
    tone: (persona?.tone as Tone) ?? "professional",
    communication_style: persona?.communication_style ?? "",
    sample_captions: (() => {
      const c = persona?.sample_captions ?? [];
      return ([c[0] ?? "", c[1] ?? "", c[2] ?? ""] as [string, string, string]);
    })(),
  });
  const [fingerprint, setFingerprint] = useState(persona?.style_fingerprint ?? "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync if parent data loads after mount
  useEffect(() => {
    if (!persona) return;
    setForm({
      display_name: persona.display_name ?? "",
      bio: persona.bio ?? "",
      tone: (persona.tone as Tone) ?? "professional",
      communication_style: persona.communication_style ?? "",
      sample_captions: (() => {
        const c = persona.sample_captions ?? [];
        return ([c[0] ?? "", c[1] ?? "", c[2] ?? ""] as [string, string, string]);
      })(),
    });
    setFingerprint(persona.style_fingerprint ?? "");
  }, [persona]);

  function setField<K extends keyof PersonaFormState>(key: K, val: PersonaFormState[K]) {
    setForm((p) => ({ ...p, [key]: val }));
    setSaved(false);
  }
  function setCaption(i: number, val: string) {
    const next = [...form.sample_captions] as [string, string, string];
    next[i] = val;
    setField("sample_captions", next);
  }

  async function handleSave() {
    setSaving(true);
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      await supabase.from("persona_profile").update({ style_fingerprint: fp }).eq("user_id", user.id);
      setFingerprint(fp);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  }

  async function regenerate() {
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
      if (user) await supabase.from("persona_profile").update({ style_fingerprint: fp }).eq("user_id", user.id);
      setFingerprint(fp);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setGenerating(false);
    }
  }

  const hasSomeData = !!(form.display_name || form.bio || form.communication_style || form.sample_captions.some(Boolean));

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7F77DD]/10">
            <Lightbulb className="h-4 w-4 text-[#7F77DD]" />
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
            <span className="rounded-full bg-[#1D9E75]/10 px-2 py-0.5 text-xs font-medium text-[#1D9E75]">
              Filled in
            </span>
          )}
          {open
            ? <ChevronUp className="h-4 w-4 text-[#94A3B8]" />
            : <ChevronDown className="h-4 w-4 text-[#94A3B8]" />}
        </div>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="border-t border-[#E2E2E0] px-6 pb-6 pt-5">
          <div className="space-y-5">
            {/* Name + bio */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Display Name</label>
                <input type="text" value={form.display_name}
                  onChange={(e) => setField("display_name", e.target.value)}
                  placeholder="e.g. Sarah Chen" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                  Tone
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map((t) => (
                    <button key={t} type="button" onClick={() => setField("tone", t)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium transition-all",
                        form.tone === t
                          ? "bg-[#7F77DD] text-white"
                          : "border border-[#E2E2E0] text-[#64748B] hover:border-[#7F77DD] hover:text-[#7F77DD]",
                      ].join(" ")}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Short Bio
                <span className="ml-2 text-xs font-normal text-[#94A3B8]">2–3 sentences about who you are</span>
              </label>
              <textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} rows={2}
                placeholder="e.g. I'm a business coach for women leaving corporate…"
                className={inputCls} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Communication Style Notes
                <span className="ml-2 text-xs font-normal text-[#94A3B8]">how you naturally write and talk</span>
              </label>
              <textarea value={form.communication_style}
                onChange={(e) => setField("communication_style", e.target.value)} rows={2}
                placeholder='e.g. "Short punchy sentences. Ask lots of questions. Real talk, no corporate speak."'
                className={inputCls} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Sample Captions
                <span className="ml-2 text-xs font-normal text-[#94A3B8]">paste up to 3 of your best past posts</span>
              </label>
              <div className="space-y-3">
                {([0, 1, 2] as const).map((i) => (
                  <textarea key={i} value={form.sample_captions[i]}
                    onChange={(e) => setCaption(i, e.target.value)} rows={3}
                    placeholder={`Caption ${i + 1}…`} className={inputCls} />
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleSave} disabled={saving || generating}
                className="flex items-center gap-2 rounded-lg bg-[#7F77DD] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6E66CC] disabled:opacity-60">
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating fingerprint…</>
                  : saved
                  ? <><CheckCircle2 className="h-4 w-4" /> Saved</>
                  : <><Sparkles className="h-4 w-4" /> Save &amp; generate style fingerprint</>}
              </button>
              {saved && <p className="text-sm text-[#1D9E75]">✓ Persona updated</p>}
            </div>
          </div>

          {/* Style fingerprint output */}
          {fingerprint && (
            <div className="mt-5 rounded-xl border border-[#7F77DD]/20 bg-[#7F77DD]/5 p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#7F77DD]" />
                  <p className="text-sm font-semibold text-[#7F77DD]">Your Style Fingerprint</p>
                </div>
                <button onClick={regenerate} disabled={generating}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#7F77DD] transition hover:bg-[#7F77DD]/10 disabled:opacity-50">
                  {generating
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <RefreshCw className="h-3 w-3" />}
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
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [notes, setNotes] = useState<ThoughtNote[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Loader2 className="h-6 w-6 animate-spin text-[#7F77DD]" />
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
