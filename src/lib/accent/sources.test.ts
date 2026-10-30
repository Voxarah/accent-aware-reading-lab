import { describe, it, expect } from "vitest";
import { PROFILES } from "./rules";

describe("rule sources", () => {
  it("every rule links to at least one published source per citation", () => {
    for (const p of PROFILES) for (const r of p.rules) {
      expect(r.source.links.length).toBe(r.source.citation.split(" · ").length);
      for (const l of r.source.links) expect(l.url).toMatch(/^https:\/\/(doi\.org|search\.worldcat\.org)\//);
    }
  });
});
