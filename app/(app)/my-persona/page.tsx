"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronDown, Sparkles, Loader2, CheckCircle2,
  RefreshCw, Plus, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RefAccount { handle: string; whatLike: string; }

interface ThoughtNote {
  id: string;
  duration_seconds: number | null;
}

interface PersonaProfile {
  display_name: string | null;
  bio: string | null;
  tone: string | null;
  communication_style: string | null;
  sample_captions: string[] | null;
  style_fingerprint: string | null;
  // new fields
  instagram_handle: string | null;
  niche: string | null;
  audience: string | null;
  transformation_before: string | null;
  transformation_after: string | null;
  tone_words: string[] | null;
  tone_description: string | null;
  beliefs: string | null;
  recurring_themes: string | null;
  pushback: string | null;
  reference_accounts: RefAccount[] | null;
  instagram_growth_handle: string | null;
}

interface ScoreStats {
  total:        number;
  inputCount:   number;
  audioMinutes: number;
  profilePct:   number;
  captionCount: number;
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

const INPUT =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

const TONE_CHIPS = [
  "Raw + honest", "Warm + nurturing", "Bold + direct", "Playful + witty",
  "Calm + grounded", "Inspirational", "Intellectual", "Vulnerable", "No-bullshit",
] as const;

// ── Score engine ───────────────────────────────────────────────────────────────

function calcScore(persona: PersonaProfile | null, notes: ThoughtNote[]): ScoreStats {
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

// ── Persona form (collapsed by default) ───────────────────────────────────────

interface FormState {
  instagram_handle:      string;
  niche:                 string;
  audience:              string;
  transformation_before: string;
  transformation_after:  string;
  tone_words:            string[];
  tone_description:      string;
  beliefs:               string;
  recurring_themes:      string;
  pushback:              string;
  reference_accounts:    RefAccount[];
  instagram_growth_handle: string;
}

function initForm(p: PersonaProfile | null): FormState {
  const refs = (p?.reference_accounts ?? []);
  return {
    instagram_handle:      p?.instagram_handle ?? p?.display_name ?? "",
    niche:                 p?.niche            ?? "",
    audience:              p?.audience         ?? "",
    transformation_before: p?.transformation_before ?? "",
    transformation_after:  p?.transformation_after  ?? "",
    tone_words:            p?.tone_words        ?? [],
    tone_description:      p?.tone_description  ?? "",
    beliefs:               p?.beliefs           ?? "",
    recurring_themes:      p?.recurring_themes  ?? "",
    pushback:              p?.pushback          ?? "",
    reference_accounts:    refs.length > 0 ? refs : [{ handle: "", whatLike: "" }],
    instagram_growth_handle: p?.instagram_growth_handle ?? "",
  };
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
      {children}
    </p>
  );
}

function FieldLabel({ label, helper }: { label: string; helper?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-[#0F172A]">{label}</p>
      {helper && <p className="mt-0.5 text-xs text-[#94A3B8]">{helper}</p>}
    </div>
  );
}

function PersonaForm({ persona, onSaved }: {
  persona: PersonaProfile | null;
  onSaved: () => void;
}) {
  const [open,     setOpen]    = useState(false);
  const [form,     setForm]    = useState<FormState>(() => initForm(persona));
  const [fp,       setFp]      = useState(persona?.style_fingerprint ?? "");
  const [saving,   setSaving]  = useState(false);
  const [genning,  setGenning] = useState(false);
  const [saved,    setSaved]   = useState(false);
  const [error,    setError]   = useState<string | null>(null);

  useEffect(() => {
    setForm(initForm(persona));
    setFp(persona?.style_fingerprint ?? "");
  }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v })); setSaved(false);
  }

  function toggleTone(t: string) {
    const next = form.tone_words.includes(t)
      ? form.tone_words.filter(x => x !== t)
      : [...form.tone_words, t];
    set("tone_words", next);
  }

  function setRef(i: number, field: keyof RefAccount, v: string) {
    const next = form.reference_accounts.map((r, idx) =>
      idx === i ? { ...r, [field]: v } : r
    );
    set("reference_accounts", next);
  }

  function addRef() {
    if (form.reference_accounts.length >= 5) return;
    set("reference_accounts", [...form.reference_accounts, { handle: "", whatLike: "" }]);
  }

  function removeRef(i: number) {
    const next = form.reference_accounts.filter((_, idx) => idx !== i);
    set("reference_accounts", next.length > 0 ? next : [{ handle: "", whatLike: "" }]);
  }

  async function handleSave() {
    setSaving(true); setGenning(true); setError(null); setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const cleanRefs = form.reference_accounts.filter(r => r.handle.trim());

      const { error: dbErr } = await supabase.from("persona_profile").upsert(
        {
          user_id:                  user.id,
          display_name:             form.instagram_handle,
          instagram_handle:         form.instagram_handle,
          instagram_growth_handle:  form.instagram_growth_handle,
          niche:                    form.niche,
          audience:              form.audience,
          transformation_before: form.transformation_before,
          transformation_after:  form.transformation_after,
          tone_words:            form.tone_words,
          tone_description:      form.tone_description,
          beliefs:               form.beliefs,
          recurring_themes:      form.recurring_themes,
          pushback:              form.pushback,
          reference_accounts:    cleanRefs,
        },
        { onConflict: "user_id" }
      );
      if (dbErr) throw dbErr;

      const res = await fetch("/api/generate-fingerprint", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramHandle:      form.instagram_handle,
          niche:                form.niche,
          audience:             form.audience,
          transformationBefore: form.transformation_before,
          transformationAfter:  form.transformation_after,
          toneWords:            form.tone_words,
          toneDescription:      form.tone_description,
          beliefs:              form.beliefs,
          recurringThemes:      form.recurring_themes,
          pushback:             form.pushback,
          referenceAccounts:    cleanRefs,
        }),
      });
      const { fingerprint: newFp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);

      await supabase.from("persona_profile")
        .update({ style_fingerprint: newFp }).eq("user_id", user.id);

      setFp(newFp); setSaved(true); onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false); setGenning(false);
    }
  }

  async function regenerate() {
    setGenning(true); setError(null);
    try {
      const cleanRefs = form.reference_accounts.filter(r => r.handle.trim());
      const res = await fetch("/api/generate-fingerprint", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramHandle:      form.instagram_handle,
          niche:                form.niche,
          audience:             form.audience,
          transformationBefore: form.transformation_before,
          transformationAfter:  form.transformation_after,
          toneWords:            form.tone_words,
          toneDescription:      form.tone_description,
          beliefs:              form.beliefs,
          recurringThemes:      form.recurring_themes,
          pushback:             form.pushback,
          referenceAccounts:    cleanRefs,
        }),
      });
      const { fingerprint: newFp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("persona_profile")
        .update({ style_fingerprint: newFp }).eq("user_id", user.id);
      setFp(newFp); onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setGenning(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 p-5 text-left transition hover:bg-[#FAFAF8]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-voce-indigo/10">
          <Sparkles className="h-4 w-4 text-voce-indigo" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#0F172A]">Help us learn faster</p>
          <p className="text-xs text-[#94A3B8]">
            Tell Voce about your voice, niche, and audience
          </p>
        </div>
        <span className="mr-2 rounded-full bg-[#F4F4F2] px-2.5 py-0.5 text-[10px] font-medium text-[#94A3B8]">
          Optional
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Expanded form body */}
      {open && (
        <div className="border-t border-[#E2E2E0] px-5 pb-6 pt-5 space-y-6">

          {/* ── INSTAGRAM ACCOUNTS ── */}
          <div>
            <SectionHeading>Instagram Accounts</SectionHeading>
            <div className="space-y-4">
              <div>
                <FieldLabel
                  label="Your personal Instagram"
                  helper="We'll learn from your existing posts and captions to understand how you naturally write, your vocabulary, topics you return to, and your energy."
                />
                <div className="flex items-center rounded-lg border border-[#E2E2E0] bg-white transition focus-within:border-voce-indigo focus-within:ring-2 focus-within:ring-voce-indigo/20">
                  <span className="px-3 text-sm text-[#94A3B8] select-none">@</span>
                  <input
                    type="text"
                    value={form.instagram_handle}
                    onChange={e => set("instagram_handle", e.target.value)}
                    placeholder="yourhandle"
                    className="flex-1 rounded-r-lg bg-transparent py-2.5 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
                  />
                </div>
              </div>
              <div>
                <FieldLabel
                  label="Instagram account you want to grow"
                  helper="This is where Voce will help you publish content. Can be the same as your personal account or a separate business/creator account."
                />
                <div className="flex items-center rounded-lg border border-[#E2E2E0] bg-white transition focus-within:border-voce-indigo focus-within:ring-2 focus-within:ring-voce-indigo/20">
                  <span className="px-3 text-sm text-[#94A3B8] select-none">@</span>
                  <input
                    type="text"
                    value={form.instagram_growth_handle}
                    onChange={e => set("instagram_growth_handle", e.target.value)}
                    placeholder="yourbrandhandle"
                    className="flex-1 rounded-r-lg bg-transparent py-2.5 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Connection status banner — shows once at least one handle is saved */}
            {(persona?.instagram_handle?.trim() || persona?.instagram_growth_handle?.trim()) && (
              <div className="mt-4 rounded-xl bg-voce-indigo/8 px-4 py-3">
                <p className="text-xs leading-relaxed text-voce-indigo">
                  ✦ We&apos;ll start learning from your Instagram once your account is connected.
                  For now, keep feeding Voce with voice notes, photos and imports — every input
                  makes your persona stronger.
                </p>
              </div>
            )}
          </div>

          {/* ── YOUR NICHE & AUDIENCE ── */}
          <div>
            <SectionHeading>Your Niche &amp; Audience</SectionHeading>
            <div className="space-y-5">

              <div>
                <FieldLabel
                  label="Your niche — what you talk about"
                  helper="Be specific. Not 'wellness' but 'nervous system healing for burnt-out women in their 30s'."
                />
                <textarea
                  value={form.niche}
                  onChange={e => set("niche", e.target.value)}
                  rows={2}
                  placeholder="My niche is:"
                  className={INPUT}
                />
              </div>

              <div>
                <FieldLabel
                  label="Your audience — who you're talking to"
                  helper="Describe one real person. Their age, situation, what keeps them up at night."
                />
                <textarea
                  value={form.audience}
                  onChange={e => set("audience", e.target.value)}
                  rows={2}
                  placeholder="My audience is:"
                  className={INPUT}
                />
              </div>

              <div>
                <FieldLabel
                  label="What transformation do you help them with?"
                  helper="What's different about their life after following you for 6 months?"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <textarea
                    value={form.transformation_before}
                    onChange={e => set("transformation_before", e.target.value)}
                    rows={3}
                    placeholder="Before me they feel..."
                    className={INPUT}
                  />
                  <textarea
                    value={form.transformation_after}
                    onChange={e => set("transformation_after", e.target.value)}
                    rows={3}
                    placeholder="After me they feel..."
                    className={INPUT}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ── YOUR VOICE & TONE ── */}
          <div className="border-t border-[#F4F4F2] pt-5">
            <SectionHeading>Your Voice &amp; Tone</SectionHeading>
            <div className="space-y-5">

              <div>
                <FieldLabel
                  label="Pick the tones that describe how you show up online:"
                  helper="Select all that fit."
                />
                <div className="flex flex-wrap gap-2">
                  {TONE_CHIPS.map(t => (
                    <button key={t} type="button" onClick={() => toggleTone(t)}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                        form.tone_words.includes(t)
                          ? "bg-voce-indigo text-white"
                          : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo hover:text-voce-indigo",
                      ].join(" ")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel label="In my own words, my tone is:" />
                <textarea
                  value={form.tone_description}
                  onChange={e => set("tone_description", e.target.value)}
                  rows={2}
                  placeholder="e.g. Direct but warm. I swear sometimes. I use short sentences. I don't do corporate speak."
                  className={INPUT}
                />
              </div>

            </div>
          </div>

          {/* ── YOUR VALUES & BELIEFS ── */}
          <div className="border-t border-[#F4F4F2] pt-5">
            <SectionHeading>Your Values &amp; Beliefs</SectionHeading>
            <div className="space-y-5">

              <div>
                <FieldLabel
                  label="What do you believe that most people in your niche don't say out loud?"
                  helper="This is your point of view. Your slightly controversial take. What makes you different."
                />
                <textarea
                  value={form.beliefs}
                  onChange={e => set("beliefs", e.target.value)}
                  rows={3}
                  placeholder="I believe that..."
                  className={INPUT}
                />
              </div>

              <div>
                <FieldLabel
                  label="What topics or themes come up again and again in your life / content?"
                  helper="e.g. 'freedom over security', 'slowness as rebellion', 'starting over in your 30s'"
                />
                <textarea
                  value={form.recurring_themes}
                  onChange={e => set("recurring_themes", e.target.value)}
                  rows={2}
                  placeholder="My recurring themes:"
                  className={INPUT}
                />
              </div>

              <div>
                <FieldLabel
                  label="What do you stand against?"
                  helper="e.g. hustle culture, toxic positivity, 'just manifest it' advice"
                />
                <textarea
                  value={form.pushback}
                  onChange={e => set("pushback", e.target.value)}
                  rows={2}
                  placeholder="I push back on:"
                  className={INPUT}
                />
              </div>

            </div>
          </div>

          {/* ── STYLE REFERENCE ACCOUNTS ── */}
          <div className="border-t border-[#F4F4F2] pt-5">
            <SectionHeading>Style Reference Accounts</SectionHeading>
            <p className="mb-4 text-xs leading-relaxed text-[#64748B]">
              These are not accounts to copy. They are accounts whose style, energy, or tone
              resonates with something in you. Voce uses them as calibration points, not templates.
            </p>
            <div className="space-y-3">
              {form.reference_accounts.map((ref, i) => (
                <div key={i} className="rounded-lg border border-[#E2E2E0] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-lg border border-[#E2E2E0] bg-white transition focus-within:border-voce-indigo focus-within:ring-2 focus-within:ring-voce-indigo/20">
                      <span className="px-3 text-sm text-[#94A3B8] select-none">@</span>
                      <input
                        type="text"
                        value={ref.handle}
                        onChange={e => setRef(i, "handle", e.target.value)}
                        placeholder="handle"
                        className="flex-1 rounded-r-lg bg-transparent py-2 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
                      />
                    </div>
                    {form.reference_accounts.length > 1 && (
                      <button onClick={() => removeRef(i)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={ref.whatLike}
                    onChange={e => setRef(i, "whatLike", e.target.value)}
                    placeholder="What I like about their style"
                    className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20"
                  />
                </div>
              ))}
            </div>
            {form.reference_accounts.length < 5 && (
              <button onClick={addRef}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-voce-indigo transition hover:opacity-70">
                <Plus className="h-3.5 w-3.5" /> Add another account
              </button>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          {/* ── Save button ── */}
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

          {/* ── Style fingerprint ── */}
          {fp && (
            <div className="rounded-xl border border-[#E2E2E0] bg-[#F8F8FF] p-5">
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
              <p className="text-sm leading-relaxed text-[#0F172A]">{fp}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Persona strength score ─────────────────────────────────────────────────────

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

      <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-[#F4F4F2]">
        <div
          className="h-full rounded-full bg-voce-indigo transition-all duration-700"
          style={{ width: `${stats.total}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "inputs",    value: stats.inputCount   },
          { label: "min audio", value: stats.audioMinutes },
          { label: "% profile", value: stats.profilePct,  suffix: "%" },
          { label: "captions",  value: stats.captionCount },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-[#F4F4F2] px-3 py-2.5 text-center">
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
        supabase.from("thought_notes")
          .select("id, duration_seconds")
          .eq("user_id", user.id)
          .neq("status", "archived"),
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
        <PersonaForm persona={persona} onSaved={fetchData} />
        <ScoreCard stats={stats} />
      </div>
    </div>
  );
}
