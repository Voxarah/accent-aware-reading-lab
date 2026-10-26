import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { studioAccess, unlockStudio, lockStudio } from "@/lib/studio/access.functions";
import { PassageStudio } from "./PassageStudio";
import type { GeneratedPassage } from "@/lib/studio/store";
export function StudioGate({ onAccept }: { onAccept: (p: GeneratedPassage) => void }) {
  const access = useServerFn(studioAccess);
  const unlock = useServerFn(unlockStudio);
  const lock = useServerFn(lockStudio);
  const [state, setState] = useState({ enabled: false, configured: false, unlocked: false });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void access().then(setState).catch(() => setError("Teacher access is unavailable.")); }, [access]);
  if (!state.enabled) return null;
  return <section className="mt-10">
    <h2 className="label">Passage Studio · teacher material</h2>
    <p className="mt-1 text-xs text-muted-foreground">Built for Meta’s models. Connection and live compatibility verification are pending. No child data is used.</p>
    {state.unlocked ? <><Button variant="ghost" className="mt-2" onClick={async () => { await lock(); setState((s) => ({ ...s, unlocked: false })); }}>Lock teacher access</Button><PassageStudio onAccept={onAccept} /></>
      : !state.configured ? <p className="mt-3 text-sm">Teacher access has not been configured.</p>
      : <form className="mt-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { const result = await unlock({ data: { password } }); setPassword(""); if (result.ok) setState((s) => ({ ...s, unlocked: true })); else setError("Incorrect passcode or access unavailable."); } catch { setError("Teacher access is unavailable."); } finally { setBusy(false); } }}>
        <label className="label" htmlFor="studio-passcode">Teacher passcode</label>
        <input id="studio-passcode" type="password" autoComplete="current-password" maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} className="field mt-2" />
        <Button type="submit" disabled={busy || !password} className="mt-2">Unlock Studio</Button>
      </form>}
    {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </section>;
}
