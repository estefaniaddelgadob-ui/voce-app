"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown, Sparkles, Loader2, CheckCircle2,
  RefreshCw, Plus, X, Pencil, Trash2, Check, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RefAccount { handle: string; whatLike: string; }

interface PersonaProfile {
  display_name: string | null;
  bio: string | null;
  tone: string | null;
  communication_style: string | null;
  sample_captions: string[] | null;
  style_fingerprint: string | null;
  instagram_handle: string | null;
  instagram_growth_handle: string | null;
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
}

interface Audience {
  id: string;
  user_id?: string;
  name: string;
  age_range: string;
  location: string;
  interests: string[];
  pain_points: string;
  dreams: string;
  platforms: string[];
  tone: string[];
  description: string;
  created_at?: string;
}

type AudienceForm = Omit<Audience, "id" | "user_id" | "created_at">;

// ── Constants ──────────────────────────────────────────────────────────────────

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

const PLATFORMS  = ["Instagram", "TikTok", "LinkedIn", "Pinterest", "YouTube"] as const;
const AUD_TONES  = ["Warm", "Direct", "Inspirational", "Educational", "Funny"]  as const;
const AGE_RANGES = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+", "All ages"] as const;

const EMPTY_AUDIENCE: AudienceForm = {
  name: "", age_range: "", location: "", interests: [],
  pain_points: "", dreams: "", platforms: [], tone: [], description: "",
};

// ── Persona form helpers ───────────────────────────────────────────────────────

interface FormState {
  instagram_handle:        string;
  instagram_growth_handle: string;
  niche:                   string;
  audience:                string;
  transformation_before:   string;
  transformation_after:    string;
  tone_words:              string[];
  tone_description:        string;
  beliefs:                 string;
  recurring_themes:        string;
  pushback:                string;
  reference_accounts:      RefAccount[];
}

