"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Check, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

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

const EMPTY: AudienceForm = {
  name: "", age_range: "", location: "", interests: [],
  pain_points: "", dreams: "", platforms: [], tone: [], description: "",
};

const PLATFORMS = ["Instagram", "TikTok", "LinkedIn", "Pinterest", "YouTube"] as const;
const TONES     = ["Warm", "Direct", "Inspirational", "Educational", "Funny"] as const;
const AGE_RANGES = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+", "All ages"] as const;

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

// ── Form ───────────────────────────────────────────────────────────────────────

function AudienceFormPanel({
  initial, onSave, onCancel, saving,
}: {
  initial: Partial<Audience>;
  onSave: (form: AudienceForm) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name,          setName]          = useState(initial.name          ?? "");
  const [ageRange,      setAgeRange]      = useState(initial.age_range     ?? "");
  const [location,      setLocation]      = useState(initial.location      ?? "");
  const [interestsTxt,  setInterestsTxt]  = useState((initial.interests    ?? []).join(", "));
  const [painPoints,    setPainPoints]    = useState(initial.pain_points   ?? "");
  const [dreams,        setDreams]        = useState(initial.dreams        ?? "");
  const [platforms,     setPlatforms]     = useState<string[]>(initial.platforms ?? []);
  const [tone,          setTone]          = useState<string[]>(initial.tone      ?? []);
  const [description,   setDescription]   = useState(initial.description   ?? "");

  function toggle<T extends string>(arr: T[], setArr: (v: T[]) => void, val: T) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name, age_range: ageRange, location,
      interests: interestsTxt.split(",").map(s => s.trim()).filter(Boolean),
      pain_points: painPoints, dreams, platforms, tone, description,
    });
  }

  return (
    <form onSubmit={handleSubmit}
      className="rounded-xl border border-voce-indigo/20 bg-voce-indigo/5 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          {initial.id ? "Edit Audience" : "New Audience"}
        </h3>
        <button type="button" onClick={onCancel}
          className="rounded-full p-1 text-[#94A3B8] hover:text-[#64748B]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Audience name</label>
        <input required value={name} onChange={e => setName(e.target.value)}
          placeholder='e.g. "Working mums", "Female entrepreneurs"' className={inputCls} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Age range */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Age range</label>
          <select value={ageRange} onChange={e => setAgeRange(e.target.value)} className={inputCls}>
            <option value="">Select range…</option>
            {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. UK, Australia, Global" className={inputCls} />
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
          Interests <span className="font-normal text-[#94A3B8]">comma separated</span>
        </label>
        <input value={interestsTxt} onChange={e => setInterestsTxt(e.target.value)}
          placeholder="e.g. fitness, personal finance, parenting, travel" className={inputCls} />
      </div>

      {/* Pain points */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
          Pain points <span className="font-normal text-[#94A3B8]">what problems do they have?</span>
        </label>
        <textarea value={painPoints} onChange={e => setPainPoints(e.target.value)} rows={2}
          placeholder="e.g. No time for themselves, overwhelmed by information, don't know where to start"
          className={inputCls} />
      </div>

      {/* Dreams */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
          Dreams <span className="font-normal text-[#94A3B8]">what do they want to achieve?</span>
        </label>
        <textarea value={dreams} onChange={e => setDreams(e.target.value)} rows={2}
          placeholder="e.g. Financial freedom, more confidence, build a business they love"
          className={inputCls} />
      </div>

      {/* Platforms */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[#0F172A]">Where they hang out online</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p} type="button" onClick={() => toggle(platforms, setPlatforms, p)}
              className={[
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                platforms.includes(p)
                  ? "border-voce-indigo bg-voce-indigo/10 text-voce-indigo"
                  : "border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/40",
              ].join(" ")}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[#0F172A]">Tone that resonates with them</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <button key={t} type="button" onClick={() => toggle(tone, setTone, t)}
              className={[
                "rounded-full px-3 py-1 text-sm font-medium transition",
                tone.includes(t)
                  ? "bg-voce-indigo text-white"
                  : "border border-[#E2E2E0] text-[#64748B] hover:border-voce-indigo/40",
              ].join(" ")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
          One sentence description
        </label>
        <input value={description} onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Women 30–45 leaving corporate to build businesses they love"
          className={inputCls} />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving || !name.trim()}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Check className="h-4 w-4" /> Save audience</>}
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

function AudienceCard({ audience, onEdit, onDelete }: {
  audience: Audience;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#0F172A]">{audience.name}</h3>
          {audience.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]">{audience.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onEdit}
            className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-[#F4F4F2] hover:text-[#0F172A]">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete}
            className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {audience.age_range && (
          <span className="rounded-full bg-[#F4F4F2] px-2.5 py-0.5 text-xs text-[#64748B]">
            {audience.age_range}
          </span>
        )}
        {audience.location && (
          <span className="rounded-full bg-[#F4F4F2] px-2.5 py-0.5 text-xs text-[#64748B]">
            {audience.location}
          </span>
        )}
        {audience.platforms?.map(p => (
          <span key={p} className="rounded-full bg-voce-indigo/10 px-2.5 py-0.5 text-xs font-medium text-voce-indigo">
            {p}
          </span>
        ))}
      </div>

      {/* Interests preview */}
      {audience.interests?.length > 0 && (
        <p className="mt-2 text-xs text-[#94A3B8]">
          {audience.interests.slice(0, 4).join(", ")}{audience.interests.length > 4 ? "…" : ""}
        </p>
      )}

      {/* Tone pills */}
      {audience.tone?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {audience.tone.map(t => (
            <span key={t}
              className="rounded-full bg-[#F4F4F2] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AudiencePage() {
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
      const { data } = await supabase
        .from("audiences").select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setAudiences((data as Audience[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAudiences(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(form: AudienceForm) {
    setSaving(true); setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editTarget) {
        const { error } = await supabase.from("audiences").update(form)
          .eq("id", editTarget.id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("audiences").insert({ ...form, user_id: user.id });
        if (error) throw error;
      }

      setFormOpen(false); setEditTarget(null);
      await fetchAudiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this audience? This can't be undone.")) return;
    const supabase = createClient();
    await supabase.from("audiences").delete().eq("id", id);
    setAudiences(prev => prev.filter(a => a.id !== id));
  }

  function openCreate() {
    setEditTarget(null); setFormOpen(true); setError(null);
  }

  function openEdit(a: Audience) {
    setEditTarget(a); setFormOpen(true); setError(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3 pr-8 md:pr-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Your Audiences</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Define who you&apos;re talking to. Saved audiences power your content generation.
          </p>
        </div>
        {!formOpen && (
          <button onClick={openCreate}
            className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-voce-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> New audience
          </button>
        )}
      </div>

      {/* Form */}
      {formOpen && (
        <div className="mb-6">
          <AudienceFormPanel
            initial={editTarget ?? EMPTY}
            onSave={handleSave}
            onCancel={() => { setFormOpen(false); setEditTarget(null); }}
            saving={saving}
          />
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-voce-indigo" />
        </div>
      ) : audiences.length === 0 && !formOpen ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-voce-indigo/10">
            <Users className="h-6 w-6 text-voce-indigo" />
          </div>
          <p className="mt-4 text-sm font-medium text-[#0F172A]">No audiences yet</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Create your first audience to start generating targeted content.
          </p>
          <button onClick={openCreate}
            className="mt-5 flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> Create audience
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map(a => (
            <AudienceCard key={a.id} audience={a}
              onEdit={() => openEdit(a)}
              onDelete={() => handleDelete(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
