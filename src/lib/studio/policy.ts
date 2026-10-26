export function judgeEnabled(enabled: string | undefined, allowedOrigin: string | undefined, actualOrigin: string): boolean {
  if (enabled !== "true" || !allowedOrigin) return false;
  try {
    const allowed = new URL(allowedOrigin);
    const actual = new URL(actualOrigin);
    // The public app must remain disabled even after a mistaken configuration.
    if (actual.hostname === "accent-aware-reading-lab.lovable.app") return false;
    return allowed.origin === actual.origin && allowed.href === `${allowed.origin}/`;
  } catch { return false; }
}

export function reservationUsd(messages: { content: string }[], inputRate: number, outputRate: number, maxOutput: number): number {
  if (![inputRate, outputRate].every((n) => Number.isFinite(n) && n > 0)) return 0;
  // Conservative UTF-8 byte bound, plus per-message protocol overhead; no cache discount.
  const inputBound = messages.reduce((n, m) => n + new TextEncoder().encode(m.content).length + 256, 256);
  return Math.ceil(((inputBound * inputRate + maxOutput * outputRate) / 1_000_000) * 1_000_000) / 1_000_000;
}
