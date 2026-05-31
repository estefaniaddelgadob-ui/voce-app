"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 48;
const PURPLE = "127, 119, 221";

interface Props {
  stream: MediaStream | null;
  isRecording: boolean;
}

export function WaveformVisualizer({ stream, isRecording }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;
    let frame = 0;

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    }

    function drawBars(heights: number[], alpha: (i: number, val: number) => number) {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      resize();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / BAR_COUNT;
      const cx = canvas.height / 2;

      for (let i = 0; i < BAR_COUNT; i++) {
        const h = Math.max(2, heights[i] * canvas.height);
        ctx.fillStyle = `rgba(${PURPLE}, ${alpha(i, heights[i])})`;
        ctx.beginPath();
        ctx.fillRect(i * barW + 1, cx - h / 2, Math.max(1, barW - 2), h);
      }
    }

    if (!isRecording || !stream) {
      // Gentle idle animation — sine-wave breathing across bars
      const animate = () => {
        const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
          return 0.08 + Math.abs(Math.sin((i / BAR_COUNT) * Math.PI * 3 + frame * 0.04)) * 0.12;
        });
        drawBars(heights, () => 0.35);
        frame++;
        rafRef.current = requestAnimationFrame(animate);
      };
      animate();
      return () => cancelAnimationFrame(rafRef.current);
    }

    // Live recording — Web Audio API frequency visualization
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256; // must be a power of 2; gives 128 frequency bins
    analyser.smoothingTimeConstant = 0.75;
    dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const animate = () => {
      if (!analyser || !dataArray) return;
      analyser.getByteFrequencyData(dataArray);

      // Sample evenly across frequency bins
      const step = Math.floor(dataArray.length / BAR_COUNT);
      const heights = Array.from({ length: BAR_COUNT }, (_, i) => {
        return (dataArray![i * step] ?? 0) / 255;
      });

      drawBars(heights, (_, val) => 0.4 + val * 0.6);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtx?.close();
    };
  }, [stream, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
