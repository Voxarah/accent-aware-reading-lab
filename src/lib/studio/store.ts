// Verified generated passages, stored only in this browser (teacher material,
// no child data). Pre-generate before a demo; the demo never generates live.
import type { Passage } from "@/lib/accent/passages";

export type Provenance = {
  model: string;
  generatedAt: string;
  attempts: number;
  tokens: { input: number; output: number };
  targetsConfirmed: string;
  density: { target: string; verified: number; required: number }[];
  decodability: { grade: number; pct: number; inPattern: number; total: number };
};

export type GeneratedPassage = Passage & { provenance: Provenance; readers: { dialect: string; miscue: string; mixed: string } };

const KEY = "voxarah.studio.passages.v1";

export function loadGenerated(): GeneratedPassage[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as GeneratedPassage[]; } catch { return []; }
}

export function saveGenerated(list: GeneratedPassage[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
