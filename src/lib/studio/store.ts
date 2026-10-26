// Browser records are editable, not sealed. Recompute verification and readers on every load.
import { z } from "zod";
import type { Passage } from "@/lib/accent/passages";
import { Params } from "./params";
import { CandidateSchema, verifyCandidate } from "./verifier";
import { ENGINE_VERSION, LEXICON_VERSION } from "./versions";
export type Provenance = {
  model: string; generatedAt: string; attempts: number; tokens: { input: number; output: number };
  targetsConfirmed: string; density: { target: string; verified: number; required: number }[];
  decodability: { grade: number; pct: number; inPattern: number; total: number };
  engineVersion: string; lexiconVersion: string; verifiedAt: string;
};
export type GeneratedPassage = Passage & { params: z.infer<typeof Params>; candidate: z.infer<typeof CandidateSchema>; provenance: Provenance; readers: { dialect: string; miscue: string; mixed: string } };
const RecordSchema = z.object({
  id: z.string().min(1).max(100), params: Params, candidate: CandidateSchema,
  provenance: z.object({ model: z.string().min(1).max(200), generatedAt: z.string().datetime(), attempts: z.number().int().min(1).max(2),
    tokens: z.object({ input: z.number().int().nonnegative(), output: z.number().int().nonnegative() }) }),
});
export function revalidateGenerated(raw: unknown): GeneratedPassage | null {
  const parsed = RecordSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { id, params, candidate, provenance } = parsed.data;
  const v = verifyCandidate(candidate, params);
  if (!v.pass || !v.decodability || !v.readers) return null;
  return { id, params, candidate, title: `Studio · ${params.theme} · grade ${params.grade}`,
    targets: params.targets.join(", "), text: candidate.text,
    readers: { dialect: v.readers.dialect, miscue: v.readers.miscue, mixed: v.readers.mixed },
    provenance: { ...provenance, targetsConfirmed: `${v.tags.filter((t) => t.inText && t.qualifies).length}/${v.tags.length}`,
      density: v.density, decodability: { grade: v.decodability.grade, pct: v.decodability.pct, inPattern: v.decodability.inPattern, total: v.decodability.total },
      engineVersion: ENGINE_VERSION, lexiconVersion: LEXICON_VERSION, verifiedAt: new Date().toISOString() },
  };
}
const KEY = "voxarah.studio.passages.v1";
export function loadGenerated(): GeneratedPassage[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.slice(0, 50).map(revalidateGenerated).filter((p): p is GeneratedPassage => p !== null) : [];
  } catch { return []; }
}
export function saveGenerated(list: GeneratedPassage[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}
export function formatUtc(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}
