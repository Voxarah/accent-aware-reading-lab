import { describe, expect, it, vi } from "vitest";
import { runGeneration } from "./generation";
import { revalidateGenerated, loadGenerated } from "./store";
import { verifyCandidate } from "./verifier";
import { densityEligible } from "./targets";
import { ENGINE_VERSION, LEXICON_VERSION } from "./versions";
import { judgeEnabled, reservationUsd } from "./policy";

const text = "Ben sent ten pens to his friend Jen. She went to the desk and kept them in a box. Then Ben left a lamp at the camp. It is the best gift.";
const candidate = { text, targets: [
  { word: "desk", target: "cluster-reduction" }, { word: "kept", target: "cluster-reduction" },
  { word: "lamp", target: "cluster-reduction" }, { word: "best", target: "cluster-reduction" },
  { word: "ten", target: "pin-pen" }, { word: "pens", target: "pin-pen" }, { word: "Ben", target: "pin-pen" },
] };
const params = { grade: 2 as const, theme: "school" as const, targets: ["cluster-reduction", "pin-pen"] as ("cluster-reduction" | "pin-pen")[] };
const reply = (output: unknown, model = "meta-served-test-model") => new Response(JSON.stringify({ model, choices: [{ message: { content: JSON.stringify(output) } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }));
const options = (request: typeof fetch, reserve = vi.fn(async () => true)) => ({ model: "requested-test-model", key: "fake-test-key", base: "https://example.invalid", jsonMode: true, request, reserve });
const saved = () => ({ id: "generated-test", params, candidate, provenance: { model: "meta-served-test-model", generatedAt: "2026-10-26T23:45:00Z", attempts: 1, tokens: { input: 100, output: 50 }, engineVersion: "old" }, readers: { dialect: "untrusted model prose" } });

describe("audit verifier rules", () => {
  it.each(["the", "this", "that"])("common initial-th word %s does not satisfy instructional density", (word) => expect(densityEligible("th-stopping", word)).toBe(false));
  it("content initial-th words remain eligible", () => expect(densityEligible("th-stopping", "think")).toBe(true));
  it("common-word repetitions cannot meet the three-token th minimum", () => {
    const v = verifyCandidate({ text: "The cat sat in the sun. The cat went to the desk. The cat left the best gift in the box at the camp.", targets: [{ word: "The", target: "th-stopping" }, { word: "the", target: "th-stopping" }] }, { ...params, targets: ["th-stopping"] });
    expect(v.density[0]?.verified).toBe(0); expect(v.pass).toBe(false);
  });
  it("requires exact claimed spelling instead of silently normalizing it", () => expect(verifyCandidate({ ...candidate, targets: candidate.targets.map((t) => t.word === "Ben" ? { ...t, word: "ben" } : t) }, params).pass).toBe(false));
  it("rejects duplicate claims", () => expect(verifyCandidate({ ...candidate, targets: [...candidate.targets, candidate.targets[0]] }, params).pass).toBe(false));
});
describe("untrusted stored passages", () => {
  it("regenerates readers and stamps current engine/lexicon versions", () => {
    const p = revalidateGenerated(saved());
    expect(p?.readers.dialect).not.toBe("untrusted model prose");
    expect(p?.provenance.engineVersion).toBe(ENGINE_VERSION); expect(p?.provenance.lexiconVersion).toBe(LEXICON_VERSION);
    expect(p?.provenance.verifiedAt).toBeDefined();
  });
  it("drops candidates no longer passing the rules", () => expect(revalidateGenerated({ ...saved(), candidate: { ...candidate, targets: [] } })).toBeNull());
  it("drops legacy records lacking original settings/tags", () => expect(revalidateGenerated({ text, provenance: saved().provenance })).toBeNull());
  it("discards corrupt and malformed browser storage", () => {
    localStorage.setItem("voxarah.studio.passages.v1", JSON.stringify([saved(), { nope: true }]));
    expect(loadGenerated()).toHaveLength(1);
    localStorage.setItem("voxarah.studio.passages.v1", "{"); expect(loadGenerated()).toEqual([]);
    localStorage.clear();
  });
});
describe("generation orchestration", () => {
  it("accepts only a verified response and records served model and tokens", async () => {
    const result = await runGeneration(params, options(vi.fn(async () => reply(candidate))));
    expect(result.status).toBe("verified");
    if (result.status === "verified") { expect(result.model).toBe("meta-served-test-model"); expect(result.usage).toEqual({ input: 100, output: 50 }); }
  });
  it("feeds diagnostics back and accepts the corrected second attempt", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ text })).mockResolvedValueOnce(reply(candidate));
    const result = await runGeneration(params, options(request));
    expect(result.status).toBe("verified"); expect(request).toHaveBeenCalledTimes(2);
    const body = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
    expect(body.messages.at(-1).content).toContain("Verification failed");
    if (result.status === "verified") { expect(result.attempts[0]?.diagnostics.length).toBeGreaterThan(0); expect(result.usage.input).toBe(200); }
  });
  it("refuses after exactly two malformed replies with both diagnostics preserved", async () => {
    const request = vi.fn(async () => reply({ invalid: true }));
    const result = await runGeneration(params, options(request));
    expect(result.status).toBe("refused"); expect(request).toHaveBeenCalledTimes(2);
    if (result.status === "refused") expect(result.attempts.every((a) => a.diagnostics.length > 0)).toBe(true);
  });
  it("does not salvage fenced/prose JSON", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ model: "m", choices: [{ message: { content: `Here is JSON: ${JSON.stringify(candidate)}` } }] })));
    expect((await runGeneration(params, options(request))).status).toBe("refused");
  });
  it("stops on rejected JSON mode without an automatic retry or bypass", async () => {
    const request = vi.fn(async () => new Response("unsupported", { status: 400 }));
    const r = await runGeneration(params, options(request)); expect(r.status).toBe("error"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("explicit plain-text mode still verifies strict JSON", async () => {
    const request = vi.fn<typeof fetch>(async () => reply(candidate));
    const r = await runGeneration(params, { ...options(request), jsonMode: false });
    expect(r.status).toBe("verified"); expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).not.toHaveProperty("response_format");
  });
  it.each([401, 403, 404, 429, 500])("connection status %s stops without hidden retries", async (status) => {
    const request = vi.fn(async () => new Response("failed", { status }));
    expect((await runGeneration(params, options(request))).status).toBe("error"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("network failure clears the flow", async () => {
    const request = vi.fn(async () => { throw new Error("network"); });
    expect((await runGeneration(params, options(request))).status).toBe("error"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("model refusal is terminal", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ model: "m", choices: [{ message: { refusal: "no" } }] })));
    expect((await runGeneration(params, options(request))).status).toBe("error"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("cannot issue provenance without response model identity", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidate) } }] })));
    expect((await runGeneration(params, options(request))).status).toBe("error");
  });
  it("refuses a served model with no verified pricing on file", async () => {
    const request = vi.fn(async () => reply(candidate, "unpriced-model"));
    const r = await runGeneration(params, { ...options(request), pricing: { "requested-test-model": { input: 1, output: 2 } } });
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.message).toContain("unpriced-model");
  });
  it("logs estimated cost per call from the served model's verified rate", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const request = vi.fn(async () => reply(candidate));
    const r = await runGeneration(params, { ...options(request), pricing: { "meta-served-test-model": { input: 1.25, output: 4.25 } } });
    expect(r.status).toBe("verified");
    const entry = JSON.parse(String(log.mock.calls.map((c) => c[0]).find((m) => String(m).includes("studio.usage"))));
    expect(entry.model).toBe("meta-served-test-model");
    expect(entry.estCostUsd).toBeCloseTo((100 * 1.25 + 50 * 4.25) / 1_000_000, 9);
    log.mockRestore();
  });
  it("requires a global reservation before every attempt", async () => {
    const request = vi.fn(async () => reply({ invalid: true }));
    const reserve = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const r = await runGeneration(params, options(request, reserve)); expect(r.status).toBe("error"); expect(request).toHaveBeenCalledTimes(1); expect(reserve).toHaveBeenCalledTimes(2);
  });
});
describe("judge and budget guards", () => {
  const origin = "https://judge.example.test";
  it("flag off prevents access", () => expect(judgeEnabled(undefined, origin, origin)).toBe(false));
  it("live app is allowed only when it is the configured origin", () => { const live = "https://accent-aware-reading-lab.lovable.app"; expect(judgeEnabled("true", live, live)).toBe(true); expect(judgeEnabled(undefined, live, live)).toBe(false); });
  it("only exact configured judge origin is permitted", () => { expect(judgeEnabled("true", origin, origin)).toBe(true); expect(judgeEnabled("true", origin, "https://other.test")).toBe(false); });
  it("missing pricing fails closed", () => expect(reservationUsd([], 0, 1, 700)).toBe(0));
  it("reserves bounded input plus all 700 output tokens without cache discounts", () => expect(reservationUsd([{ content: "abc" }], 1, 2, 700)).toBe(0.001915));
});
