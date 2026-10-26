// Whole-passage pattern audit. Every word is classified against the
// phonogram patterns taught by a grade band, or the Dolch service-word list
// (Dolch, E. W. (1936). A basic sight vocabulary. Elementary School Journal,
// 36(6), 456–460). This is a heuristic pattern check, not a validated
// readability measure; the receipt says so.
import { normalize } from "@/lib/accent/checker";

export type Grade = 1 | 2 | 3;
export const GRADES: Grade[] = [1, 2, 3];
export const DECODABLE_THRESHOLD = 0.85;

const DOLCH: Record<Grade, string> = {
  1: "a and away big blue can come down find for funny go help here i in is it jump little look make me my not one play red run said see the three to two up we where yellow you all am are at ate be black brown but came did do eat four get good have he into like must new no now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes after again an any as ask by could every fly from give going had has her him his how just know let live may of old once open over put round some stop take thank them then think walk were when",
  2: "always around because been before best both buy call cold does dont fast first five found gave goes green its made many off or pull read right sing sit sleep tell their these those upon us use very wash which why wish work would write your",
  3: "about better bring carry clean cut done draw drink eight fall far full got grow hold hot hurt if keep kind laugh light long much myself never only own pick seven shall show six small start ten today together try warm",
};

export function sightWords(g: Grade): Set<string> {
  const s = new Set<string>();
  for (const k of GRADES) if (k <= g) for (const w of DOLCH[k].split(" ")) s.add(w);
  return s;
}

const C = "(?:sh|ch|th|wh|ck|ng|nk|qu|tch|[bcdfghjklmnpqrstvwxyz])";
const V1 = "[aeiou]";
const V2 = "(?:igh|ai|ay|ee|ea|oa|oe|ow|ou|oi|oy|oo|ar|or|er|ir|ur|au|aw|ew|ie|ue|[aeiouy])";

const PATTERNS: Record<Grade, RegExp[]> = {
  // closed syllables: CVC, blends, digraphs
  1: [new RegExp(`^${C}*${V1}${C}*$`)],
  // + silent e, vowel teams, r-controlled, final y
  2: [new RegExp(`^${C}*${V2}${C}*$`), new RegExp(`^${C}*${V1}${C}e$`)],
  // + two-syllable words built from the same graphemes
  3: [new RegExp(`^(?:${C}*${V2}${C}*){1,2}$`), new RegExp(`^${C}*${V2}${C}*${V1}${C}e$`), new RegExp(`^${C}*${V1}${C}e$`)],
};

const SUFFIX: Record<Grade, string[]> = {
  1: ["s", "es", "ed", "ing"],
  2: ["s", "es", "ed", "ing", "er", "est"],
  3: ["s", "es", "ed", "ing", "er", "est", "ly", "ful"],
};

function fitsPattern(w: string, g: Grade): boolean {
  const bases = [w];
  for (const s of SUFFIX[g]) if (w.endsWith(s) && w.length - s.length >= 2) bases.push(w.slice(0, -s.length), w.slice(0, -s.length) + "e");
  return bases.some((b) => PATTERNS[g].some((re) => re.test(b)));
}

export type WordClass = "sight" | "pattern" | "out";

export function classifyWord(w: string, g: Grade, sight = sightWords(g)): WordClass {
  if (sight.has(w)) return "sight";
  return fitsPattern(w, g) ? "pattern" : "out";
}

export type DecodabilityAudit = { grade: Grade; total: number; inPattern: number; pct: number; outOfPattern: string[]; pass: boolean };

export function auditDecodability(text: string, g: Grade): DecodabilityAudit {
  const words = text.split(/\s+/).map(normalize).filter(Boolean);
  const sight = sightWords(g);
  const out = words.filter((w) => classifyWord(w, g, sight) === "out");
  const total = words.length;
  const inPattern = total - out.length;
  const pct = total ? inPattern / total : 0;
  return { grade: g, total, inPattern, pct, outOfPattern: [...new Set(out)], pass: total > 0 && pct >= DECODABLE_THRESHOLD };
}
