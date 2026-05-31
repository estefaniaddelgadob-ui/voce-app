"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2, Save, RotateCcw, ImagePlus, X, CheckCircle2 } from "lucide-react";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { createClient } from "@/lib/supabase";

type Tab = "voice" | "photo";
type VoiceState = "idle" | "recording" | "processing" | "done" | "saving" | "saved";
type PhotoState = "idle" | "processing" | "done" | "saving" | "saved";

interface Analysis {
  title: string;
  keyIdeas: string[];
  themes: string[];
  tone: string;
  summary: string;
}

interface NoteResult {
  transcript: string;
  analysis: Analysis;
}

// ── Shared results card ────────────────────────────────────────────────────────

function ResultsCard({
  result,
  state,
  onSave,
  onReset,
}: {
  result: NoteResult;
  state: "done" | "saving" | "saved";
  onSave: () => void;
  onReset: () => void;
}) {
  const toneColors: Record<string, string> = {
    reflective: "#7F77DD",
    energetic: "#F59E0B",
    analytical: "#3B82F6",
    uncertain: "#94A3B8",
    confident: "#1D9E75",
    creative: "#EC4899",
    frustrated: "#EF4444",
    hopeful: "#1D9E75",
  };
  const toneColor = toneColors[result.analysis.tone] ?? "#64748B";

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-[#E2E2E0] bg-white p-6">
      {/* Title + tone */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-[#0F172A]">{result.analysis.title}</h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${toneColor}18`, color: toneColor }}
        >
          {result.analysis.tone}
        </span>
      </div>

      {/* Summary */}
      {result.analysis.summary && (
        <p className="text-sm text-[#64748B]">{result.analysis.summary}</p>
      )}

      {/* Transcript */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
          Transcript
        </p>
        <p className="rounded-lg bg-[#F4F4F2] px-4 py-3 text-sm text-[#0F172A] leading-relaxed">
          {result.transcript}
        </p>
      </div>

      {/* Key ideas */}
      {result.analysis.keyIdeas?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Key Ideas
          </p>
          <ul className="space-y-1.5">
            {result.analysis.keyIdeas.map((idea, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#0F172A]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7F77DD]" />
                {idea}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Themes */}
      {result.analysis.themes?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Themes
          </p>
          <div className="flex flex-wrap gap-2">
            {result.analysis.themes.map((theme, i) => (
              <span
                key={i}
                className="rounded-full bg-[#7F77DD]/10 px-3 py-1 text-xs font-medium text-[#7F77DD]"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {state === "saved" ? (
          <div className="flex items-center gap-2 text-sm font-medium text-[#1D9E75]">
            <CheckCircle2 className="h-4 w-4" />
            Saved to Library
          </div>
        ) : (
          <button
            onClick={onSave}
            disabled={state === "saving"}
            className="flex items-center gap-2 rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6E66CC] disabled:opacity-60"
          >
            {state === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {state === "saving" ? "Saving…" : "Save to Library"}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg border border-[#E2E2E0] px-4 py-2 text-sm font-medium text-[#64748B] transition hover:bg-[#F4F4F2]"
        >
          <RotateCcw className="h-4 w-4" />
          New note
        </button>
      </div>
    </div>
  );
}

// ── Voice tab ──────────────────────────────────────────────────────────────────

function VoiceTab() {
  const [state, setState] = useState<VoiceState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<NoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(ms);
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const mr = new MediaRecorder(ms, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      mediaRecorderRef.current = mr;

      setElapsed(0);
      setState("recording");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const mr = mediaRecorderRef.current;
    if (!mr) return;

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });

    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setState("processing");

    const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });

    try {
      // 1. Transcribe
      setStatusMsg("Transcribing audio…");
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const { transcript, error: tErr } = await tRes.json();
      if (tErr) throw new Error(tErr);

      // 2. Analyze
      setStatusMsg("Extracting ideas with Claude…");
      const aRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const analysis = await aRes.json();
      if (analysis.error) throw new Error(analysis.error);

      setResult({ transcript, analysis });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  }, [stream]);

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function handleSave() {
    if (!result) return;
    setState("saving");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("thought_notes").insert({
        user_id: user.id,
        title: result.analysis.title,
        transcript: result.transcript,
        tags: result.analysis.themes,
        status: "processed",
      });
      if (error) throw error;
      setState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setState("done");
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setElapsed(0);
    setState("idle");
  }

  const isRecording = state === "recording";

  return (
    <div>
      {/* Waveform */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-[#E2E2E0] bg-white px-4">
        <WaveformVisualizer stream={stream} isRecording={isRecording} />
        {isRecording && (
          <div className="absolute right-4 top-4 flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium tabular-nums text-[#64748B]">
              {formatTime(elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* Control button */}
      {!result && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {state === "idle" && (
            <button
              onClick={startRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7F77DD] shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Mic className="h-7 w-7 text-white" />
            </button>
          )}
          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Square className="h-6 w-6 fill-white text-white" />
            </button>
          )}
          {state === "processing" && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4F4F2]">
                <Loader2 className="h-7 w-7 animate-spin text-[#7F77DD]" />
              </div>
              <p className="text-sm text-[#64748B]">{statusMsg}</p>
            </div>
          )}
          <p className="text-sm text-[#94A3B8]">
            {state === "idle" && "Tap to start recording"}
            {isRecording && "Tap to stop"}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (state === "done" || state === "saving" || state === "saved") && (
        <ResultsCard
          result={result}
          state={state as "done" | "saving" | "saved"}
          onSave={handleSave}
          onReset={reset}
        />
      )}
    </div>
  );
}

// ── Photo tab ──────────────────────────────────────────────────────────────────

function PhotoTab() {
  const [state, setPhotoState] = useState<PhotoState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<NoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setResult(null);
    setPhotoState("idle");
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function extractIdeas() {
    if (!file) return;
    setPhotoState("processing");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/analyze-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({ transcript: data.transcript ?? "", analysis: data });
      setPhotoState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setPhotoState("idle");
    }
  }

  async function handleSave() {
    if (!result) return;
    setPhotoState("saving");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("thought_notes").insert({
        user_id: user.id,
        title: result.analysis.title,
        transcript: result.transcript,
        tags: result.analysis.themes,
        status: "processed",
      });
      if (error) throw error;
      setPhotoState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setPhotoState("done");
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setPhotoState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {/* Drop zone */}
      {!preview ? (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-[#E2E2E0] bg-white px-8 py-16 transition hover:border-[#7F77DD] hover:bg-[#7F77DD]/5"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7F77DD]/10">
            <ImagePlus className="h-7 w-7 text-[#7F77DD]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#0F172A]">Upload a photo of your handwritten note</p>
            <p className="mt-1 text-xs text-[#94A3B8]">Drag & drop or click to browse — JPG, PNG, WebP</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-[#E2E2E0] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Handwritten note" className="max-h-72 w-full object-contain" />
          <button
            onClick={reset}
            className="absolute right-3 top-3 rounded-full bg-white/80 p-1.5 shadow transition hover:bg-white"
          >
            <X className="h-4 w-4 text-[#64748B]" />
          </button>
        </div>
      )}

      {/* Extract button */}
      {file && !result && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={extractIdeas}
            disabled={state === "processing"}
            className="flex items-center gap-2 rounded-lg bg-[#7F77DD] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#6E66CC] disabled:opacity-60"
          >
            {state === "processing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing with Claude…
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                Extract Ideas
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (state === "done" || state === "saving" || state === "saved") && (
        <ResultsCard
          result={result}
          state={state as "done" | "saving" | "saved"}
          onSave={handleSave}
          onReset={reset}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RecordPage() {
  const [tab, setTab] = useState<Tab>("voice");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Record</h1>
        <p className="mt-1 text-sm text-[#64748B]">Capture your thoughts. We&apos;ll extract the ideas.</p>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex w-full max-w-xs rounded-lg bg-[#F4F4F2] p-1">
        {(["voice", "photo"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all",
              tab === t ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]",
            ].join(" ")}
          >
            {t === "voice" ? (
              <><Mic className="h-4 w-4" /> Voice Note</>
            ) : (
              <><ImagePlus className="h-4 w-4" /> Handwritten</>
            )}
          </button>
        ))}
      </div>

      {tab === "voice" ? <VoiceTab /> : <PhotoTab />}
    </div>
  );
}
