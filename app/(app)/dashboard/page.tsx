"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Mic, ImagePlus, AlignLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ThoughtNote {
  id: string;
  type: string | null;
  duration_seconds: number | null;
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

interface ScoreStats {
  total:        number;
  inputCount:   number;
  audioMinutes: number;
  profilePct:   number;
  captionCount: number;
}

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

function statusLabel(s: number): string {
  if (s <= 20) return "Just getting started";
  if (s <= 40) return "Building your voice";
  if (s <= 70) return "Getting there";
  if (s <= 90) return "Strong persona";
  return "Fully trained ✓";
}

// ── Confetti ───────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#6366F1","#F59E0B","#1D9E75","#EC4899","#3B82F6","#EF4444","#8B5CF6"];
const MILESTONES      = [40, 70, 100] as const;

function Confetti({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  const pieces = useMemo(() =>
    Array.from({ length: 48 }).map((_, i) => ({
      left: `${5 + Math.random() * 90}%`, top: `${20 + Math.random() * 45}%`,
      width: `${6 + Math.random() * 9}px`, height: `${6 + Math.random() * 9}px`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], round: Math.random() > 0.5,
      delay: `${Math.random() * 0.45}s`, duration: `${1.1 + Math.random() * 0.9}s`,
    })), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <div key={i} className="absolute animate-confetti-rise"
          style={{ left: p.left, top: p.top, width: p.width, height: p.height,
            backgroundColor: p.color, borderRadius: p.round ? "50%" : "2px",
            animationDelay: p.delay, "--duration": p.duration } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [persona,      setPersona]      = useState<PersonaProfile | null>(null);
  const [notes,        setNotes]        = useState<ThoughtNote[]>([]);
  const [contentStats, setContentStats] = useState({ generated: 0, approved: 0, scheduled: 0, published: 0 });
  const [loading,      setLoading]      = useState(true);
  const [confetti,     setConfetti]     = useState(false);

  const seenMilestonesRef = useRef(new Set<number>());
  const prevScoreRef      = useRef<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [pRes, nRes, cRes] = await Promise.all([
          supabase.from("persona_profile").select("*").eq("user_id", user.id).single(),
          supabase.from("thought_notes")
            .select("id, type, duration_seconds")
            .eq("user_id", user.id).neq("status", "archived"),
          supabase.from("content_drafts").select("status").eq("user_id", user.id),
        ]);

        setPersona(pRes.data ?? null);
        setNotes((nRes.data as ThoughtNote[]) ?? []);

        const drafts = (cRes.data ?? []) as { status: string }[];
        setContentStats({
          generated: drafts.filter(d => d.status === "generated").length,
          approved:  drafts.filter(d => d.status === "approved").length,
          scheduled: drafts.filter(d => d.status === "scheduled").length,
          published: drafts.filter(d => d.status === "published").length,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats  = calcScore(persona, notes);
  const status = statusLabel(stats.total);

  // Confetti on milestone cross
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

  const voiceCount  = notes.filter(n => n.type === "voice").length;
  const photoCount  = notes.filter(n => n.type === "photo").length;
  const importCount = notes.filter(n => n.type === "text").length;

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
        <h1 className="text-2xl font-semibold text-[#0F172A]">Home</h1>
        <p className="mt-1 text-sm text-[#64748B]">Your personal voice dashboard.</p>
      </div>

      <div className="space-y-4">

        {/* ── Section 1: Persona Strength (full score card) ── */}
        <Link href="/my-persona"
          className="block rounded-xl border border-[#E2E2E0] bg-white p-6 transition hover:border-voce-indigo/40 hover:shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#64748B]">Persona Strength</p>
              <p className="mt-0.5 text-sm text-[#94A3B8]">{status}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-voce-indigo tabular-nums">{stats.total}%</span>
              <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#F4F4F2]">
            <div className="h-full rounded-full bg-voce-indigo transition-all duration-700"
              style={{ width: `${stats.total}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: "inputs",    value: stats.inputCount                     },
              { label: "min audio", value: stats.audioMinutes                   },
              { label: "% profile", value: stats.profilePct, suffix: "%"        },
              { label: "captions",  value: stats.captionCount                   },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-[#F4F4F2] px-2 py-2 text-center">
                <p className="text-lg font-bold text-[#0F172A] tabular-nums">{s.value}{s.suffix ?? ""}</p>
                <p className="text-[10px] text-[#94A3B8]">{s.label}</p>
              </div>
            ))}
          </div>
        </Link>

        {/* ── Section 2: Content Stats ── */}
        <Link href="/content"
          className="block rounded-xl border border-[#E2E2E0] bg-white p-5 transition hover:border-voce-indigo/40 hover:shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">Content</h2>
            <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Generated", value: contentStats.generated },
              { label: "Approved",  value: contentStats.approved  },
              { label: "Scheduled", value: contentStats.scheduled },
              { label: "Published", value: contentStats.published },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-[#F4F4F2] px-2 py-3 text-center">
                <p className="text-2xl font-bold text-[#0F172A] tabular-nums">{s.value}</p>
                <p className="text-[10px] text-[#94A3B8]">{s.label}</p>
              </div>
            ))}
          </div>
        </Link>

        {/* ── Section 3: What Voce knows ── */}
        <Link href="/library"
          className="block rounded-xl border border-[#E2E2E0] bg-white p-5 transition hover:border-voce-indigo/40 hover:shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">What Echoooo knows about you</h2>
            <span className="text-sm font-medium text-voce-indigo">View all →</span>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">Nothing yet — go to Record to add your first input.</p>
          ) : (
            <div className="flex flex-wrap gap-5 text-sm text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <Mic       className="h-4 w-4 text-voce-indigo" />{voiceCount} voice notes
              </span>
              <span className="flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4 text-voce-teal"   />{photoCount} photos
              </span>
              <span className="flex items-center gap-1.5">
                <AlignLeft className="h-4 w-4 text-[#94A3B8]"   />{importCount} imports
              </span>
            </div>
          )}
        </Link>

      </div>
    </div>
  );
}
