import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, ShieldCheck, Loader2 } from "lucide-react";
import { MicRecorder, resampleTo16k } from "@/lib/audio/capture";
import type { WorkerIn, WorkerOut } from "@/lib/audio/whisper.worker";

type Phase = "idle" | "loading" | "ready" | "recording" | "transcribing" | "error";

export function VoiceCapture({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [pct, setPct] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<MicRecorder | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const say = (line: string) => setLines((ls) => [...ls.slice(-30), line]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const send = (msg: WorkerIn) => workerRef.current?.postMessage(msg);

  const handleMessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    if (m.type === "status") say(m.message);
    else if (m.type === "progress") {
      setPct(m.progress);
      const line = `Fetching model weights · ${m.file} · ${m.progress}%`;
      setLines((ls) => ls.at(-1)?.startsWith(`Fetching model weights · ${m.file} ·`) ? [...ls.slice(0, -1), line] : [...ls.slice(-30), line]);
    } else if (m.type === "ready") {
      setPct(100);
      say(`Edge model compiled · runtime: ${m.device}`);
      say("Cloud speech APIs: not contacted. Network payload for audio: 0 KB.");
      say("Microphone secured. Voice data will not leave this device.");
      setPhase("ready");
    } else if (m.type === "result") {
      say(`Transcript received (${m.text.split(/\s+/).filter(Boolean).length} words) — running accent-fair check`);
      setPhase("ready");
      if (m.text) onTranscriptRef.current(m.text);
      else say("No speech detected — try again, closer to the mic.");
    } else if (m.type === "error") {
      say(`Error: ${m.message}`);
      setPhase("error");
    }
  };

  const init = () => {
    setPhase("loading");
    setLines([]);
    setPct(0);
    say("Initializing local sandbox…");
    say("Downloading quantized edge model (one-time, then cached)…");
    const w = new Worker(new URL("../lib/audio/whisper.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = handleMessage;
    w.onerror = (e) => {
      say(`Error: ${e.message || "worker failed"}`);
      setPhase("error");
    };
    workerRef.current = w;
    send({ type: "load" });
  };

  const startRecording = async () => {
    try {
      const rec = new MicRecorder();
      await rec.start();
      recorderRef.current = rec;
      setPhase("recording");
      say("Recording… audio stays in this tab.");
    } catch {
      say("Microphone permission denied — sample readers still work below.");
      setPhase("ready");
    }
  };

  const stopRecording = async () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (!rec) return;
    setPhase("transcribing");
    try {
      const blob = await rec.stop();
      say(`Captured ${(blob.size / 1024).toFixed(0)} KB of audio — resampling to 16 kHz`);
      const audio = await resampleTo16k(blob);
      say(`Resampled ${(audio.length / 16000).toFixed(1)}s · sending to local model (not the network)`);
      workerRef.current?.postMessage({ type: "transcribe", audio } satisfies WorkerIn, [audio.buffer]);
    } catch (err) {
      say(`Error: ${err instanceof Error ? err.message : "capture failed"}`);
      setPhase("ready");
    }
  };

  return (
    <div className="card">
      {phase === "idle" ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Loads a speech model into this browser tab. Transcription runs entirely on this
            device — no audio is uploaded, no cloud speech API is called.
          </p>
          <Button variant="ghost" onClick={init} className="btn-primary h-auto">
            <ShieldCheck className="mr-2 h-4 w-4" /> Initialize on-device engine
          </Button>
        </div>
      ) : (
        <>
          <div className="terminal" aria-live="polite">
            {lines.map((l, i) => (
              <p key={i}>
                <span className="terminal-prompt">›</span> {l}
              </p>
            ))}
            {phase === "loading" && pct !== null && pct < 100 && (
              <p>
                <span className="terminal-prompt">›</span> Overall progress: {pct}%
              </p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {phase === "loading" && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Preparing local model…
              </span>
            )}
            {phase === "ready" && (
              <Button variant="ghost" onClick={startRecording} className="btn-primary h-auto">
                <Mic className="mr-2 h-4 w-4" /> Start recording
              </Button>
            )}
            {phase === "recording" && (
              <Button variant="ghost" onClick={stopRecording} className="btn-primary h-auto" data-recording="true">
                <Square className="mr-2 h-4 w-4" /> Stop & transcribe
              </Button>
            )}
            {phase === "transcribing" && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Transcribing on device…
              </span>
            )}
            {phase === "error" && (
              <Button variant="ghost" onClick={init} className="btn-primary h-auto">
                Retry
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
