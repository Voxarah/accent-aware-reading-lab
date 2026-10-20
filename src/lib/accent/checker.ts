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
  const cost = (i: number, j: number) => (E[i] === H[j] || findRule(profile, E[i], H[j]) ? 0 : 1);
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost(i - 1, j - 1));

  const out: WordResult[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + cost(i - 1, j - 1)) {
      const e = E[i - 1], h = H[j - 1];
      if (e === h) out.push({ kind: "correct", expected: e, heard: h });
      else {
        const rule = findRule(profile, e, h);
        out.push(rule ? { kind: "accent", expected: e, heard: h, rule } : { kind: "substituted", expected: e, heard: h });
      }
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      out.push({ kind: "omitted", expected: E[i - 1] }); i--;
    } else {
      out.push({ kind: "inserted", heard: H[j - 1] }); j--;
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
