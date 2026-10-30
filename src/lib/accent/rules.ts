// Accent rules: each rule explains a word-level difference between the
// expected word and what was read. Every rule MUST cite a published source;
// unsourced rules are not allowed in this file.

export type SourceLink = { label: string; url: string };
export type Source = { citation: string; links: SourceLink[] };

export type AccentRule = {
  id: string;
  name: string;
  example: string;
  source: Source;
  explains: (expected: string, heard: string) => boolean;
};

type Ref = { citation: string; link: SourceLink };
const wc = (isbn: string): string => `https://search.worldcat.org/search?q=bn:${isbn}`;
const S = {
  green: { citation: "Green, L. J. (2002). African American English: A Linguistic Introduction. Cambridge University Press.", link: { label: "Green 2002 · DOI", url: "https://doi.org/10.1017/CBO9780511800306" } },
  labov72: { citation: "Labov, W. (1972). Language in the Inner City: Studies in the Black English Vernacular. University of Pennsylvania Press.", link: { label: "Labov 1972 · WorldCat", url: wc("0812210514") } },
  rickford: { citation: "Rickford, J. R. (1999). African American Vernacular English: Features, Evolution, Educational Implications. Blackwell.", link: { label: "Rickford 1999 · WorldCat", url: wc("0631212450") } },
  wolfram: { citation: "Wolfram, W. & Schilling, N. (2016). American English: Dialects and Variation (3rd ed.). Wiley-Blackwell.", link: { label: "Wolfram & Schilling 2016 · WorldCat", url: wc("9781118390221") } },
  anae: { citation: "Labov, W., Ash, S. & Boberg, C. (2006). The Atlas of North American English. Mouton de Gruyter.", link: { label: "ANAE 2006 · DOI", url: "https://doi.org/10.1515/9783110167467" } },
} satisfies Record<string, Ref>;

const cite = (...refs: Ref[]): Source => ({ citation: refs.map((r) => r.citation).join(" · "), links: refs.map((r) => r.link) });

const V = "aeiou";

const clusterReduction: AccentRule = {
  id: "cluster-reduction",
  name: "Final consonant cluster reduction",
  example: "test → tes, walked → walk",
  source: cite(S.green, S.labov72),
  explains: (e, h) => {
    if (/(st|sk|sp|nd|ld|ft|kt|pt|nt|lt|mp|ct|xt)$/.test(e) && h === e.slice(0, -1)) return true;
    if (/[^aeiou]ed$/.test(e) && (h === e.slice(0, -2) || h === e.slice(0, -1))) return true;
    return false;
  },
};

const thStopping: AccentRule = {
  id: "th-stopping",
  name: "Initial th → d / t",
  example: "this → dis, think → tink",
  source: cite(S.green, S.rickford),
  explains: (e, h) => {
    if (!e.startsWith("th")) return false;
    const rest = e.slice(2);
    if (h === "d" + rest || h === "t" + rest) return true;
    return e === "the" && ["da", "duh", "de"].includes(h);
  },
};

const thFronting: AccentRule = {
  id: "th-fronting",
  name: "Non-initial th → f / v",
  example: "with → wif, brother → brover",
  source: cite(S.green),
  explains: (e, h) => {
    for (let i = 1; i < e.length - 1; i++) {
      if (e.slice(i, i + 2) !== "th") continue;
      for (const r of ["f", "v"]) if (e.slice(0, i) + r + e.slice(i + 2) === h) return true;
    }
    return false;
  },
};

const rLessness: AccentRule = {
  id: "r-lessness",
  name: "r after vowels not pronounced",
  example: "car → cah, more → mo, sister → sistah",
  source: cite(S.wolfram),
  explains: (e, h) => {
    if (!/[aeiou]r/.test(e)) return false;
    const c = new Set([
      e.replace(/([aeiou])r(?![aeiou])/g, "$1"),
      e.replace(/([aeiou])re$/, "$1"),
      e.replace(/(er|ar|ur|ir)(?![aeiou])/g, "ah"),
      e.replace(/(er|ar|ur|ir)(?![aeiou])/g, "uh"),
      e.replace(/(our|oor|ore|or)(?![aeiou])/g, "oh"),
      e.replace(/(our|oor|ore|or)(?![aeiou])/g, "o"),
    ]);
    c.delete(e);
    return c.has(h);
  },
};

const pinPen: AccentRule = {
  id: "pin-pen",
  name: "pin / pen merger (e → i before n, m)",
  example: "pen → pin, ten → tin",
  source: cite(S.anae, S.wolfram),
  explains: (e, h) => {
    for (let i = 0; i < e.length - 1; i++) {
      if (e[i] === "e" && (e[i + 1] === "n" || e[i + 1] === "m")) {
        if (e.slice(0, i) + "i" + e.slice(i + 1) === h) return true;
      }
    }
    return false;
  },
};

const ingToIn: AccentRule = {
  id: "ing-in",
  name: "-ing → -in'",
  example: "running → runnin'",
  source: cite(S.wolfram),
  explains: (e, h) => e.length > 4 && e.endsWith("ing") && h === e.slice(0, -1),
};

const ayGlide: AccentRule = {
  id: "ay-glide-weakening",
  name: "/ay/ glide weakening",
  example: "time → tahm, my → mah",
  source: cite(S.anae),
  explains: (e, h) => {
    const m = e.match(/^([^aeiou]*)i([^aeiou]+)e$/);
    if (m && h === `${m[1]}ah${m[2]}`) return true;
    if (/^[^aeiou]+y$/.test(e) && h === e.slice(0, -1) + "ah") return true;
    return e === "i" && h === "ah";
  },
};

const askMetathesis: AccentRule = {
  id: "ask-metathesis",
  name: "ask → aks / ax (metathesis)",
  example: "ask → aks, asked → axed",
  source: cite(S.green, S.wolfram),
  explains: (e, h) => {
    const m = e.match(/^ask(s|ed|ing)?$/);
    if (!m) return false;
    const map: Record<string, string[]> = {
      "": ["aks", "ax"],
      s: ["akses", "axes", "aks", "ax"],
      ed: ["aksed", "axed", "akst", "axt", "aks", "ax"],
      ing: ["aksing", "axing", "aksin", "axin"],
    };
    return (map[m[1] ?? ""] ?? []).includes(h);
  },
};

export type ProfileId = "aae" | "southern" | "general-american";

export type AccentProfile = {
  id: ProfileId;
  name: string;
  status: string;
  rules: AccentRule[];
};

export const PROFILES: AccentProfile[] = [
  {
    id: "aae",
    name: "African American English",
    status: "Sourced rules · validating",
    rules: [clusterReduction, thStopping, thFronting, rLessness, pinPen, ingToIn, askMetathesis],
  },
  {
    id: "southern",
    name: "Southern US",
    status: "New profile · sourced rules",
    rules: [pinPen, ingToIn, ayGlide],
  },
  {
    id: "general-american",
    name: "General American (control)",
    status: "No accent allowances — every difference is flagged",
    rules: [],
  },
];

export const OTHER_PROFILES_LABEL = "Covered by rules, validation deepening";
export const OTHER_PROFILES_COUNT = 9;
