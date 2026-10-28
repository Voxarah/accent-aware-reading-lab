import { createServerFn } from "@tanstack/react-start";
import { Params } from "./params";
import { runGeneration, MAX_OUTPUT_TOKENS, type StudioResult } from "./generation";
import { reservationUsd } from "./policy";
export { MAX_ATTEMPTS, type StudioResult, type StudioDone } from "./generation";

export const generatePassage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Params.parse(d))
  .handler(async ({ data }): Promise<StudioResult> => {
    const { requireStudio } = await import("./access.server");
    if (!await requireStudio()) return { status: "error", message: "Teacher access is required; generation is disabled on public builds.", attempts: [] };
    const key = process.env["META_API_KEY"];
    const model = process.env["META_MODEL"];
    const base = (process.env["META_API_BASE_URL"] ?? "https://api.llama.com/compat/v1").replace(/\/$/, "");
    if (!key || !model) return { status: "not-configured" };
    const ceiling = Number(process.env["STUDIO_DAILY_USD_LIMIT"] ?? 0);
    // Verified pricing keyed by model ID; the served model must appear here at runtime.
    let pricing: Record<string, { input: number; output: number }> = {};
    try { pricing = JSON.parse(process.env["META_PRICING_JSON"] ?? "{}"); } catch { pricing = {}; }
    const rate = pricing[model];
    if (!Number.isFinite(ceiling) || ceiling <= 0 || !rate || !reservationUsd([], rate.input, rate.output, MAX_OUTPUT_TOKENS))
      return { status: "error", message: "Generation is paused until the daily ceiling and verified model pricing are configured.", attempts: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return runGeneration(data, { model, key, base, jsonMode: process.env["META_JSON_MODE"] !== "off", request: fetch, pricing,
      reserve: async (messages) => {
        const amount = reservationUsd(messages, rate.input, rate.output, MAX_OUTPUT_TOKENS);
        const { data: accepted, error } = await supabaseAdmin.rpc("reserve_studio_budget", { p_amount: amount, p_ceiling: ceiling });
        // Retain worst-case reservations after errors, unknown usage and restarts; never overspend by refunding uncertain charges.
        return !error && accepted === true;
      },
    });
  });
