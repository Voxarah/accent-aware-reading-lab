import { describe, expect, it } from "vitest";
// Opt-in against this project's real ledger; only micro-dollar reservations, never Meta calls.
const enabled = process.env["STUDIO_TEST_LEDGER"] === "true";
describe.skipIf(!enabled)("durable shared daily ceiling", () => {
  async function query(path: string, body?: unknown) {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) throw new Error("Ledger test requires server configuration");
    const response = await fetch(`${url}/rest/v1/${path}`, { method: body === undefined ? "GET" : "POST",
      headers: { apikey: key, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error(`Ledger test failed (${response.status})`);
    return response.json();
  }
  it("rejects more than $10 even if a caller supplies a larger ceiling", async () => {
    expect(await query("rpc/reserve_studio_budget", { p_amount: 11, p_ceiling: 100 })).toBe(false);
  });
  it("all visitors share one durable UTC-day total under $10", async () => {
    const day = new Date().toISOString().slice(0, 10);
    const before = await query(`studio_daily_budget?day=eq.${day}&select=day,reserved_usd`) as { day: string; reserved_usd: number }[];
    const start = Number(before[0]?.reserved_usd ?? 0);
    const results = await Promise.all(Array.from({ length: 20 }, () => query("rpc/reserve_studio_budget", { p_amount: 0.000001, p_ceiling: 10 })));
    const after = await query(`studio_daily_budget?day=eq.${day}&select=day,reserved_usd`) as { day: string; reserved_usd: number }[];
    expect(after).toHaveLength(1);
    expect(after[0]?.day).toBe(day);
    expect(Number(after[0]?.reserved_usd)).toBeCloseTo(start + results.filter(Boolean).length * 0.000001, 6);
    expect(Number(after[0]?.reserved_usd)).toBeLessThanOrEqual(10);
  });
});
