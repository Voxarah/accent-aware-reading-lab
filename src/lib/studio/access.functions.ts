import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export const studioAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { enabledHere, studioSession } = await import("./access.server");
  if (!enabledHere()) return { enabled: false, unlocked: false, configured: false };
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
