"use client";

import { useState, useEffect } from "react";
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

// ── Helpers ────────────────────────────────────────────────────────────────────

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
          supabase.from("thought_notes")
            .select("id, type, duration_seconds")
            .eq("user_id", user.id)
            .neq("status", "archived"),
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

  const score  = calcPersonaScore(persona, notes);
  const status = statusLabel(score);

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
      <div className="mb-8 pr-8 md:pr-0">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Home</h1>
        <p className="mt-1 text-sm text-[#64748B]">Your personal voice dashboard.</p>
      </div>

      <div className="space-y-4">

        {/* ── Section 1: Persona Strength ── */}
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

        {/* ── Section 2: Content Stats ── */}
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

        {/* ── Section 3: What Voce knows ── */}
        <Link href="/library"
          className="block rounded-xl border border-[#E2E2E0] bg-white p-5 transition hover:border-voce-indigo/40 hover:shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0F172A]">What Voce knows about you</h2>
            <span className="text-sm font-medium text-voce-indigo">View all →</span>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">
              Nothing yet — go to Record to add your first input.
            </p>
          ) : (
            <div className="flex flex-wrap gap-5 text-sm text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <Mic       className="h-4 w-4 text-voce-indigo" />
                {voiceCount} voice notes
              </span>
              <span className="flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4 text-voce-teal" />
                {photoCount} photos
              </span>
              <span className="flex items-center gap-1.5">
                <AlignLeft className="h-4 w-4 text-[#94A3B8]" />
                {importCount} imports
              </span>
            </div>
          )}
        </Link>

      </div>
    </div>
  );
}
