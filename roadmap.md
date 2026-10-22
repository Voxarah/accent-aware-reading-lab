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
