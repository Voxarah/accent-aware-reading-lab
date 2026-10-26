import { useSession, getRequestUrl, setResponseHeader } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { judgeEnabled } from "./policy";

export function enabledHere() {
  setResponseHeader("Cache-Control", "no-store");
  return judgeEnabled(process.env["STUDIO_ENABLED"], process.env["STUDIO_JUDGE_ORIGIN"], getRequestUrl().origin);
}
export async function studioSession() {
  const password = process.env["STUDIO_SESSION_SECRET"];
  if (!password || password.length < 32) throw new Error("Studio session is not configured");
  return useSession<{ unlocked?: boolean }>({ password, name: "voxarah-studio", maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: getRequestUrl().protocol === "https:", sameSite: "strict", path: "/" } });
}
export function passwordMatches(input: string, expected: string) {
  return timingSafeEqual(createHash("sha256").update(input).digest(), createHash("sha256").update(expected).digest());
}
export async function requireStudio() {
  if (!enabledHere()) return false;
  const session = await studioSession();
  return Boolean(process.env["STUDIO_PASSWORD"] && session.data.unlocked);
}
