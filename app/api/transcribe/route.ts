import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Ensure the file has a proper extension — Whisper requires it
    const ext = audio.type.includes("mp4") ? "mp4"
      : audio.type.includes("ogg") ? "ogg"
      : "webm";
    const audioFile = new File([audio], `recording.${ext}`, { type: audio.type });

    const sizeMB = audio.size / 1024 / 1024;
    console.log(`[transcribe] audio size: ${audio.size} bytes (${sizeMB.toFixed(2)} MB), type: ${audio.type}`);

    if (audio.size > 24 * 1024 * 1024) {
      return NextResponse.json({
        error: `Recording too large (${sizeMB.toFixed(1)} MB) — Whisper's limit is 25 MB. Try a shorter recording or lower quality.`,
      }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return NextResponse.json({ transcript: transcription.text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Transcription error:", msg);
    return NextResponse.json({ error: `Transcription failed: ${msg}` }, { status: 500 });
  }
}