function initForm(p: PersonaProfile | null): FormState {
  const refs = p?.reference_accounts ?? [];
  return {
    instagram_handle:        p?.instagram_handle        ?? p?.display_name ?? "",
    instagram_growth_handle: p?.instagram_growth_handle ?? "",
    niche:                   p?.niche                   ?? "",
    audience:                p?.audience                ?? "",
    transformation_before:   p?.transformation_before   ?? "",
    transformation_after:    p?.transformation_after    ?? "",
    tone_words:              p?.tone_words              ?? [],
    tone_description:        p?.tone_description        ?? "",
    beliefs:                 p?.beliefs                 ?? "",
    recurring_themes:        p?.recurring_themes        ?? "",
    pushback:                p?.pushback                ?? "",
    reference_accounts:      refs.length > 0 ? refs : [{ handle: "", whatLike: "" }],
  };
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{children}</p>;
}
function FieldLabel({ label, helper }: { label: string; helper?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-[#0F172A]">{label}</p>
      {helper && <p className="mt-0.5 text-xs text-[#94A3B8]">{helper}</p>}
    </div>
  );
}

// ── Persona form ───────────────────────────────────────────────────────────────

function PersonaForm({ persona, onSaved }: { persona: PersonaProfile | null; onSaved: () => void }) {
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState<FormState>(() => initForm(persona));
  const [fp,      setFp]      = useState(persona?.style_fingerprint ?? "");
  const [saving,  setSaving]  = useState(false);
  const [genning, setGenning] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => { setForm(initForm(persona)); setFp(persona?.style_fingerprint ?? ""); }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm(p => ({ ...p, [k]: v })); setSaved(false); }
  function toggleTone(t: string) { set("tone_words", form.tone_words.includes(t) ? form.tone_words.filter(x => x !== t) : [...form.tone_words, t]); }
  function setRef(i: number, field: keyof RefAccount, v: string) { set("reference_accounts", form.reference_accounts.map((r, idx) => idx === i ? { ...r, [field]: v } : r)); }
  function addRef() { if (form.reference_accounts.length < 5) set("reference_accounts", [...form.reference_accounts, { handle: "", whatLike: "" }]); }
  function removeRef(i: number) { const next = form.reference_accounts.filter((_, idx) => idx !== i); set("reference_accounts", next.length > 0 ? next : [{ handle: "", whatLike: "" }]); }

  async function handleSave() {
    setSaving(true); setGenning(true); setError(null); setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const cleanRefs = form.reference_accounts.filter(r => r.handle.trim());
      const { error: dbErr } = await supabase.from("persona_profile").upsert({
        user_id: user.id, display_name: form.instagram_handle,
        instagram_handle: form.instagram_handle, instagram_growth_handle: form.instagram_growth_handle,
        niche: form.niche, audience: form.audience,
        transformation_before: form.transformation_before, transformation_after: form.transformation_after,
        tone_words: form.tone_words, tone_description: form.tone_description,
        beliefs: form.beliefs, recurring_themes: form.recurring_themes,
        pushback: form.pushback, reference_accounts: cleanRefs,
      }, { onConflict: "user_id" });
      if (dbErr) throw dbErr;
      const res = await fetch("/api/generate-fingerprint", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramHandle: form.instagram_handle, niche: form.niche, audience: form.audience, transformationBefore: form.transformation_before, transformationAfter: form.transformation_after, toneWords: form.tone_words, toneDescription: form.tone_description, beliefs: form.beliefs, recurringThemes: form.recurring_themes, pushback: form.pushback, referenceAccounts: cleanRefs }),
      });
      const { fingerprint: newFp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);
      await supabase.from("persona_profile").update({ style_fingerprint: newFp }).eq("user_id", user.id);
      setFp(newFp); setSaved(true); onSaved();
    } catch (err) { setError(errMsg(err)); }
    finally { setSaving(false); setGenning(false); }
  }

  async function regenerate() {
    setGenning(true); setError(null);
    try {
      const cleanRefs = form.reference_accounts.filter(r => r.handle.trim());
      const res = await fetch("/api/generate-fingerprint", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramHandle: form.instagram_handle, niche: form.niche, audience: form.audience, transformationBefore: form.transformation_before, transformationAfter: form.transformation_after, toneWords: form.tone_words, toneDescription: form.tone_description, beliefs: form.beliefs, recurringThemes: form.recurring_themes, pushback: form.pushback, referenceAccounts: cleanRefs }),
      });
      const { fingerprint: newFp, error: fpErr } = await res.json();
      if (fpErr) throw new Error(fpErr);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("persona_profile").update({ style_fingerprint: newFp }).eq("user_id", user.id);
      setFp(newFp); onSaved();
    } catch (err) { setError(errMsg(err)); }
    finally { setGenning(false); }
  }

  const hasAnyData = !!(
    persona?.instagram_handle?.trim() || persona?.instagram_growth_handle?.trim() ||
    persona?.niche?.trim() || persona?.audience?.trim() || (persona?.tone_words ?? []).length > 0 ||
    persona?.tone_description?.trim() || persona?.beliefs?.trim() ||
    persona?.recurring_themes?.trim() || persona?.pushback?.trim() ||
    persona?.transformation_before?.trim() || persona?.transformation_after?.trim()
  );

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 p-5 text-left transition hover:bg-[#FAFAF8]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-voce-indigo/10">
          <Sparkles className="h-4 w-4 text-voce-indigo" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#0F172A]">Help us learn faster</p>
          <p className="text-xs text-[#94A3B8]">Tell Voce about your voice, niche, and audience</p>
        </div>
        {hasAnyData
          ? <span className="mr-2 text-sm font-semibold text-voce-teal">✓</span>
          : <span className="mr-2 rounded-full bg-[#F4F4F2] px-2.5 py-0.5 text-[10px] font-medium text-[#94A3B8]">Optional</span>}
        <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div className="border-t border-[#E2E2E0] px-5 pb-6 pt-5 space-y-6">

          {/* Instagram accounts */}
          <div>
            <SectionHeading>Instagram Accounts</SectionHeading>
            <div className="space-y-4">
              <div>
                <FieldLabel label="Your personal Instagram" helper="We'll learn from your existing posts and captions to understand how you naturally write, your vocabulary, topics you return to, and your energy." />
                <div className="flex items-center rounded-lg border border-[#E2E2E0] bg-white transition focus-within:border-voce-indigo focus-within:ring-2 focus-within:ring-voce-indigo/20">
                  <span className="px-3 text-sm text-[#94A3B8] select-none">@</span>
                  <input type="text" value={form.instagram_handle} onChange={e => set("instagram_handle", e.target.value)} placeholder="yourhandle" className="flex-1 rounded-r-lg bg-transparent py-2.5 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none" />
                </div>
              </div>
              <div>
                <FieldLabel label="Instagram account you want to grow" helper="This is where Voce will help you publish content. Can be the same as your personal account or a separate business/creator account." />
                <div className="flex items-center rounded-lg border border-[#E2E2E0] bg-white transition focus-within:border-voce-indigo focus-within:ring-2 focus-within:ring-voce-indigo/20">
                  <span className="px-3 text-sm text-[#94A3B8] select-none">@</span>
                  <input type="text" value={form.instagram_growth_handle} onChange={e => set("instagram_growth_handle", e.target.value)} placeholder="yourbrandhandle" className="flex-1 rounded-r-lg bg-transparent py-2.5 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none" />
                </div>
              </div>
            </div>
            {(persona?.instagram_handle?.trim() || persona?.instagram_growth_handle?.trim()) && (
              <div className="mt-4 rounded-xl bg-voce-indigo/10 px-4 py-3">
                <p className="text-xs leading-relaxed text-voce-indigo">✦ We&apos;ll start learning from your Instagram once your account is connected. For now, keep feeding Voce with voice notes, photos and imports — every input makes your persona stronger.</p>
              </div>
            )}
          </div>

          {/* Niche & Audience */}
          <div className="border-t border-[#F4F4F2] pt-5">
            <SectionHeading>Your Niche &amp; Audience</SectionHeading>
            <div className="space-y-5">
              <div>
                <FieldLabel label="Your niche — what you talk about" helper="Be specific. Not 'wellness' but 'nervous system healing for burnt-out women in their 30s'." />
                <textarea value={form.niche} onChange={e => set("niche", e.target.value)} rows={2} placeholder="My niche is:" className={INPUT} />
              </div>
              <div>
                <FieldLabel label="Your audience — who you're talking to" helper="Describe one real person. Their age, situation, what keeps them up at night." />
                <textarea value={form.audience} onChange={e => set("audience", e.target.value)} rows={2} placeholder="My audience is:" className={INPUT} />
              </div>
              <div>
                <FieldLabel label="What transformation do you help them with?" helper="What's different about their life after following you for 6 months?" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <textarea value={form.transformation_before} onChange={e => set("transformation_before", e.target.value)} rows={3} placeholder="Before me they feel..." className={INPUT} />
                  <textarea value={form.transformation_after}  onChange={e => set("transformation_after",  e.target.value)} rows={3} placeholder="After me they feel..."  className={INPUT} />
                </div>
              </div>
            </div>
          </div>

          {/* Voice & Tone */}
          <div className="border-t border-[#F4F4F2] pt-5">
            <SectionHeading>Your Voice &amp; Tone</SectionHeading>
            <div className="space-y-5">
              <div>
                <FieldLabel label="Pick the tones that describe how you show up online:" helper="Select all that fit." />
                <div className="flex flex-wrap gap-2">
                  {TONE_CHIPS.map(t => (
                    <button key={t} type="button" onClick={() => toggleTone(t)}
                      className={["rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                        form.tone_words.includes(t) ? "bg-voce-indigo text-white" : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo hover:text-voce-indigo"].join(" ")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel label="In my own words, my tone is:" />
                <textarea value={form.tone_description} onChange={e => set("tone_description", e.target.value)} rows={2} placeholder="e.g. Direct but warm. I swear sometimes. I use short sentences. I don't do corporate speak." className={INPUT} />
              </div>
            </div>
          </div>

          {/* Values & Beliefs */}
          <div className="border-t border-[#F4F4F2] pt-5">
            <SectionHeading>Your Values &amp; Beliefs</SectionHeading>
            <div className="space-y-5">
              <div>
                <FieldLabel label="What do you believe that most people in your niche don't say out loud?" helper="This is your point of view. Your slightly controversial take. What makes you different." />
                <textarea value={form.beliefs} onChange={e => set("beliefs", e.target.value)} rows={3} placeholder="I believe that..." className={INPUT} />
              </div>
              <div>
                <FieldLabel label="What topics or themes come up again and again in your life / content?" helper="e.g. 'freedom over security', 'slowness as rebellion', 'starting over in your 30s'" />
                <textarea value={form.recurring_themes} onChange={e => set("recurring_themes", e.target.value)} rows={2} placeholder="My recurring themes:" className={INPUT} />
              </div>
              <div>
                <FieldLabel label="What do you stand against?" helper="e.g. hustle culture, toxic positivity, 'just manifest it' advice" />
                <textarea value={form.pushback} onChange={e => set("pushback", e.target.value)} rows={2} placeholder="I push back on:" className={INPUT} />
              </div>
            </div>
          </div>

          {/* Reference accounts */}
          <div className="border-t border-[#F4F4F2] pt-5">
            <SectionHeading>Style Reference Accounts</SectionHeading>
            <p className="mb-4 text-xs leading-relaxed text-[#64748B]">These are not accounts to copy. They are accounts whose style, energy, or tone resonates with something in you. Voce uses them as calibration points, not templates.</p>
            <div className="space-y-3">
              {form.reference_accounts.map((ref, i) => (
                <div key={i} className="rounded-lg border border-[#E2E2E0] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-lg border border-[#E2E2E0] bg-white transition focus-within:border-voce-indigo focus-within:ring-2 focus-within:ring-voce-indigo/20">
                      <span className="px-3 text-sm text-[#94A3B8] select-none">@</span>
                      <input type="text" value={ref.handle} onChange={e => setRef(i, "handle", e.target.value)} placeholder="handle" className="flex-1 rounded-r-lg bg-transparent py-2 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none" />
                    </div>
                    {form.reference_accounts.length > 1 && (
                      <button onClick={() => removeRef(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input type="text" value={ref.whatLike} onChange={e => setRef(i, "whatLike", e.target.value)} placeholder="What I like about their style" className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20" />
                </div>
              ))}
            </div>
            {form.reference_accounts.length < 5 && (
              <button onClick={addRef} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-voce-indigo transition hover:opacity-70">
                <Plus className="h-3.5 w-3.5" /> Add another account
              </button>
            )}
          </div>

          {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={saving || genning}
              className="flex items-center gap-2 rounded-lg bg-voce-indigo px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {genning ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating fingerprint…</> : saved ? <><CheckCircle2 className="h-4 w-4" /> Saved</> : <><Sparkles className="h-4 w-4" /> Save &amp; generate style fingerprint</>}
            </button>
            {saved && <p className="text-sm text-voce-teal">✓ Persona updated</p>}
          </div>

          {fp && (
            <div className="rounded-xl border border-[#E2E2E0] bg-[#F8F8FF] p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-voce-indigo" />
                  <p className="text-sm font-semibold text-voce-indigo">Your Style Fingerprint</p>
                </div>
                <button onClick={regenerate} disabled={genning}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E2E2E0] px-2.5 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-[#F4F4F2] disabled:opacity-50">
                  {genning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
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

// ── Audience form panel ────────────────────────────────────────────────────────

function AudienceFormPanel({ initial, onSave, onCancel, saving }: {
  initial: Partial<Audience>; onSave: (form: AudienceForm) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [name,         setName]         = useState(initial.name         ?? "");
  const [ageRange,     setAgeRange]     = useState(initial.age_range    ?? "");
  const [location,     setLocation]     = useState(initial.location     ?? "");
  const [interestsTxt, setInterestsTxt] = useState((initial.interests   ?? []).join(", "));
  const [painPoints,   setPainPoints]   = useState(initial.pain_points  ?? "");
  const [dreams,       setDreams]       = useState(initial.dreams       ?? "");
  const [platforms,    setPlatforms]    = useState<string[]>(initial.platforms ?? []);
  const [tone,         setTone]         = useState<string[]>(initial.tone      ?? []);
  const [description,  setDescription]  = useState(initial.description  ?? "");

  function toggle<T extends string>(arr: T[], setArr: (v: T[]) => void, val: T) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ name, age_range: ageRange, location, interests: interestsTxt.split(",").map(s => s.trim()).filter(Boolean), pain_points: painPoints, dreams, platforms, tone, description }); }}
      className="rounded-xl border border-voce-indigo/20 bg-voce-indigo/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">{initial.id ? "Edit Audience" : "New Audience"}</h3>
        <button type="button" onClick={onCancel} className="rounded-full p-1 text-[#94A3B8] hover:text-[#64748B]"><X className="h-4 w-4" /></button>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Audience name</label>
        <input required value={name} onChange={e => setName(e.target.value)} placeholder='e.g. "Working mums", "Female entrepreneurs"' className={INPUT} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Age range</label>
          <select value={ageRange} onChange={e => setAgeRange(e.target.value)} className={INPUT}>
            <option value="">Select range…</option>
            {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. UK, Australia, Global" className={INPUT} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Interests <span className="font-normal text-[#94A3B8]">comma separated</span></label>
        <input value={interestsTxt} onChange={e => setInterestsTxt(e.target.value)} placeholder="e.g. fitness, personal finance, parenting" className={INPUT} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Pain points</label>
        <textarea value={painPoints} onChange={e => setPainPoints(e.target.value)} rows={2} placeholder="What problems do they have?" className={INPUT} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Dreams</label>
        <textarea value={dreams} onChange={e => setDreams(e.target.value)} rows={2} placeholder="What do they want to achieve?" className={INPUT} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#0F172A]">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p} type="button" onClick={() => toggle(platforms, setPlatforms, p)}
              className={["rounded-lg border px-3 py-1.5 text-sm font-medium transition", platforms.includes(p) ? "border-voce-indigo bg-voce-indigo/10 text-voce-indigo" : "border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/40"].join(" ")}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#0F172A]">Tone that resonates with them</label>
        <div className="flex flex-wrap gap-2">
          {AUD_TONES.map(t => (
            <button key={t} type="button" onClick={() => toggle(tone, setTone, t)}
              className={["rounded-full px-3 py-1 text-sm font-medium transition", tone.includes(t) ? "bg-voce-indigo text-white" : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/40"].join(" ")}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">One sentence description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Women 30–45 leaving corporate to build businesses they love" className={INPUT} />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving || !name.trim()}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> Save audience</>}
        </button>
        <button type="button" onClick={onCancel}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E2E0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F4F4F2]">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Audience card ──────────────────────────────────────────────────────────────

function AudienceCard({ audience, onEdit, onDelete }: { audience: Audience; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#0F172A]">{audience.name}</h3>
          {audience.description && <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]">{audience.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onEdit} className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-[#F4F4F2] hover:text-[#0F172A]"><Pencil className="h-4 w-4" /></button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {audience.age_range && <span className="rounded-full bg-[#F4F4F2] px-2.5 py-0.5 text-xs text-[#64748B]">{audience.age_range}</span>}
        {audience.location  && <span className="rounded-full bg-[#F4F4F2] px-2.5 py-0.5 text-xs text-[#64748B]">{audience.location}</span>}
        {audience.platforms?.map(p => <span key={p} className="rounded-full bg-voce-indigo/10 px-2.5 py-0.5 text-xs font-medium text-voce-indigo">{p}</span>)}
      </div>
      {audience.interests?.length > 0 && <p className="mt-1.5 text-xs text-[#94A3B8]">{audience.interests.slice(0, 4).join(", ")}{audience.interests.length > 4 ? "…" : ""}</p>}
    </div>
  );
}

// ── Audience section ───────────────────────────────────────────────────────────

function AudienceSection() {
  const [audiences,  setAudiences]  = useState<Audience[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [formOpen,   setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Audience | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function fetchAudiences() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("audiences").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setAudiences((data as Audience[]) ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAudiences(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(form: AudienceForm) {
    setSaving(true); setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (editTarget) {
        const { error } = await supabase.from("audiences").update(form).eq("id", editTarget.id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("audiences").insert({ ...form, user_id: user.id });
        if (error) throw error;
      }
      setFormOpen(false); setEditTarget(null);
      await fetchAudiences();
    } catch (err) { setError(errMsg(err)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this audience? This can't be undone.")) return;
    const supabase = createClient();
    await supabase.from("audiences").delete().eq("id", id);
    setAudiences(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Your audiences</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">Saved audience profiles power your content generation.</p>
        </div>
        {!formOpen && (
          <button onClick={() => { setEditTarget(null); setFormOpen(true); setError(null); }}
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-voce-indigo px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> Create new audience
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mb-5">
          <AudienceFormPanel
            initial={editTarget ?? EMPTY_AUDIENCE}
            onSave={handleSave}
            onCancel={() => { setFormOpen(false); setEditTarget(null); }}
            saving={saving}
          />
          {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {loading ? (
        <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-voce-indigo" /></div>
      ) : audiences.length === 0 && !formOpen ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-voce-indigo/10">
            <Users className="h-5 w-5 text-voce-indigo" />
          </div>
          <p className="mt-3 text-sm font-medium text-[#0F172A]">No audiences yet</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Create your first audience to start generating targeted content.</p>
          <button onClick={() => { setFormOpen(true); setError(null); }}
            className="mt-4 flex min-h-[40px] items-center gap-2 rounded-xl bg-voce-indigo px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> Create audience
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {audiences.map(a => (
            <AudienceCard key={a.id} audience={a}
              onEdit={() => { setEditTarget(a); setFormOpen(true); setError(null); }}
              onDelete={() => handleDelete(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MyPersonaPage() {
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("persona_profile").select("*").eq("user_id", user.id).single();
      setPersona(data ?? null);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-voce-indigo" /></div>;
  }

  return (
    <div>
      <div className="mb-8 pr-8 md:pr-0">
        <h1 className="text-2xl font-semibold text-[#0F172A]">My Persona</h1>
        <p className="mt-1 text-sm text-[#64748B]">Voce learns your voice over time — from your recordings, your style, and your story.</p>
      </div>
      <div className="space-y-6">
        <PersonaForm persona={persona} onSaved={fetchData} />
        <AudienceSection />
      </div>
    </div>
  );
}
