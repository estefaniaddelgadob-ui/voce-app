"use client";

import {
  useState, useRef, useCallback, useEffect, useMemo,
} from "react";
import {
  Mic, Square, Play, Pause, Loader2, Save,
  Trash2, ImagePlus, X, CheckCircle2,
  Upload, FileAudio, AlignLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Analysis {
  title:   string;
  ideas:   string[];
  themes:  string[];
  tone:    string;
  phrases: string[];
}

interface NoteResult {
  transcript: string;
  analysis:   Analysis;
  durationSec?: number;
}

type SaveState = "idle" | "saving" | "saved";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const TONE_COLORS: Record<string, string> = {
  reflective: "#6366F1", energised:  "#F59E0B", frustrated: "#EF4444",
  confident:  "#1D9E75", uncertain:  "#94A3B8", creative:   "#EC4899",
  hopeful:    "#1D9E75", analytical: "#3B82F6",
};
function toneColor(tone: string) { return TONE_COLORS[tone.toLowerCase()] ?? "#64748B"; }

// ── Waveform bars — CSS animated, 5 bars ──────────────────────────────────────

const WAVE_ANIMS = [
  "animate-wave-1", "animate-wave-2", "animate-wave-3",
  "animate-wave-4", "animate-wave-5",
] as const;

const WAVE_HEIGHTS = ["16px", "24px", "32px", "24px", "16px"] as const;

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1.5" style={{ height: "40px" }}>
      {WAVE_ANIMS.map((anim, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full bg-voce-indigo transition-all duration-300 ${active ? anim : "opacity-30"}`}
          style={
            active
              ? ({ "--wave-h": WAVE_HEIGHTS[i] } as React.CSSProperties)
              : { height: "4px" }
          }
        />
      ))}
    </div>
  );
}

// ── Audio player ──────────────────────────────────────────────────────────────

function AudioPlayer({ blob }: { blob: Blob }) {
  const audioRef              = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total,   setTotal]   = useState(0);
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else         { a.play();  setPlaying(true);  }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !total) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - left) / width) * total;
  }

  const pct = total ? (current / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#F4F4F2] px-4 py-3">
      <button
        onClick={toggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-voce-indigo text-white transition active:scale-95"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
      </button>

      {/* Progress track */}
      <div
        className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-[#E2E2E0]"
        onClick={seek}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-voce-indigo transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="shrink-0 tabular-nums text-xs text-[#64748B]">
        {fmtTime(Math.round(current))}/{fmtTime(Math.round(total))}
      </span>

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setTotal(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

// ── Results card ──────────────────────────────────────────────────────────────

function ResultsCard({
  result, saveState, onSave, onReset,
}: {
  result: NoteResult;
  saveState: SaveState;
  onSave: () => void;
  onReset: () => void;
}) {
  const tc = toneColor(result.analysis.tone);

  return (
    <div className="mt-6 space-y-5 rounded-2xl border border-[#E2E2E0] bg-white p-5">
      {/* Title + tone */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[#0F172A]">{result.analysis.title}</h3>
        {result.analysis.tone && (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${tc}18`, color: tc }}
          >
            {result.analysis.tone}
          </span>
        )}
      </div>

      {/* Transcript */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Transcript</p>
        <p className="rounded-xl bg-[#F4F4F2] px-4 py-3 text-sm leading-relaxed text-[#0F172A]">
          {result.transcript}
        </p>
      </div>

      {/* Key ideas */}
      {result.analysis.ideas?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Key Ideas</p>
          <ul className="space-y-2">
            {result.analysis.ideas.map((idea, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#0F172A]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-voce-indigo" />
                {idea}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Themes */}
      {result.analysis.themes?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Themes</p>
          <div className="flex flex-wrap gap-2">
            {result.analysis.themes.map((t, i) => (
              <span key={i}
                className="rounded-full bg-voce-indigo/10 px-3 py-1 text-xs font-medium text-voce-indigo">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Standout phrases */}
      {result.analysis.phrases?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Standout Phrases</p>
          <div className="space-y-2">
            {result.analysis.phrases.map((p, i) => (
              <p key={i}
                className="border-l-2 border-voce-indigo/40 pl-3 text-sm italic text-[#64748B]">
                &ldquo;{p}&rdquo;
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        {saveState === "saved" ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-voce-teal">
            <CheckCircle2 className="h-5 w-5" /> Note saved to your Persona ✓
          </div>
        ) : (
          <button
            onClick={onSave}
            disabled={saveState === "saving"}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saveState === "saving"
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><Save className="h-4 w-4" /> Save to Library</>}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E2E0] px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> Delete note
        </button>
      </div>
    </div>
  );
}

// ── Shared analysis + save logic ───────────────────────────────────────────────

async function analyzeTranscript(transcript: string): Promise<Analysis> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as Analysis;
}

// Extracts a readable message from any thrown value — including Supabase
// PostgrestError, which is a plain object (not an Error instance).
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (typeof e.details === "string") return e.details;
    if (typeof e.code   === "string") return `DB error ${e.code}`;
    return JSON.stringify(e);
  }
  return String(err);
}

async function saveNote(
  result: NoteResult,
  noteType: "voice" | "photo" | "text"
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const response = await supabase.from("thought_notes").insert({
    user_id:          user.id,
    type:             noteType,
    title:            result.analysis.title,
    transcript:       result.transcript,
    themes:           result.analysis.themes ?? [],
    raw_ideas:        JSON.stringify(result.analysis),  // stringify so TEXT/JSONB both work
    duration_seconds: result.durationSec ?? null,
    status:           "processed",
  }).select();

  // Always log so errors are visible in the browser console
  console.log("[saveNote] Supabase response:", JSON.stringify(response, null, 2));

  if (response.error) throw response.error;
}

// ── VOICE TAB ─────────────────────────────────────────────────────────────────

type VoicePhase = "idle" | "recording" | "processing" | "done";

function VoiceTab() {
  const [phase,     setPhase]   = useState<VoicePhase>("idle");
  const [elapsed,   setElapsed] = useState(0);
  const [stepMsg,   setStepMsg] = useState("");
  const [audioBlob, setBlob]    = useState<Blob | null>(null);
  const [result,    setResult]  = useState<NoteResult | null>(null);
  const [saveState, setSave]    = useState<SaveState>("idle");
  const [error,     setError]   = useState<string | null>(null);

  const mrRef     = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
        : "";

      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      mrRef.current = mr;

      setElapsed(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied — please allow microphone access and try again.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = mrRef.current;
    if (!mr) return;

    const duration = elapsed;

    await new Promise<void>((res) => { mr.onstop = () => res(); mr.stop(); });
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
    setBlob(blob);
    setPhase("processing");

    try {
      setStepMsg("Transcribing with Whisper…");
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const { transcript, error: tErr } = await tRes.json();
      if (tErr) throw new Error(tErr);

      setStepMsg("Extracting ideas with Claude…");
      const analysis = await analyzeTranscript(transcript);

      setResult({ transcript, analysis, durationSec: duration });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("idle");
    }
  }, [elapsed]);

  async function handleSave() {
    if (!result) return;
    setSave("saving");
    try {
      await saveNote(result, "voice");
      setSave("saved");
    } catch (err) {
      setError(errMsg(err));
      setSave("idle");
    }
  }

  function reset() {
    setPhase("idle"); setElapsed(0); setBlob(null);
    setResult(null); setSave("idle"); setError(null);
  }

  const isRecording = phase === "recording";

  return (
    <div className="flex flex-col items-center">
      {/* ── Recording UI ── */}
      {phase !== "done" && (
        <>
          {/* Waveform bars */}
          <div className="mt-2 mb-6">
            <WaveformBars active={isRecording} />
          </div>

          {/* Timer */}
          <p className={`mb-6 tabular-nums text-5xl font-bold tracking-tight transition-colors ${
            isRecording ? "text-[#0F172A]" : "text-[#E2E2E0]"
          }`}>
            {fmtTime(elapsed)}
          </p>

          {/* The button */}
          <div className="relative mb-4">
            {/* Ripple ring — shown during recording */}
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ripple" />
            )}

            {phase === "idle" && (
              <button
                onClick={startRecording}
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-voce-indigo shadow-xl transition active:scale-95"
                aria-label="Start recording"
              >
                <Mic className="h-9 w-9 text-white" />
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-red-500 shadow-xl transition active:scale-95"
                aria-label="Stop recording"
              >
                <Square className="h-8 w-8 fill-white text-white" />
              </button>
            )}

            {phase === "processing" && (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F4F4F2]">
                <Loader2 className="h-9 w-9 animate-spin text-voce-indigo" />
              </div>
            )}
          </div>

          {/* Label below button */}
          <p className="text-sm font-medium text-[#94A3B8]">
            {phase === "idle"       && "Tap to record"}
            {isRecording            && "Tap to stop"}
            {phase === "processing" && stepMsg}
          </p>
        </>
      )}

      {/* ── Audio player (visible once we have a blob) ── */}
      {audioBlob && phase === "done" && (
        <div className="w-full mt-2 mb-2">
          <AudioPlayer blob={audioBlob} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mt-4 w-full flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto shrink-0 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {result && phase === "done" && (
        <div className="w-full">
          <ResultsCard
            result={result}
            saveState={saveState}
            onSave={handleSave}
            onReset={reset}
          />
        </div>
      )}
    </div>
  );
}

// ── PHOTO TAB ─────────────────────────────────────────────────────────────────

type PhotoPhase = "idle" | "processing" | "done";

function PhotoTab() {
  const [phase,     setPhase]   = useState<PhotoPhase>("idle");
  const [preview,   setPreview] = useState<string | null>(null);
  const [file,      setFile]    = useState<File | null>(null);
  const [result,    setResult]  = useState<NoteResult | null>(null);
  const [saveState, setSave]    = useState<SaveState>("idle");
  const [error,     setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null); setResult(null); setPhase("idle");
  }

  async function extract() {
    if (!file) return;
    setPhase("processing"); setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res  = await fetch("/api/analyze-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // map analyze-image response (keyIdeas → ideas) to unified Analysis shape
      const analysis: Analysis = {
        title:   data.title   ?? "Handwritten note",
        ideas:   data.keyIdeas ?? data.ideas ?? [],
        themes:  data.themes  ?? [],
        tone:    data.tone    ?? "",
        phrases: data.phrases ?? [],
      };
      setResult({ transcript: data.transcript ?? "", analysis });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setPhase("idle");
    }
  }

  async function handleSave() {
    if (!result) return;
    setSave("saving");
    try {
      await saveNote(result, "photo");
      setSave("saved");
    } catch (err) {
      setError(errMsg(err)); setSave("idle");
    }
  }

  function reset() {
    setFile(null); setPreview(null); setResult(null);
    setSave("idle"); setError(null); setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {!preview ? (
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[#E2E2E0] bg-white px-8 py-16 transition hover:border-voce-indigo hover:bg-voce-indigo/5"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-voce-indigo/10">
            <ImagePlus className="h-7 w-7 text-voce-indigo" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#0F172A]">Photo of handwritten notes</p>
            <p className="mt-1 text-xs text-[#94A3B8]">Tap to open camera roll · JPG, PNG, WebP</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-[#E2E2E0] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Handwritten note" className="max-h-72 w-full object-contain" />
          <button onClick={reset} className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow transition hover:bg-white">
            <X className="h-4 w-4 text-[#64748B]" />
          </button>
        </div>
      )}

      {file && !result && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={extract}
            disabled={phase === "processing"}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {phase === "processing"
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing with Claude…</>
              : <><ImagePlus className="h-4 w-4" /> Extract Ideas</>}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <X className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {result && phase === "done" && (
        <ResultsCard result={result} saveState={saveState} onSave={handleSave} onReset={reset} />
      )}
    </div>
  );
}

// ── IMPORT TAB ────────────────────────────────────────────────────────────────

type ImportPhase = "idle" | "processing" | "done";
type ImportMode  = "text" | "audio";

function ImportTab() {
  const [mode,      setMode]    = useState<ImportMode>("text");
  const [text,      setText]    = useState("");
  const [audioFile, setAudio]   = useState<File | null>(null);
  const [phase,     setPhase]   = useState<ImportPhase>("idle");
  const [stepMsg,   setStep]    = useState("");
  const [result,    setResult]  = useState<NoteResult | null>(null);
  const [saveState, setSave]    = useState<SaveState>("idle");
  const [error,     setError]   = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  async function processText() {
    if (!text.trim()) return;
    setPhase("processing"); setStep("Extracting ideas with Claude…"); setError(null);
    try {
      const analysis = await analyzeTranscript(text);
      setResult({ transcript: text, analysis });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed."); setPhase("idle");
    }
  }

  async function processAudio() {
    if (!audioFile) return;
    setPhase("processing"); setError(null);
    try {
      setStep("Transcribing with Whisper…");
      const fd = new FormData();
      const ext = audioFile.name.split(".").pop() ?? "mp3";
      fd.append("audio", audioFile, `upload.${ext}`);
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const { transcript, error: tErr } = await tRes.json();
      if (tErr) throw new Error(tErr);

      setStep("Extracting ideas with Claude…");
      const analysis = await analyzeTranscript(transcript);
      setResult({ transcript, analysis });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed."); setPhase("idle");
    }
  }

  async function handleSave() {
    if (!result) return;
    setSave("saving");
    try {
      await saveNote(result, mode === "text" ? "text" : "voice");
      setSave("saved");
    } catch (err) {
      setError(errMsg(err)); setSave("idle");
    }
  }

  function reset() {
    setText(""); setAudio(null); setPhase("idle");
    setResult(null); setSave("idle"); setError(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      {phase === "idle" && !result && (
        <div className="flex rounded-xl bg-[#F4F4F2] p-1">
          {(["text", "audio"] as ImportMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={["flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
                mode === m ? "bg-white text-[#0F172A] shadow-sm" : "text-[#94A3B8] hover:text-[#0F172A]",
              ].join(" ")}>
              {m === "text" ? <><AlignLeft className="h-4 w-4" /> Paste text</>
                            : <><FileAudio className="h-4 w-4" /> Audio file</>}
            </button>
          ))}
        </div>
      )}

      {/* Text input */}
      {mode === "text" && phase !== "done" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-[#0F172A]">
            Paste old captions, journal entries, or notes
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste any text here — old posts, journal entries, meeting notes, brain dumps…"
            className="w-full rounded-xl border border-[#E2E2E0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-voce-indigo focus:ring-2 focus:ring-voce-indigo/20 resize-none"
          />
          {text.trim() && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={processText}
                disabled={phase === "processing"}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {phase === "processing"
                  ? <><Loader2 className="h-4 w-4 animate-spin" />{stepMsg}</>
                  : <><Upload className="h-4 w-4" /> Extract Ideas</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Audio file input */}
      {mode === "audio" && phase !== "done" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-[#0F172A]">
            Upload an old voice memo
          </label>
          <div
            onClick={() => audioInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#E2E2E0] bg-white px-8 py-12 transition hover:border-voce-indigo hover:bg-voce-indigo/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-voce-indigo/10">
              <FileAudio className="h-6 w-6 text-voce-indigo" />
            </div>
            {audioFile ? (
              <div className="text-center">
                <p className="text-sm font-medium text-[#0F172A]">{audioFile.name}</p>
                <p className="text-xs text-[#94A3B8]">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-[#0F172A]">MP3, M4A, WAV, MP4</p>
                <p className="mt-1 text-xs text-[#94A3B8]">Tap to browse your files</p>
              </div>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.mp4"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudio(f); }}
            />
          </div>

          {audioFile && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={processAudio}
                disabled={phase === "processing"}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-voce-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {phase === "processing"
                  ? <><Loader2 className="h-4 w-4 animate-spin" />{stepMsg}</>
                  : <><FileAudio className="h-4 w-4" /> Transcribe &amp; Extract</>}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <X className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {result && phase === "done" && (
        <ResultsCard result={result} saveState={saveState} onSave={handleSave} onReset={reset} />
      )}
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

type Tab = "voice" | "photo" | "import";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "voice",  label: "Voice",  icon: Mic       },
  { id: "photo",  label: "Photo",  icon: ImagePlus },
  { id: "import", label: "Import", icon: Upload    },
];

export default function RecordPage() {
  const [tab, setTab] = useState<Tab>("voice");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Record</h1>
        <p className="mt-1 text-sm text-[#64748B]">Capture your thoughts — we&apos;ll extract the ideas.</p>
      </div>

      {/* Tab switcher — full width, 44px tall */}
      <div className="mb-8 flex rounded-xl bg-[#F4F4F2] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
              tab === id
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#94A3B8] hover:text-[#64748B]",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "voice"  && <VoiceTab  />}
      {tab === "photo"  && <PhotoTab  />}
      {tab === "import" && <ImportTab />}
    </div>
  );
}
