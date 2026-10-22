// Browser-side audio capture helpers. All functions touch browser APIs only
// inside their bodies; importing this module is SSR-safe.

/** Decode an audio blob and resample to 16 kHz mono — the format Whisper expects. */
export async function resampleTo16k(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const target = Math.max(1, Math.round((buf.duration * 16000) / 1));
    const offline = new OfflineAudioContext(1, target, 16000);
    const src = offline.createBufferSource();
    src.buffer = buf;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    void ctx.close();
  }
}

/** Thin wrapper around MediaRecorder with explicit start/stop. */
export class MicRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    const rec = new MediaRecorder(this.stream);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.rec = rec;
    rec.start();
  }

  /** Stop recording and return the captured audio as a single blob. */
  stop(): Promise<Blob> {
    const rec = this.rec;
    return new Promise((resolve, reject) => {
      if (!rec) return reject(new Error("Recorder not started"));
      rec.onstop = () => {
        this.release();
        resolve(new Blob(this.chunks, { type: rec.mimeType || "audio/webm" }));
      };
      rec.onerror = () => {
        this.release();
        reject(new Error("Recording failed"));
      };
      rec.stop();
    });
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
  }
}
