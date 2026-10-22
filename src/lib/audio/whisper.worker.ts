// On-device speech recognition worker. The model is downloaded once from the
// Hugging Face CDN, cached by the browser, and all inference runs locally
// (WebGPU when available, WASM otherwise). Audio never leaves the device.
import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

type LoadMsg = { type: "load" };
type TranscribeMsg = { type: "transcribe"; audio: Float32Array };
export type WorkerIn = LoadMsg | TranscribeMsg;

export type WorkerOut =
  | { type: "status"; message: string }
  | { type: "progress"; file: string; progress: number }
  | { type: "ready"; device: string }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

const post = (msg: WorkerOut) => self.postMessage(msg);

const MODEL_ID = "onnx-community/whisper-tiny";

// Bias the decoder toward vernacular spellings so it does not "correct"
// dialect pronunciations into Standard American English text.
const VERNACULAR_PROMPT =
  "Aks, aksed, talkin, goin, runnin, dis, dat, wit, brover, sistah, pahk, cah, tin, pin.";

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loading: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/** WebGPU can hang instead of throwing (e.g. headless/VM GPUs) — probe with a timeout. */
async function webgpuAvailable(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) return false;
    const adapter = await Promise.race([
      (navigator as Navigator & { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter(),
      new Promise<null>((r) => setTimeout(() => r(null), 3000)),
    ]);
    return adapter != null;
  } catch {
    return false;
  }
}

async function load(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (transcriber) return transcriber;
  if (loading) return loading;
  loading = (async () => {
    const progress_callback = (p: { status?: string; file?: string; progress?: number }) => {
      if (p.status === "progress" && p.file && typeof p.progress === "number") {
        post({ type: "progress", file: p.file, progress: Math.round(p.progress) });
      }
    };
    const device = (await webgpuAvailable()) ? "webgpu" : "wasm";
    if (device === "wasm") post({ type: "status", message: "WebGPU unavailable — using WASM runtime" });
    transcriber = (await pipeline("automatic-speech-recognition", MODEL_ID, {
      device,
      dtype: "q8",
      progress_callback,
    })) as AutomaticSpeechRecognitionPipeline;
    post({ type: "ready", device: device === "webgpu" ? "WebGPU" : "WASM" });
    return transcriber;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  try {
    if (msg.type === "load") {
      post({ type: "status", message: "Initializing local sandbox…" });
      await load();
      return;
    }
    if (msg.type === "transcribe") {
      const t = await load();
      post({ type: "status", message: "Transcribing on device…" });
      const out = await t(msg.audio, {
        language: "english",
        task: "transcribe",
        initial_prompt: VERNACULAR_PROMPT,
        chunk_length_s: 30,
      });
      const text = (Array.isArray(out) ? out[0]?.text : out.text) ?? "";
      post({ type: "result", text: text.trim() });
    }
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
