import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TARGET_IDS, TARGETS } from "./targets";
import { verifyCandidate, WORD_RANGE, type Verification } from "./verifier";

// Only teacher parameters (and, on retry, our own audit diagnostics) are sent
// to the Meta Model API. No child data exists in this flow.
const Params = z.object({
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  theme: z.enum(["school", "animals", "home", "outdoors", "space"]),
  targets: z.array(z.enum(TARGET_IDS)).min(1).max(3),
});

export const MAX_ATTEMPTS = 2;

// Static prefix first so provider-side prompt caching can reuse it.
const SYSTEM = `You write short reading passages for a phonics test bench.
Return ONLY a JSON object: {"text": string, "targets": [{"word": string, "target": string}]}. No other keys. No commentary, titles, tips or explanations.
Target ids and what qualifies (position matters):
- cluster-reduction: word ENDING in a consonant cluster (st, sk, sp, nd, ld, ft, kt, pt, nt, lt, mp, xt) or consonant + "ed" past tense. "stop" does NOT qualify (cluster at start).
- th-stopping: word STARTING with th (this, them, think). "with" does NOT qualify.
- r-lessness: r after a vowel and not followed by a vowel (car, door, sister). "tree", "straw" do NOT qualify.
- pin-pen: letter e directly before n or m (pen, ten, them).
- ask-metathesis: ask, asks, asked, asking.
Tag every word in the text that you claim for a requested target, one entry per distinct word, spelled exactly as in the text.
Decodability by grade: grade 1 = short vowels, blends, digraphs, common sight words; grade 2 adds silent e, vowel teams, r-controlled vowels; grade 3 adds simple two-syllable words. Avoid all other words.`;

type Usage = { input: number; output: number };
export type AttemptLog = { attempt: number; diagnostics: string[]; usage: Usage };
export type StudioResult =
  | { status: "not-configured" }
  | { status: "error"; message: string; attempts: AttemptLog[] }
  | { status: "verified" | "refused"; model: string; generatedAt: string; attempts: AttemptLog[]; usage: Usage; verification: Verification };

export const generatePassage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Params.parse(d))
  .handler(async ({ data }): Promise<StudioResult> => {
    const key = process.env["META_API_KEY"];
    const model = process.env["META_MODEL"];
    const base = (process.env["META_API_BASE_URL"] ?? "https://api.llama.com/compat/v1").replace(/\/$/, "");
    if (!key || !model) return { status: "not-configured" };

    const [lo, hi] = WORD_RANGE[data.grade];
    const req = TARGETS.filter((t) => data.targets.includes(t.id)).map((t) => `${t.id} (at least ${t.minDensity} tagged words)`).join(", ");
    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Grade ${data.grade}. Theme: ${data.theme}. Length ${lo}-${hi} words. Targets: ${req}.` },
    ];
    const attempts: AttemptLog[] = [];
    const total: Usage = { input: 0, output: 0 };
    let servedModel = model;
    let last: Verification | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let content = "";
      let usage: Usage = { input: 0, output: 0 };
      try {
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 700, response_format: { type: "json_object" } }),
        });
        if (!res.ok) {
          console.error("studio.meta_api_error", res.status, (await res.text()).slice(0, 500));
          return { status: "error", message: `The Meta Model API returned ${res.status}.`, attempts };
        }
        const json = (await res.json()) as { model?: string; choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
        servedModel = json.model ?? model;
        content = json.choices?.[0]?.message?.content ?? "";
        usage = { input: json.usage?.prompt_tokens ?? 0, output: json.usage?.completion_tokens ?? 0 };
      } catch (e) {
        console.error("studio.meta_api_unreachable", e);
        return { status: "error", message: "The Meta Model API could not be reached.", attempts };
      }
      total.input += usage.input; total.output += usage.output;
      console.log(JSON.stringify({ event: "studio.usage", attempt, model: servedModel, ...usage }));

      let raw: unknown = null;
      try { raw = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1)); } catch { raw = null; }
      last = verifyCandidate(raw, data);
      attempts.push({ attempt, diagnostics: last.diagnostics, usage });
      if (last.pass) break;
      messages.push({ role: "assistant", content }, { role: "user", content: `Verification failed:\n- ${last.diagnostics.join("\n- ")}\nReturn a corrected JSON object only.` });
    }

    return { status: last?.pass ? "verified" : "refused", model: servedModel, generatedAt: new Date().toISOString(), attempts, usage: total, verification: last! };
  });
