"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Loader2, CheckCircle2, X, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduledDraft {
  id: string;
  title: string | null;
  body: string;
  platform: string | null;
  status: string;
  created_at: string;
  scheduled_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function groupByDate(drafts: ScheduledDraft[]): Map<string, ScheduledDraft[]> {
  const map = new Map<string, ScheduledDraft[]>();
  for (const d of drafts) {
    const key = d.scheduled_at
      ? new Date(d.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : "Unknown date";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return map;
}

const inputCls =
  "w-full rounded-lg border border-[#E2E2E0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20";

// ── Schedule form (inline) ─────────────────────────────────────────────────────

function ScheduleForm({ draftId, onDone }: { draftId: string; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date,    setDate]    = useState(today);
  const [time,    setTime]    = useState("09:00");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleConfirm() {
    if (!date || !time) { setError("Please pick a date and time."); return; }
    setSaving(true); setError(null);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const supabase = createClient();
      const { error: dbErr } = await supabase.from("content_drafts")
        .update({ status: "scheduled", scheduled_at: scheduledAt })
        .eq("id", draftId);
      if (dbErr) throw dbErr;
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-voce-indigo/20 bg-voce-indigo/5 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#0F172A]">Date</label>
          <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#0F172A]">Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button onClick={handleConfirm} disabled={saving}
        className="flex min-h-[40px] items-center gap-2 rounded-xl bg-voce-indigo px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {saving ? "Scheduling…" : "Confirm schedule"}
      </button>
    </div>
  );
}

// ── Approved post card (ready to schedule) ─────────────────────────────────────

function ApprovedCard({ draft, onScheduled }: { draft: ScheduledDraft; onScheduled: () => void }) {
  const [open, setOpen] = useState(false);
  const preview = draft.body.split("\n").find(l => l.trim()) ?? draft.body.slice(0, 120);

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {draft.title && <p className="mb-1 text-xs text-[#94A3B8]">{draft.title}</p>}
          <p className="line-clamp-2 text-sm text-[#0F172A]">{preview}</p>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-voce-indigo px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          <Calendar className="h-3.5 w-3.5" />
          Schedule
          <ChevronDown className="h-3 w-3 transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "none" }} />
        </button>
      </div>
      {open && <ScheduleForm draftId={draft.id} onDone={() => { setOpen(false); onScheduled(); }} />}
    </div>
  );
}

// ── Scheduled post card ────────────────────────────────────────────────────────

function ScheduledCard({ draft, onUnscheduled }: { draft: ScheduledDraft; onUnscheduled: () => void }) {
  const [undoing, setUndoing] = useState(false);
  const preview = draft.body.split("\n").find(l => l.trim()) ?? draft.body.slice(0, 120);

  async function handleUnschedule() {
    setUndoing(true);
    try {
      const supabase = createClient();
      await supabase.from("content_drafts")
        .update({ status: "approved", scheduled_at: null })
        .eq("id", draft.id);
      onUnscheduled();
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E2E0] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">
              {draft.scheduled_at ? fmtDateTime(draft.scheduled_at) : "—"}
            </span>
            {draft.title && <span className="text-xs text-[#94A3B8]">· {draft.title}</span>}
          </div>
          <p className="line-clamp-2 text-sm text-[#0F172A]">{preview}</p>
        </div>
        <button
          onClick={handleUnschedule}
          disabled={undoing}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#E2E2E0] px-2.5 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-red-50 hover:border-red-200 hover:text-red-500 disabled:opacity-60"
        >
          {undoing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Unschedule
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [approved,   setApproved]   = useState<ScheduledDraft[]>([]);
  const [scheduled,  setScheduled]  = useState<ScheduledDraft[]>([]);
  const [loading,    setLoading]    = useState(true);

  async function fetchDrafts() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [appRes, schRes] = await Promise.all([
        supabase.from("content_drafts").select("*")
          .eq("user_id", user.id).eq("status", "approved")
          .order("created_at", { ascending: false }),
        supabase.from("content_drafts").select("*")
          .eq("user_id", user.id).eq("status", "scheduled")
          .order("scheduled_at", { ascending: true }),
      ]);

      setApproved((appRes.data as ScheduledDraft[]) ?? []);
      setScheduled((schRes.data as ScheduledDraft[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDrafts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = groupByDate(scheduled);

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
        <h1 className="text-2xl font-semibold text-[#0F172A]">Schedule</h1>
        <p className="mt-1 text-sm text-[#64748B]">Plan when your content goes out.</p>
      </div>

      <div className="space-y-10">

        {/* ── Section 1: Ready to schedule ── */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-[#0F172A]">Ready to schedule</h2>
          {approved.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] py-12 text-center">
              <Calendar className="mb-3 h-8 w-8 text-[#E2E2E0]" />
              <p className="text-sm font-medium text-[#0F172A]">No approved content yet</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Approve content in the Content tab to schedule it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approved.map(d => (
                <ApprovedCard key={d.id} draft={d} onScheduled={fetchDrafts} />
              ))}
            </div>
          )}
        </div>

        {/* ── Section 2: Scheduled posts ── */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-[#0F172A]">Scheduled posts</h2>
          {scheduled.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E2E0] py-12 text-center">
              <Clock className="mb-3 h-8 w-8 text-[#E2E2E0]" />
              <p className="text-sm font-medium text-[#0F172A]">Nothing scheduled yet</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Schedule approved posts above to see them here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([dateLabel, posts]) => (
                <div key={dateLabel}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#94A3B8]">{dateLabel}</p>
                  <div className="space-y-2">
                    {posts.map((d: ScheduledDraft) => (
                      <ScheduledCard key={d.id} draft={d} onUnscheduled={fetchDrafts} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 3: Coming soon ── */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-[#0F172A]">Coming soon</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-[#E2E2E0] bg-[#FAFAF8] p-5">
              <p className="text-sm font-medium text-[#64748B]">🔜 Auto-publish to Instagram</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Applying for Meta API access unlocks direct publishing.</p>
            </div>
            <div className="rounded-xl border border-dashed border-[#E2E2E0] bg-[#FAFAF8] p-5">
              <p className="text-sm font-medium text-[#64748B]">🔜 Buffer integration</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Push content to Buffer and let it handle publishing automatically.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
