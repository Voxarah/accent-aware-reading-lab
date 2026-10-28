// Sample readers for generated passages are DERIVED BY RULE from the passage
// text — never written by the model. Dialect = sourced AAE rules applied;
// miscues = planted edits that no rule excuses; each result is re-checked by
// the alignment engine before it is accepted.
import { checkReading, normalize, summarize } from "@/lib/accent/checker";
import { PROFILES } from "@/lib/accent/rules";
import { dialectForm } from "./targets";

const AAE = (() => {
  const profile = PROFILES.find((p) => p.id === "aae");
  if (!profile) throw new Error("Sourced AAE profile is required");
  return profile;
})();
const RULE_ORDER = ["ask-metathesis", "th-stopping", "th-fronting", "cluster-reduction", "r-lessness", "pin-pen", "ing-in"];

export type DerivedReaders = { dialect: string; miscue: string; mixed: string; ok: boolean; problems: string[] };

const tokens = (t: string) => t.split(/\s+/).map(normalize).filter(Boolean);

export function dialectWord(w: string): string {
  for (const id of RULE_ORDER) {
    const f = dialectForm(id, w);
    if (f) return f;
  }
  return w;
}

const SWAP: Record<string, string> = { a: "o", o: "a", e: "a", i: "a", u: "o" };

/** A misreading of w that no AAE rule excuses (vowel swap), or undefined. */
export function miscueWord(w: string): string | undefined {
  for (let i = 0; i < w.length; i++) {
    const s = SWAP[w[i] ?? ""];
    if (!s) continue;
    const h = w.slice(0, i) + s + w.slice(i + 1);
    if (summarize(checkReading(w, h, AAE)).errors === 1) return h;
  }
  return undefined;
}

export function deriveReaders(text: string): DerivedReaders {
  const T = tokens(text);
  const problems: string[] = [];
  const dialect = T.map(dialectWord).join(" ");

  // Plant 3 rule-unexcused edits at spread positions: swap, omit, swap.
  const content = T.map((w, i) => ({ w, i })).filter((x) => x.w.length >= 3);
  const pick = (f: number) => content[Math.min(content.length - 1, Math.floor(content.length * f))];
  const plan = [pick(0.2), pick(0.5), pick(0.8)];
  const miscueT = [...T] as (string | null)[];
  plan.forEach((p, k) => {
    if (!p) return;
    if (k === 1) miscueT[p.i] = null;
    else miscueT[p.i] = miscueWord(p.w) ?? null;
  });
  const miscue = miscueT.filter((x): x is string => x !== null).join(" ");

  const omitAt = pick(0.5)?.i ?? 0;
  const mixed = T.map(dialectWord).filter((_, i) => i !== omitAt).join(" ");

  const d = summarize(checkReading(text, dialect, AAE)).errors;
  const m = summarize(checkReading(text, miscue, AAE)).errors;
  const x = summarize(checkReading(text, mixed, AAE)).errors;
  if (d !== 0) problems.push(`Dialect reader had ${d} flagged differences (expected 0).`);
  if (m < 3) problems.push(`Struggling reader had ${m} flagged differences (expected at least 3).`);
  if (x !== 1) problems.push(`Mixed reader had ${x} flagged differences (expected exactly 1).`);
  if (dialect === T.join(" ")) problems.push("No sourced rule applies anywhere in the passage.");
  return { dialect, miscue, mixed, ok: problems.length === 0, problems };
}
