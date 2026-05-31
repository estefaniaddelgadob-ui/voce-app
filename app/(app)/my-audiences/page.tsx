"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase";

const PLATFORMS = ["instagram", "linkedin", "tiktok", "youtube", "twitter", "newsletter"] as const;
const GOALS = ["inspire", "educate", "entertain", "sell"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-50 text-pink-600",
  linkedin: "bg-blue-50 text-blue-600",
  tiktok: "bg-slate-50 text-slate-700",
  youtube: "bg-red-50 text-red-600",
  twitter: "bg-sky-50 text-sky-600",
  newsletter: "bg-amber-50 text-amber-600",
};
const GOAL_COLORS: Record<string, string> = {
  inspire: "bg-purple-50 text-purple-600",
  educate: "bg-teal-50 text-teal-600",
  entertain: "bg-orange-50 text-orange-600",
  sell: "bg-green-50 text-green-600",
};

interface Audience {
  id: string;
  user_id?: string;
  name: string;
  niche: string;
  who_they_are: string;
  biggest_struggles: string;
  goals: string;
  content_pillars: string[];
  primary_platform: string;
  content_goal: string;
  created_at?: string;
}

type AudienceForm = Omit<Audience, "id" | "user_id" | "created_at">;

const EMPTY_FORM: AudienceForm = {
  name: "",
  niche: "",
  who_they_are: "",
  biggest_struggles: "",
  goals: "",
  content_pillars: [],
  primary_platform: "instagram",
  content_goal: "inspire",
};

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#7F77DD] focus:ring-2 focus:ring-[#7F77DD]/20";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">{label}</label>
      {hint && <p className="mb-1.5 text-xs text-[#94A3B8]">{hint}</p>}
      {children}
    </div>
  );
}

