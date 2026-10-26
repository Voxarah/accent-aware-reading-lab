import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePassage, MAX_ATTEMPTS, type StudioResult, type StudioDone } from "@/lib/studio/generate.functions";
import { TARGETS, type TargetId } from "@/lib/studio/targets";
import { GRADES, type Grade } from "@/lib/studio/decodability";
import type { GeneratedPassage } from "@/lib/studio/store";

const THEMES = ["school", "animals", "home", "outdoors", "space"] as const;
type Theme = (typeof THEMES)[number];

export function Receipt({ p }: { p: GeneratedPassage["provenance"] }) {
  return (
    <dl className="receipt">
      <dt>Model</dt><dd>{p.model}</dd>
      <dt>Generated</dt><dd>{new Date(p.generatedAt).toUTCString().replace(":00 GMT", " UTC")}</dd>
      <dt>Attempts</dt><dd>{p.attempts} of {MAX_ATTEMPTS}</dd>
      <dt>Tokens</dt><dd>{p.tokens.input} in / {p.tokens.output} out</dd>
      <dt>Tags</dt><dd>{p.targetsConfirmed} confirmed by sourced rules</dd>
      <dt>Density</dt><dd>{p.density.map((d) => `${d.target} ${d.verified}/${d.required}`).join(" · ")}</dd>
      <dt>Decodability</dt><dd>{Math.round(p.decodability.pct * 100)}% ({p.decodability.inPattern}/{p.decodability.total} words) · grade {p.decodability.grade} patterns</dd>
      <dt>Readers</dt><dd>Derived by rule from the text, not written by the model</dd>
      <dd className="receipt-scope">Phonology verified by the Voxarah engine. Content review is the teacher's.</dd>
    </dl>
  );
}

export function PassageStudio({ onAccept }: { onAccept: (p: GeneratedPassage) => void }) {
  const gen = useServerFn(generatePassage);
  const [grade, setGrade] = useState<Grade>(2);
  const [theme, setTheme] = useState<Theme>("school");
  const [targets, setTargets] = useState<TargetId[]>(["cluster-reduction", "pin-pen"]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<StudioResult | null>(null);
  const [added, setAdded] = useState(false);

  const toggle = (id: TargetId) => setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < 3 ? [...t, id] : t));
  const go = async () => {
    setBusy(true); setRes(null); setAdded(false);
    try { setRes(await gen({ data: { grade, theme, targets } })); }
    catch { setRes({ status: "error", message: "The request failed.", attempts: [] }); }
    finally { setBusy(false); }
  };

  const toPassage = (r: StudioDone): GeneratedPassage | null => {
    const v = r.verification;
    if (!v.candidate || !v.decodability || !v.readers) return null;
    const ok = v.tags.filter((t) => t.inText && t.qualifies).length;
    return {
      id: `gen-${r.generatedAt}`,
      title: `Studio · ${theme} · grade ${grade}`,
      targets: targets.map((id) => TARGETS.find((t) => t.id === id)?.label ?? id).join(", "),
      text: v.candidate.text,
      readers: { dialect: v.readers.dialect, miscue: v.readers.miscue, mixed: v.readers.mixed },
      provenance: {
        model: r.model, generatedAt: r.generatedAt, attempts: r.attempts.length, tokens: r.usage,
        targetsConfirmed: `${ok}/${v.tags.length}`, density: v.density,
        decodability: { grade: v.decodability.grade, pct: v.decodability.pct, inPattern: v.decodability.inPattern, total: v.decodability.total },
      },
    };
  };

  return (
    <div className="card">
      <p className="text-sm">Structured inputs only. The Meta model proposes a passage and tags; the published rules decide whether it is used.</p>
      <p className="label mt-4">Grade</p>
      <div className="mt-1 flex gap-2">{GRADES.map((g) => <Button variant="ghost" key={g} onClick={() => setGrade(g)} className="chip h-auto" data-active={g === grade}>Grade {g}</Button>)}</div>
      <p className="label mt-3">Theme</p>
      <div className="mt-1 flex flex-wrap gap-2">{THEMES.map((t) => <Button variant="ghost" key={t} onClick={() => setTheme(t)} className="chip h-auto capitalize" data-active={t === theme}>{t}</Button>)}</div>
      <p className="label mt-3">Phonological targets (up to 3)</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {TARGETS.map((t) => (
          <Button variant="ghost" key={t.id} onClick={() => toggle(t.id)} className="option h-auto whitespace-normal" data-active={targets.includes(t.id)} aria-pressed={targets.includes(t.id)}>
            <span className="font-medium">{t.label}</span><span className="text-xs text-muted-foreground">{t.hint}</span>
          </Button>
        ))}
      </div>
      <Button variant="ghost" onClick={go} disabled={busy || targets.length === 0} className="btn-primary mt-4 h-auto w-full">
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating and verifying…</> : "Generate and verify"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">Sends only these settings. Up to {MAX_ATTEMPTS} attempts; failed checks are fed back to the model, then the passage is refused.</p>

      {res?.status === "not-configured" && <p className="mt-4 rounded-md bg-muted p-3 text-sm">Meta Model API is not connected yet. Verified passages appear here once it is.</p>}
      {res?.status === "error" && <p className="mt-4 rounded-md bg-muted p-3 text-sm">{res.message} Nothing was added.</p>}
      {res?.status === "refused" && (
        <div className="mt-4 rounded-md border border-destructive p-3 text-sm">
          <p className="font-semibold">Generation refused</p>
          <p className="text-xs text-muted-foreground">Failed deterministic verification after {res.attempts.length} attempts ({res.model}). The passage was discarded.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{res.verification.diagnostics.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>
      )}
      {res?.status === "verified" && (() => {
        const p = toPassage(res);
        if (!p) return null;
        return (
          <div className="mt-4">
            <p className="font-display text-lg leading-relaxed">{p.text}</p>
            {res.attempts.length > 1 && <p className="mt-1 text-xs text-muted-foreground">Attempt 1 failed: {res.attempts[0]?.diagnostics.join(" ")}</p>}
            <Receipt p={p.provenance} />
            <Button variant="ghost" disabled={added} onClick={() => { onAccept(p); setAdded(true); }} className="btn-primary mt-3 h-auto w-full">
              {added ? "Added to passages" : "Add to test bench"}
            </Button>
          </div>
        );
      })()}
    </div>
  );
}
