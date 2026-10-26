# Roadmap

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
- [x] Provenance receipt (model from response, date, attempts, tokens, tags, density, decodability, scope line).
- [ ] Connect Meta Model API (META_API_KEY, META_MODEL) once credits land; confirm model id in the console. Blocked: credits.
- [ ] Pre-generate 1–2 verified passages before recording the demo (never generate live).
