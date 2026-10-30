import { TARGETS } from "./targets";
import { verifyCandidate, requiredDensity, WORD_RANGE, type StudioParams, type Verification } from "./verifier";
export const MAX_ATTEMPTS = 2;
// Muse Spark is a reasoning model: hard requests burn 4k+ tokens on reasoning
// before any JSON, so the cap must cover worst-case reasoning plus the payload.
export const MAX_OUTPUT_TOKENS = 8192;
// Stable prefix first; provider-side caching, if offered, is not assumed or discounted.
const SYSTEM = `You write short reading passages for a phonics test bench.
Return ONLY a JSON object: {"text": string, "targets": [{"word": string, "target": string}]}. No other keys. No commentary, titles, tips or explanations.
Target ids and what qualifies (position matters):
- cluster-reduction: word ENDING in a consonant cluster (st, sk, sp, nd, ld, ft, kt, pt, nt, lt, mp, xt) or consonant + "ed" past tense. "stop" does NOT qualify.
- th-stopping: word STARTING with th. The common words the, this, that, these, those, they, them, their, there, then do NOT count toward density. Use content words such as think, thick, thin, thorn, thumb.
- r-lessness: r after a vowel and not followed by a vowel (car, door, sister). "tree", "straw" do NOT qualify.
- pin-pen: letter e directly before n or m (pen, ten, them).
- ask-metathesis: ask, asks, asked, asking.
Tag every word claimed for a requested target, one entry per distinct word, spelled exactly as in the text (without punctuation).
Decodability by grade: grade 1 short vowels, blends, digraphs, common sight words; grade 2 adds silent e, vowel teams, r-controlled vowels; grade 3 adds simple two-syllable words. Avoid all other words.`;
export type Usage = { input: number; output: number };
export type AttemptLog = { attempt: number; diagnostics: string[]; usage: Usage };
export type StudioDone = { status: "verified" | "refused"; model: string; generatedAt: string; attempts: AttemptLog[]; usage: Usage; verification: Verification };
export type StudioResult = { status: "not-configured" } | { status: "error"; message: string; attempts: AttemptLog[] } | StudioDone;
export type Message = { role: string; content: string };
export type ModelRate = { input: number; output: number };
export type GenerationOptions = {
  model: string; key: string; base: string; jsonMode: boolean;
  request: typeof fetch;
  reserve: (messages: Message[]) => Promise<boolean>;
  // Verified pricing keyed by served model ID. When present, a response naming
  // a model with no verified rate is refused, same as any other failed check.
  pricing?: Record<string, ModelRate>;
};
export async function runGeneration(data: StudioParams, options: GenerationOptions): Promise<StudioResult> {
  const [lo, hi] = WORD_RANGE[data.grade];
  const req = TARGETS.filter((t) => data.targets.includes(t.id)).map((t) => (data.demoRefusal ? `${t.id} (as many eligible occurrences as the length allows)` : `${t.id} (at least ${requiredDensity(t.id, data)} eligible occurrences)`)).join(", ");
  const messages: Message[] = [{ role: "system", content: SYSTEM }, { role: "user", content: `Grade ${data.grade}. Theme: ${data.theme}. Length ${lo}-${hi} words. Targets: ${req}.` }];
  const attempts: AttemptLog[] = [];
  const total = { input: 0, output: 0 };
  let servedModel = "";
  let last: Verification | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (!await options.reserve(messages)) return { status: "error", message: "Generation paused: the shared daily budget is exhausted or not configured.", attempts };
    let content: string;
    let usage: Usage;
    try {
      const res = await options.request(`${options.base}/chat/completions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.key}` },
        body: JSON.stringify({ model: options.model, messages, temperature: 0.4, max_tokens: MAX_OUTPUT_TOKENS,
          ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}) }),
      });
      if (!res.ok) {
        console.error("studio.meta_api_error", res.status);
        return { status: "error", message: res.status === 400 && options.jsonMode
          ? "Meta rejected this request. Confirm JSON-mode support for this account before trying again; nothing was added."
          : `The Meta connection failed (${res.status}). Nothing was added.`, attempts };
      }
      const json = await res.json() as { model?: string; choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      const choice = json.choices?.[0];
      usage = { input: json.usage?.prompt_tokens ?? 0, output: json.usage?.completion_tokens ?? 0 };
      total.input += usage.input; total.output += usage.output;
      if (!json.model) return { status: "error", message: "Meta did not identify the served model; a provenance record cannot be issued.", attempts };
      if (servedModel && servedModel !== json.model) return { status: "error", message: "The served model changed between attempts. Nothing was added.", attempts };
      servedModel = json.model;
      const rate = options.pricing?.[servedModel];
      if (options.pricing && !rate) return { status: "error", message: `The served model "${servedModel}" has no verified pricing on file. Nothing was added.`, attempts };
      const estCost = rate ? (usage.input * rate.input + usage.output * rate.output) / 1_000_000 : null;
      console.log(JSON.stringify({ event: "studio.usage", attempt, model: servedModel, ...usage, estCostUsd: estCost }));
      if (choice?.message?.refusal || choice?.finish_reason === "content_filter") return { status: "error", message: "The model refused this request. Nothing was added.", attempts };
      content = choice?.message?.content ?? "";
    } catch {
      console.error("studio.meta_api_unreachable");
      return { status: "error", message: "The Meta Model API could not be reached.", attempts };
    }
    let raw: unknown = null;
    // No salvage of prose/fences: all output must pass the exact JSON contract.
    try { raw = JSON.parse(content); } catch { raw = null; }
    last = verifyCandidate(raw, data);
    attempts.push({ attempt, diagnostics: last.diagnostics, usage });
    if (last.pass) break;
    messages.push({ role: "assistant", content: content.slice(0, 4000) }, { role: "user", content: `Verification failed:\n- ${last.diagnostics.join("\n- ")}\nReturn a corrected JSON object only.` });
  }
  if (!last) return { status: "error", message: "No verification was performed.", attempts };
  return { status: last.pass ? "verified" : "refused", model: servedModel, generatedAt: new Date().toISOString(), attempts, usage: total, verification: last };
}
