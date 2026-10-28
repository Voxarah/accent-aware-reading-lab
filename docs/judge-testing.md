# Voxarah Capture — judge testing

## Entry
- Judge build: https://id-preview--24954b32-f9c3-4063-8105-7c829a6b7595.lovable.app
- Passage Studio appears only in the explicitly enabled judge build. The public app never permits generation.
- Use the teacher passcode supplied by the owner in the submission's private testing-instructions field. The owner must copy the passcode they chose there; it is intentionally not recorded in source or public documentation.
- A shared passcode is a gate, not individual user authentication. It grants access to teacher passage preparation only.

## Reliable demo
1. Choose a passage, then Dialect reader. Compare the two prototype word-match scores.
2. Choose Mixed reader: one real difference remains flagged under the AAE profile.
3. Inspect sourced rules and the pronunciation-only, nonclinical scope note.
4. Select a previously verified Studio passage. Open its provenance record: current checks and rule-derived readers are recomputed on page load, with engine and lexicon versions and a UTC verification date.
5. Do not generate during the presentation. Use only the parent's own voice for microphone demonstrations.

## Before enabling paid calls
- Configure META_API_KEY, META_MODEL, and the documented META_API_BASE_URL, if different from the existing default.
- Verify the account's actual input/output dollar rates per million tokens; set META_INPUT_USD_PER_MILLION and META_OUTPUT_USD_PER_MILLION accordingly. Include every billable output category in the output rate/bound. Until verified, generation remains paused.
- Shared ceiling: $10 per UTC day, all visitors combined, reset at midnight UTC. The database also enforces $10 as a maximum even if configuration is accidentally raised. Each attempt reserves a conservative worst-case amount before requesting Meta. Reservations remain charged to the app budget even after a failed/unknown response, so the safeguard can stop earlier than the provider's measured spend.
- This is a purpose-built spend ledger, not a general rate-limiting service. It caps Meta generation reservations, not Cloud hosting costs, and depends on verified provider rates and the provider honoring the output-token cap. No provider caching discount is assumed.
- Test one explicit Generate and verify action once credits and credentials are ready. Confirm returned model identity, JSON mode, usage reporting, and full deterministic checks.
- If Meta rejects JSON mode with 400, stop and check the documented account protocol. No automatic alternate endpoint or provider is probed. Set META_JSON_MODE=off only after confirming plain-text mode is supported; all responses still require strict JSON and pass the same schema/verifier. Malformed output consumes an attempt and is never accepted.
- Pre-generate 1–2 accepted passages and reload to verify them again before recording.

## Honesty boundaries
- Provenance records are editable browser artifacts, not server signatures or sealed Parent Records. Model/date/token fields are reported generation metadata; only the displayed linguistic checks are recomputed under current code.
- Decodability is a pattern heuristic, not a validated readability/grade-level measure. A teacher reviews meaning and age appropriateness.
- Voice and reading transcripts never enter Meta generation. Only structured teacher settings and generation-audit diagnostics do.
- Live Meta compatibility, prompt cache hits, and real recorded-voice quality are not established by mock tests.
