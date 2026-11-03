import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export const studioAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { enabledHere, studioSession } = await import("./access.server");
  if (!enabledHere()) {
    const { getRequestUrl, getRequestHeader } = await import("@tanstack/react-start/server");
    const allowed = process.env["STUDIO_JUDGE_ORIGIN"]?.trim();
    let allowedHost = ""; try { allowedHost = allowed ? new URL(allowed).host : "bad"; } catch { allowedHost = "unparseable"; }
    return { enabled: false, unlocked: false, configured: false, diag: { flag: process.env["STUDIO_ENABLED"]?.trim() === "true", allowedHost, seenHost: getRequestUrl().host, fwd: getRequestHeader("x-forwarded-host") ?? "" } };
  }
  const configured = Boolean(process.env["STUDIO_PASSWORD"] && process.env["STUDIO_SESSION_SECRET"]);
  return { enabled: true, configured, unlocked: configured ? Boolean((await studioSession()).data.unlocked) : false };
});
export const unlockStudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().min(1).max(256) }).strict().parse(data))
  .handler(async ({ data }) => {
    const { enabledHere, studioSession, passwordMatches } = await import("./access.server");
    const expected = process.env["STUDIO_PASSWORD"];
    if (!enabledHere() || !expected || !passwordMatches(data.password, expected)) return { ok: false };
    await (await studioSession()).update({ unlocked: true });
    return { ok: true };
  });
export const lockStudio = createServerFn({ method: "POST" }).handler(async () => {
  const { enabledHere, studioSession } = await import("./access.server");
  if (enabledHere()) await (await studioSession()).clear();
  return { ok: true };
});
