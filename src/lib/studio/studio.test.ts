import { describe, expect, it } from "vitest";
import { verifyCandidate } from "./verifier";
import { qualifies } from "./targets";
import { auditDecodability, classifyWord } from "./decodability";
import { deriveReaders } from "./readers";
import { checkReading, summarize } from "@/lib/accent/checker";
import { PROFILES } from "@/lib/accent/rules";
import { PASSAGES } from "@/lib/accent/passages";

const aae = PROFILES.find((p) => p.id === "aae")!;
const GOOD_TEXT = "Ben sent ten pens to his friend Jen. She went to the desk and kept them in a box. Then Ben left a lamp at the camp. It is the best gift.";
const GOOD = {
  text: GOOD_TEXT,
  targets: [
    { word: "desk", target: "cluster-reduction" }, { word: "kept", target: "cluster-reduction" },
    { word: "lamp", target: "cluster-reduction" }, { word: "best", target: "cluster-reduction" },
    { word: "ten", target: "pin-pen" }, { word: "pens", target: "pin-pen" }, { word: "Ben", target: "pin-pen" },
  ],
};
const params = { grade: 2 as const, theme: "school", targets: ["cluster-reduction", "pin-pen"] as ("cluster-reduction" | "pin-pen")[] };

describe("position-sensitive qualification", () => {
  it("coda cluster qualifies, onset cluster does not", () => {
    expect(qualifies("cluster-reduction", "desk")).toBe(true);
    expect(qualifies("cluster-reduction", "stop")).toBe(false);
  });
  it("r after a vowel qualifies, onset r does not", () => {
    expect(qualifies("r-lessness", "car")).toBe(true);
    expect(qualifies("r-lessness", "tree")).toBe(false);
    expect(qualifies("r-lessness", "straw")).toBe(false);
  });
  it("th-stopping only at word start", () => {
    expect(qualifies("th-stopping", "this")).toBe(true);
    expect(qualifies("th-stopping", "with")).toBe(false);
  });
});

describe("verifier", () => {
  it("accepts a passage whose claims all check out", () => {
    const v = verifyCandidate(GOOD, params);
    expect(v.diagnostics).toEqual([]);
    expect(v.pass).toBe(true);
  });
  it("rejects malformed JSON shape before any linguistic check", () => {
    const v = verifyCandidate({ text: GOOD_TEXT, targets: [], note: "here is your story!" }, params);
    expect(v.schemaOk).toBe(false);
    expect(v.pass).toBe(false);
  });
  it("refuses a claimed token missing from the text", () => {
    const v = verifyCandidate({ ...GOOD, targets: [...GOOD.targets, { word: "nest", target: "cluster-reduction" }] }, params);
    expect(v.pass).toBe(false);
    expect(v.diagnostics.some((d) => d.includes('"nest" does not appear'))).toBe(true);
  });
  it("refuses a token tagged for a rule that does not apply", () => {
    const v = verifyCandidate({ ...GOOD, targets: [...GOOD.targets, { word: "to", target: "pin-pen" }] }, params);
    expect(v.pass).toBe(false);
  });
  it("fails density below 3 verified tokens", () => {
    const v = verifyCandidate({ ...GOOD, targets: GOOD.targets.filter((t) => t.target !== "pin-pen").concat([{ word: "ten", target: "pin-pen" }]) }, params);
    expect(v.density.find((d) => d.target === "pin-pen")?.verified).toBeLessThan(3);
    expect(v.pass).toBe(false);
  });
  it("fails decodability when the passage is full of out-of-pattern words", () => {
    const hard = "Ben sent ten pens to Jen. Unfortunately, extraordinary circumstances necessitated philosophical deliberation regarding administrative bureaucracy, desk, lamp, best, kept.";
    const v = verifyCandidate({ ...GOOD, text: hard }, params);
    expect(v.decodability?.pass).toBe(false);
    expect(v.pass).toBe(false);
  });
});

describe("decodability classifier", () => {
  it("grade 1 accepts closed syllables and sight words, not silent e", () => {
    expect(classifyWord("lamp", 1)).toBe("pattern");
    expect(classifyWord("the", 1)).toBe("sight");
    expect(classifyWord("cake", 1)).toBe("out");
    expect(classifyWord("cake", 2)).toBe("pattern");
  });
  it("the 5 hand-written passages audit at 85%+ at grade 3", () => {
    for (const p of PASSAGES) expect(auditDecodability(p.text, 3).pass, p.id).toBe(true);
  });
});

describe("rule-derived readers", () => {
  it("dialect = 0 AAE errors, struggling >= 3, mixed exactly 1", () => {
    for (const t of [GOOD_TEXT, ...PASSAGES.map((p) => p.text)]) {
      const r = deriveReaders(t);
      expect(r.problems, t).toEqual([]);
      expect(summarize(checkReading(t, r.dialect, aae)).errors).toBe(0);
      expect(summarize(checkReading(t, r.mixed, aae)).errors).toBe(1);
    }
  });
});
