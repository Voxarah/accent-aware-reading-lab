# Roadmap

## Studio audit hardening
- [x] Fix truthful connection copy, heuristic disclosure, provenance name and UTC date.
- [x] Revalidate stored candidates and regenerate readers; stamp engine and lexicon versions.
- [x] Exclude common initial-th words from density; show every attempt's diagnostics.
- [x] Add generation orchestration regression tests and JSON-mode compatibility handling.
- [x] Disable public generation; gate judge build with encrypted teacher-passcode session; verify unlock/refusal/lock in browser.
- [x] Add durable atomic daily spend reservations: $10 shared per midnight-UTC day, conservative per-attempt reservations; verify concurrent ledger tests.
- [ ] Verify real Meta connection and JSON mode. Blocked: META_API_KEY, exact META_MODEL, verified provider rates and credits; all paid calls fail closed until pricing is configured.
- [ ] Pre-generate 1–2 accepted passages and reload before demo. Blocked: verified Meta connection.
- [ ] Copy chosen teacher passcode into the submission's private testing instructions. Blocked: owner-only chosen value; docs/judge-testing.md provides instructions without exposing it.
- Optional server signing deferred until after real connection verification; not required for the unsigned provenance record.

## Audit follow-up (done)
- [x] Bring score comparison directly after sample readers and reveal it after checks.
- [x] Add nonclinical result labels and disclose score limitations.
- [x] Clarify grammatical variation is outside pronunciation rules; add regression coverage.
- [x] Verify tests and mobile/desktop reading flows.

## On-device audio bridge (done)
- [x] Whisper worker (WASM, WebGPU fallback) with vernacular-biased initial prompt.
- [x] Privacy-terminal loading sequence (progress readout, "audio never leaves device" framing).
- [x] Mic capture + 16kHz resample + transcript handed to existing checker.
- [x] Keep 1-click sample readers as the guaranteed demo path.
- [x] Browser verification: worker loads, record flow works, presets untouched.
- [ ] Demo-day check: record the parent's own voice reading a passage; confirm transcript quality and terminal timing on real hardware.

## Passage Studio (Meta generates, Voxarah verifies)
- [x] Verifier: schema, verbatim tags, position-sensitive rule check, density, decodability audit.
- [x] Bounded retry (2) with diagnostics fed back; refusal card; token usage logged.
- [x] Rule-derived sample readers for generated passages.
- [x] Unsigned provenance record (served model, UTC dates, current engine/lexicon versions, attempts, tokens, tags, density, heuristic disclosure and scope).
- Connection and pre-generation blockers are tracked in Studio audit hardening above.
