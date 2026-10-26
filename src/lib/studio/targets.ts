// Phonological targets the Passage Studio can request. Each target is an
// existing sourced rule in rules.ts. A word "qualifies" only if a
// deterministic dialect form exists AND that rule's own explains() accepts
// it — so position (coda vs onset) is judged by the published rule, not by
// the model's claim.
import { PROFILES, type AccentRule } from "@/lib/accent/rules";

export const TARGET_IDS = ["cluster-reduction", "th-stopping", "r-lessness", "pin-pen", "ask-metathesis"] as const;
export type TargetId = (typeof TARGET_IDS)[number];

export const TARGETS: { id: TargetId; label: string; hint: string; minDensity: number }[] = [
  { id: "cluster-reduction", label: "Final consonant clusters", hint: "desk, lamp, walked", minDensity: 3 },
  { id: "th-stopping", label: "Initial th", hint: "think, thick, thin", minDensity: 3 },
  { id: "r-lessness", label: "r after vowels", hint: "car, door, sister", minDensity: 3 },
  { id: "pin-pen", label: "pin / pen", hint: "pen, ten, them", minDensity: 3 },
  { id: "ask-metathesis", label: "ask → aks", hint: "ask, asked", minDensity: 2 },
];

const AAE = PROFILES.find((p) => p.id === "aae")?.rules ?? [];
export const ruleById = (id: string): AccentRule | undefined => AAE.find((r) => r.id === id);

function candidates(ruleId: string, w: string): string[] {
  switch (ruleId) {
    case "ask-metathesis":
      return ["aks", "akses", "aksed", "aksing", "ax"];
    case "th-stopping":
      return ["d" + w.slice(2), "t" + w.slice(2), "da"];
    case "th-fronting": {
      const out: string[] = [];
      for (let i = 1; i < w.length - 1; i++)
        if (w.slice(i, i + 2) === "th") out.push(w.slice(0, i) + "f" + w.slice(i + 2), w.slice(0, i) + "v" + w.slice(i + 2));
      return out;
    }
    case "cluster-reduction":
      return [w.slice(0, -1), w.slice(0, -2)];
    case "r-lessness":
      return [
        w.replace(/([aeiou])r(?![aeiou])/g, "$1"),
        w.replace(/([aeiou])re$/, "$1"),
        w.replace(/(er|ar|ur|ir)(?![aeiou])/g, "ah"),
        w.replace(/(our|oor|ore|or)(?![aeiou])/g, "o"),
      ];
    case "pin-pen": {
      const out: string[] = [];
      for (let i = 0; i < w.length - 1; i++)
        if (w[i] === "e" && (w[i + 1] === "n" || w[i + 1] === "m")) out.push(w.slice(0, i) + "i" + w.slice(i + 1));
      return out;
    }
    case "ing-in":
      return [w.slice(0, -1)];
    default:
      return [];
  }
}

/** The rule-applied form of a word, or undefined if the rule does not apply. */
export function dialectForm(ruleId: string, w: string): string | undefined {
  const rule = ruleById(ruleId);
  if (!rule || w.length < 2) return undefined;
  return candidates(ruleId, w).find((h) => h.length > 0 && h !== w && rule.explains(w, h));
}

export const qualifies = (ruleId: string, w: string) => dialectForm(ruleId, w) !== undefined;

// Pronunciation qualification remains separate from instructional-density eligibility.
const COMMON_TH = new Set(["the", "this", "that", "these", "those", "they", "them", "their", "there", "then"]);
export const densityEligible = (id: TargetId, word: string) => qualifies(id, word) && !(id === "th-stopping" && COMMON_TH.has(word));
