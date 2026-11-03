# Roadmap

## Freeze decisions (Nov 3)
- [x] Judge-facing docs rewritten to the live-verified state: connection and JSON mode, runtime model ID, measured cost per press, spend ceilings proven on screen, refusal path proven live.
- [x] Public repository verified live and public: github.com/Voxarah/accent-aware-reading-lab carries source, docs, and MIT license; the committed .env holds publishable values only.
- [x] Decided against bundling a Studio passage into source. Studio passages live in the browser that generated them; the demo recording carries the Studio story, and the quickstart keeps "(if shown)". Do not re-propose before the freeze.
- [ ] Demo-day: copy the chosen teacher passcode into the submission's private testing-instructions field. Owner-only value.
- [ ] Demo-day: one clean close-mic parent-voice take, or the voice section stays out of the package.
- [ ] Submit before 9 PM ET, Nov 4.

## Studio audit hardening

- [x] Fix truthful connection copy, heuristic disclosure, provenance name and UTC date.
- [x] Revalidate stored candidates and regenerate readers; stamp engine and lexicon versions.
- [x] Exclude common initial-th words from density; show every attempt's diagnostics.
- [x] Add generation orchestration regression tests and JSON-mode compatibility handling.
- [x] Disable public generation; gate judge build with encrypted teacher-passcode session; verify unlock/refusal/lock in browser.
- [x] Add durable atomic daily spend reservations: $10 shared per midnight-UTC day, conservative per-attempt reservations; verify concurrent ledger tests.
- [x] Verify real Meta connection and JSON mode: muse-spark-1.3 on api.meta.ai/v1, 3/3 clean structured parses; output cap raised to 8192 (reasoning tokens); pricing keyed to served model ID, unpriced models refused.
- [x] Prove spend ceilings trip: 1¢ ceiling rejects second half-cent, $10 daily cap rejects $11, $40 window cap rejects over-limit; ledger durable.
- [x] Exercise retry/refusal live: fault-injected bad output → exactly one retry, refusal with both attempts' diagnostics, nothing saved.
- [x] Clean end-to-end grade-2 generation: verified, provenance record with runtime model ID, density, decodability, versions; rule-derived readers re-scored. Measured ~$0.01–0.03 per call.
- [ ] Pre-generate 1–2 accepted passages through the judge-build UI and reload before demo. Needs the teacher passcode in the preview.
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