function AudienceFormPanel({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: AudienceForm;
  onSave: (form: AudienceForm) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AudienceForm>(initial);
  const [pillarsInput, setPillarsInput] = useState(initial.content_pillars.join(", "));

  function set<K extends keyof AudienceForm>(key: K, value: AudienceForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      content_pillars: pillarsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#7F77DD]/20 bg-[#7F77DD]/5 p-6"
    >
      <h3 className="mb-5 text-sm font-semibold text-[#0F172A]">
        {initial.name ? "Edit Audience" : "New Audience"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Audience Name">
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder='e.g. "Beginner entrepreneurs"'
            className={inputCls}
          />
        </Field>
        <Field label="Niche">
          <input
            value={form.niche}
            onChange={(e) => set("niche", e.target.value)}
            placeholder='e.g. "female entrepreneurship"'
            className={inputCls}
          />
        </Field>
        <Field label="Who they are" hint="Age range, situation, interests">
          <textarea
            value={form.who_they_are}
            onChange={(e) => set("who_they_are", e.target.value)}
            rows={2}
            placeholder="e.g. Women 30–45 leaving corporate to start their own business"
            className={inputCls}
          />
        </Field>
        <Field label="Biggest struggles" hint="What keeps them up at night">
          <textarea
            value={form.biggest_struggles}
            onChange={(e) => set("biggest_struggles", e.target.value)}
            rows={2}
            placeholder="e.g. Fear of failure, not knowing where to start, imposter syndrome"
            className={inputCls}
          />
        </Field>
        <Field label="Their goals" hint="What they want to achieve">
          <textarea
            value={form.goals}
            onChange={(e) => set("goals", e.target.value)}
            rows={2}
            placeholder="e.g. Financial freedom, flexible schedule, work they love"
            className={inputCls}
          />
        </Field>
        <Field label="Content Pillars" hint="3–5 themes, comma-separated">
          <input
            value={pillarsInput}
            onChange={(e) => setPillarsInput(e.target.value)}
            placeholder="e.g. mindset, marketing, money, systems"
            className={inputCls}
          />
        </Field>
        <Field label="Primary Platform">
          <select
            value={form.primary_platform}
            onChange={(e) => set("primary_platform", e.target.value)}
            className={inputCls}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Content Goal">
          <select
            value={form.content_goal}
            onChange={(e) => set("content_goal", e.target.value)}
            className={inputCls}
          >
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white hover:bg-[#6E66CC] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Audience
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#E2E2E0] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F4F4F2]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AudienceCard({
  audience,
  onEdit,
  onDelete,
}: {
  audience: Audience;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#0F172A]">{audience.name}</h3>
          {audience.niche && (
            <p className="mt-0.5 text-xs text-[#94A3B8]">{audience.niche}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-[#F4F4F2] hover:text-[#0F172A]"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {audience.primary_platform && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLATFORM_COLORS[audience.primary_platform] ?? "bg-[#F4F4F2] text-[#64748B]"}`}>
            {audience.primary_platform}
          </span>
        )}
        {audience.content_goal && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${GOAL_COLORS[audience.content_goal] ?? "bg-[#F4F4F2] text-[#64748B]"}`}>
            {audience.content_goal}
          </span>
        )}
      </div>

      {audience.content_pillars?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {audience.content_pillars.map((p) => (
            <span key={p} className="rounded-full bg-[#F4F4F2] px-2.5 py-0.5 text-xs text-[#64748B]">
              {p}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#64748B]"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? "Less" : "More details"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[#E2E2E0] pt-3 text-sm">
          {audience.who_they_are && (
            <p><span className="font-medium text-[#0F172A]">Who they are: </span><span className="text-[#64748B]">{audience.who_they_are}</span></p>
          )}
          {audience.biggest_struggles && (
            <p><span className="font-medium text-[#0F172A]">Struggles: </span><span className="text-[#64748B]">{audience.biggest_struggles}</span></p>
          )}
          {audience.goals && (
            <p><span className="font-medium text-[#0F172A]">Goals: </span><span className="text-[#64748B]">{audience.goals}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyAudiencesPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<{
    open: boolean;
    editId: string | null;
    initial: AudienceForm;
  }>({ open: false, editId: null, initial: EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAudiences() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("audiences")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAudiences((data as Audience[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAudiences(); }, []);

  function openCreate() {
    setFormState({ open: true, editId: null, initial: EMPTY_FORM });
    setError(null);
  }

  function openEdit(a: Audience) {
    setFormState({
      open: true,
      editId: a.id,
      initial: {
        name: a.name,
        niche: a.niche,
        who_they_are: a.who_they_are,
        biggest_struggles: a.biggest_struggles,
        goals: a.goals,
        content_pillars: a.content_pillars ?? [],
        primary_platform: a.primary_platform,
        content_goal: a.content_goal,
      },
    });
    setError(null);
  }

  async function handleSave(form: AudienceForm) {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (formState.editId) {
        const { error } = await supabase
          .from("audiences")
          .update(form)
          .eq("id", formState.editId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("audiences")
          .insert({ ...form, user_id: user.id });
        if (error) throw error;
      }
      setFormState({ open: false, editId: null, initial: EMPTY_FORM });
      await fetchAudiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this audience?")) return;
    const supabase = createClient();
    await supabase.from("audiences").delete().eq("id", id);
    setAudiences((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Your Audiences</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Define who you&apos;re creating for. Each audience shapes how your content is written.
          </p>
        </div>
        {!formState.open && (
          <button
            onClick={openCreate}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6E66CC]"
          >
            <Plus className="h-4 w-4" /> Add Audience
          </button>
        )}
      </div>

      {formState.open && (
        <div className="mb-6">
          <AudienceFormPanel
            initial={formState.initial}
            onSave={handleSave}
            onCancel={() => setFormState({ open: false, editId: null, initial: EMPTY_FORM })}
            saving={saving}
          />
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#7F77DD]" />
        </div>
      ) : audiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7F77DD]/10">
            <Users className="h-6 w-6 text-[#7F77DD]" />
          </div>
          <p className="mt-4 text-sm font-medium text-[#0F172A]">No audiences yet</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Add your first audience to start generating targeted content.</p>
          <button
            onClick={openCreate}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white hover:bg-[#6E66CC]"
          >
            <Plus className="h-4 w-4" /> Add Audience
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <AudienceCard
              key={a.id}
              audience={a}
              onEdit={() => openEdit(a)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
