import type { AccentProfile, AccentRule } from "./rules";

export type WordResult =
  | { kind: "correct"; expected: string; heard: string }
  | { kind: "accent"; expected: string; heard: string; rule: AccentRule }
  | { kind: "substituted"; expected: string; heard: string }
  | { kind: "omitted"; expected: string }
  | { kind: "inserted"; heard: string };

export const normalize = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "").replace(/'/g, "");

const tokenize = (t: string) => t.split(/\s+/).map(normalize).filter(Boolean);

function findRule(profile: AccentProfile, e: string, h: string) {
  return profile.rules.find((r) => r.explains(e, h));
}

/** Word-level alignment; accent-explained substitutions cost 0 so they align cleanly. */
export function checkReading(passage: string, transcript: string, profile: AccentProfile): WordResult[] {
  const E = tokenize(passage);
  const H = tokenize(transcript);
  const n = E.length, m = H.length;
  const ew = (i: number) => E[i] ?? "";
  const hw = (j: number) => H[j] ?? "";
  const cost = (i: number, j: number) => (ew(i) === hw(j) || findRule(profile, ew(i), hw(j)) ? 0 : 1);
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  const g = (i: number, j: number) => d[i]?.[j] ?? Infinity;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i]![j] = Math.min(g(i - 1, j) + 1, g(i, j - 1) + 1, g(i - 1, j - 1) + cost(i - 1, j - 1));

  const out: WordResult[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && g(i, j) === g(i - 1, j - 1) + cost(i - 1, j - 1)) {
      const e = ew(i - 1), h = hw(j - 1);
      if (e === h) out.push({ kind: "correct", expected: e, heard: h });
      else {
        const rule = findRule(profile, e, h);
        out.push(rule ? { kind: "accent", expected: e, heard: h, rule } : { kind: "substituted", expected: e, heard: h });
      }
      i--; j--;
    } else if (i > 0 && g(i, j) === g(i - 1, j) + 1) {
      out.push({ kind: "omitted", expected: ew(i - 1) }); i--;
    } else {
      out.push({ kind: "inserted", heard: hw(j - 1) }); j--;
    }
  }
  return out.reverse();
}

export function summarize(r: WordResult[]) {
  const errors = r.filter((x) => x.kind === "substituted" || x.kind === "omitted" || x.kind === "inserted").length;
  return {
    correct: r.filter((x) => x.kind === "correct").length,
    accent: r.filter((x) => x.kind === "accent").length,
    errors,
  };
}
