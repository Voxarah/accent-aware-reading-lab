import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PASSAGES } from "@/lib/accent/passages";
import { PROFILES, OTHER_PROFILES_COUNT, OTHER_PROFILES_LABEL, type ProfileId } from "@/lib/accent/rules";
import { checkReading, summarize, type WordResult } from "@/lib/accent/checker";
import { PRESETS, READERS, type ReaderId } from "@/lib/accent/presets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voxarah Capture — accent-fair reading check" },
      { name: "description", content: "Check a typed reading transcript against accent rules backed by published sources." },
      { property: "og:title", content: "Voxarah Capture — accent-fair reading check" },
      { property: "og:description", content: "Real reading mistakes get flagged. Accent differences don't." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [pid, setPid] = useState(PASSAGES[0]!.id);
  const [prof, setProf] = useState<ProfileId>("aae");
  const [text, setText] = useState("");
  const [reader, setReader] = useState<ReaderId | null>(null);
  const [results, setResults] = useState<WordResult[] | null>(null);
  const [baseline, setBaseline] = useState<WordResult[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const passage = PASSAGES.find((p) => p.id === pid) ?? PASSAGES[0]!;
  const profile = PROFILES.find((p) => p.id === prof) ?? PROFILES[0]!;
  const ga = PROFILES.find((p) => p.id === "general-american")!;
  const s = results ? summarize(results) : null;
  const b = baseline ? summarize(baseline) : null;
  const total = passage.text.split(/\s+/).filter(Boolean).length;
  const pct = (errors: number) => Math.max(0, Math.round(((total - errors) / total) * 100));

  const reset = () => { setResults(null); setBaseline(null); setOpen(null); };
  const run = (t: string, p = profile, pass = passage) => {
    setResults(checkReading(pass.text, t, p));
    setBaseline(checkReading(pass.text, t, ga));
    setOpen(null);
  };
  const loadReader = (id: ReaderId) => {
    const t = id === "control" ? passage.text : PRESETS[passage.id]![id];
    const aae = PROFILES.find((p) => p.id === "aae")!;
    setProf("aae"); setReader(id); setText(t); run(t, aae);
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <header className="mb-8">
        <p className="eyebrow">Voxarah Capture · alignment test bench</p>
        <h1 className="font-display mt-2 text-4xl leading-tight">Read it your way.<br />Mistakes still count.</h1>
        <div className="card mt-4 text-sm">
          <p><span className="font-medium">Runs in your browser. Nothing is sent anywhere.</span> This page checks typed transcripts; it records no audio.</p>
          <p className="mt-1 text-muted-foreground">Voice capture will transcribe on the device itself. That part is in development and not in this test bench yet.</p>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="label">1 · Passage</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {PASSAGES.map((p) => (
            <button key={p.id} onClick={() => { setPid(p.id); setReader(null); setText(""); reset(); }} className="chip" data-active={p.id === pid}>{p.title}</button>
          ))}
        </div>
        <div className="card mt-3">
          <p className="text-xs text-muted-foreground">Targets: {passage.targets}</p>
          <p className="font-display mt-2 text-xl leading-relaxed">{passage.text}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="label">2 · Try a sample reader</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {READERS.map((r) => (
            <button key={r.id} onClick={() => loadReader(r.id)} className="option" data-active={reader === r.id}>
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.blurb}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Sample transcripts are written for this demo. No child's reading is used.</p>
      </section>

      <section className="mb-6">
        <h2 className="label">3 · Accent profile</h2>
        <div className="mt-2 grid gap-2">
          {PROFILES.map((p) => (
            <button key={p.id} onClick={() => { setProf(p.id); if (text.trim()) run(text, p); else reset(); }} className="option" data-active={p.id === prof}>
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.status}</span>
            </button>
          ))}
          <div className="option opacity-70">
            <span className="font-medium">{OTHER_PROFILES_COUNT} other Voxarah profiles</span>
            <span className="text-xs text-muted-foreground">{OTHER_PROFILES_LABEL}</span>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="label">4 · Or type what was read</h2>
        <textarea value={text} onChange={(e) => { setText(e.target.value); setReader(null); reset(); }} rows={4}
          placeholder="Type exactly what the reader said, e.g. “Mike walk pas da ol des…”" className="field mt-2" />
        <button onClick={() => run(text)} disabled={!text.trim()} className="btn-primary mt-3 w-full">
          Check reading
        </button>
      </section>

      {results && s && b && (
        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="card" >
            <p className="label">Standard check</p>
            <p className="font-display mt-2 text-4xl">{pct(b.errors)}%</p>
            <p className="text-sm">{b.errors} reading errors</p>
            <p className="mt-2 text-xs text-muted-foreground">Every difference from the text counts as a mistake.</p>
          </div>
          <div className="card" data-highlight="true">
            <p className="label">Voxarah · {profile.name}</p>
            <p className="font-display mt-2 text-4xl">{pct(s.errors)}%</p>
            <p className="text-sm">{s.errors} reading errors</p>
            <p className="mt-2 text-xs text-muted-foreground">Sourced accent differences are not counted.</p>
          </div>
          <p className="col-span-2 text-center text-sm font-medium">
            {b.errors - s.errors > 0
              ? `${b.errors - s.errors} accent differences the standard check would count as reading errors.`
              : "Both checks agree on this reading."}
          </p>
        </section>
      )}

      {results && s && (
        <section className="card mb-8">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat n={s.correct} label="Exact" tone="ok" />
            <Stat n={s.accent} label="Accent" tone="accent" />
            <Stat n={s.errors} label="Errors" tone="err" />
          </div>
          <p className="mt-5 flex flex-wrap gap-x-1.5 gap-y-2 leading-loose">
            {results.map((r, i) => (
              <button key={i} onClick={() => setOpen(open === i ? null : i)} className="word" data-kind={r.kind}>
                {r.kind === "omitted" ? <s>{r.expected}</s> : r.kind === "inserted" ? `+${r.heard}` : r.heard}
              </button>
            ))}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Tap any word to see why.</p>
          {open !== null && results[open] && <Detail r={results[open]!} />}
        </section>
      )}

      <section>
        <h2 className="label">Rules in {profile.name}</h2>
        {profile.rules.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None. This control proves real differences are always flagged.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {profile.rules.map((r) => (
              <li key={r.id} className="card">
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.example}</p>
                <p className="mt-2 text-xs italic text-muted-foreground">{r.source.citation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="stat" data-tone={tone}>
      <div className="font-display text-3xl">{n}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function Detail({ r }: { r: WordResult }) {
  const t =
    r.kind === "correct" ? "Read exactly as written."
    : r.kind === "accent" ? `“${r.expected}” → “${r.heard}”: ${r.rule.name}. Not counted as an error. Source: ${r.rule.source.citation}`
    : r.kind === "substituted" ? `“${r.expected}” read as “${r.heard}”. No sourced accent rule explains this — counted as an error.`
    : r.kind === "omitted" ? `“${r.expected}” was skipped — counted as an error.`
    : `“${r.heard}” was added — counted as an error.`;
  return <p className="mt-4 rounded-md bg-muted p-3 text-sm">{t}</p>;
}
