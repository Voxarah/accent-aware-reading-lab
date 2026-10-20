import { describe, expect, it } from "vitest";
import { checkReading, summarize } from "./checker";
import { PROFILES } from "./rules";

const aae = PROFILES.find((p) => p.id === "aae")!;
const southern = PROFILES.find((p) => p.id === "southern")!;
const ga = PROFILES.find((p) => p.id === "general-american")!;

describe("accent-aware reading check", () => {
  it("AAE: th-stopping and cluster reduction are accent, not errors", () => {
    const s = summarize(checkReading("This is the last test", "Dis is da las tes", aae));
    expect(s).toEqual({ correct: 1, accent: 4, errors: 0 });
  });

  it("General American control flags the same differences as errors", () => {
    expect(summarize(checkReading("This is the last test", "Dis is da las tes", ga)).errors).toBe(4);
  });

  it("AAE still flags a real misreading", () => {
    const r = checkReading("He went to the house", "He went to the horse", aae);
    expect(summarize(r).errors).toBe(1);
  });

  it("AAE flags an omitted word", () => {
    expect(summarize(checkReading("the big red dog", "the red dog", aae)).errors).toBe(1);
  });

  it("Southern accepts pin/pen merger and ay weakening", () => {
    expect(summarize(checkReading("ten pens at my time", "tin pins at mah tahm", southern)).errors).toBe(0);
  });

  it("Southern does not accept th-stopping (not a Southern rule)", () => {
    expect(summarize(checkReading("this", "dis", southern)).errors).toBe(1);
  });

  it("every rule cites a source", () => {
    for (const p of PROFILES) for (const r of p.rules) expect(r.source.citation.length).toBeGreaterThan(20);
  });
});
