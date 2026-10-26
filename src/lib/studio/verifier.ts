// Meta generates, Voxarah verifies. Nothing the model returns is believed
// until these deterministic checks pass. Pure module: runs on server and in tests.
import { z } from "zod";
import { normalize } from "@/lib/accent/checker";
import { TARGET_IDS, TARGETS, qualifies, densityEligible, type TargetId } from "./targets";
import { auditDecodability, type DecodabilityAudit, type Grade } from "./decodability";
import { deriveReaders, type DerivedReaders } from "./readers";

export const CandidateSchema = z
  .object({
    text: z.string().min(20).max(900),
    targets: z.array(z.object({ word: z.string().min(1).max(40), target: z.enum(TARGET_IDS) }).strict()).max(60),
  })
  .strict();
export type Candidate = z.infer<typeof CandidateSchema>;

export const WORD_RANGE: Record<Grade, [number, number]> = { 1: [20, 45], 2: [25, 60], 3: [30, 75] };

export type StudioParams = { grade: Grade; theme: string; targets: TargetId[] };

export type TagCheck = { word: string; target: TargetId; inText: boolean; qualifies: boolean };
export type Verification = {
  pass: boolean;
  schemaOk: boolean;
  diagnostics: string[];
  candidate?: Candidate;
  tags: TagCheck[];
  density: { target: TargetId; verified: number; required: number }[];
  wordCount?: number;
  decodability?: DecodabilityAudit;
  readers?: DerivedReaders;
};

export function verifyCandidate(raw: unknown, params: StudioParams): Verification {
  const parsed = CandidateSchema.safeParse(raw);
  if (!parsed.success) {
    return { pass: false, schemaOk: false, tags: [], density: [], diagnostics: [`Output did not match the required JSON shape: ${parsed.error.issues.map((i) => `${i.path.join(".") || "root"} ${i.message}`).join("; ")}.`] };
  }
  const c = parsed.data;
  const diagnostics: string[] = [];
  const words = c.text.split(/\s+/).map(normalize).filter(Boolean);
  const wordSet = new Set(c.text.split(/\s+/).map((w) => w.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "")).filter(Boolean));

  // Phase 1 + 2: each claimed tag must appear verbatim and qualify under the published rule.
  const tags: TagCheck[] = c.targets.map((t) => {
    const w = normalize(t.word);
    return { word: w, target: t.target, inText: wordSet.has(t.word), qualifies: qualifies(t.target, w) };
  });
  const claims = new Set<string>();
  for (const t of c.targets) {
    const key = `${t.target}:${normalize(t.word)}`;
    if (claims.has(key)) diagnostics.push(`Duplicate claim "${t.word}" for ${t.target}.`);
    claims.add(key);
  }
  for (const t of tags) {
    if (!t.inText) diagnostics.push(`Claimed token "${t.word}" does not appear verbatim in the passage.`);
    else if (!t.qualifies) diagnostics.push(`Claimed "${t.word}" for ${t.target}, but the sourced rule does not apply to it (wrong position or pattern).`);
  }

  // Density: verified occurrences of each requested target in the text.
  const verifiedWords = (id: TargetId) => new Set(tags.filter((t) => t.target === id && t.inText && t.qualifies).map((t) => t.word));
  const density = params.targets.map((id) => {
    const vs = verifiedWords(id);
    const verified = words.filter((w) => vs.has(w) && densityEligible(id, w)).length;
    const required = TARGETS.find((t) => t.id === id)?.minDensity ?? 3;
    if (verified < required) diagnostics.push(`Target ${id}: density ${verified} of ${required} required verified tokens.`);
    return { target: id, verified, required };
  });
  for (const t of tags) if (!params.targets.includes(t.target)) diagnostics.push(`Tag "${t.word}" uses unrequested target ${t.target}.`);

  const [lo, hi] = WORD_RANGE[params.grade];
  if (words.length < lo || words.length > hi) diagnostics.push(`Passage has ${words.length} words; grade ${params.grade} requires ${lo}–${hi}.`);

  // Phase 3: whole-passage decodability.
  const decodability = auditDecodability(c.text, params.grade);
  if (!decodability.pass)
    diagnostics.push(`Decodability ${Math.round(decodability.pct * 100)}% is below 85% for grade ${params.grade}. Out-of-pattern words: ${decodability.outOfPattern.join(", ")}.`);

  // Readers must be derivable by rule, or the passage cannot enter the bench.
  const readers = deriveReaders(c.text);
  for (const p of readers.problems) diagnostics.push(`Reader derivation: ${p}`);

  return { pass: diagnostics.length === 0, schemaOk: true, diagnostics, candidate: c, tags, density, wordCount: words.length, decodability, readers };
}
