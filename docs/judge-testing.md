# Voxarah Capture — judge testing

## Entry
- Judge build: https://id-preview--24954b32-f9c3-4063-8105-7c829a6b7595.lovable.app
- Public repository: https://github.com/Voxarah/accent-aware-reading-lab
- Demo recording: https://www.loom.com/share/ecd5ec249a224d768746ad1f9f3160db
- Passage Studio appears only in the explicitly enabled judge build. The public app never permits generation.
- Use the teacher passcode supplied by the owner in the submission's private testing-instructions field. The owner must copy the passcode they chose there; it is intentionally not recorded in source or public documentation.
- A shared passcode is a gate, not individual user authentication. It grants access to teacher passage preparation only.

## Reliable demo
1. Choose a passage, then Dialect reader. Compare the two prototype word-match scores.
2. Choose Mixed reader: one real difference remains flagged under the AAE profile.
3. Inspect sourced rules and the pronunciation-only, nonclinical scope note.
4. Studio passages are stored in the browser that generated them, so a passage you generated on one machine is not visible on another. To see one on your own screen, unlock Passage Studio with the passcode, press Generate, then open the provenance record: current checks and rule-derived readers are recomputed on page load, with engine and lexicon versions and a UTC verification date. The demo recording shows the same flow.
5. Do not generate during a timed presentation. Use only the parent's own voice for microphone demonstrations.

## Live verification already performed
- **Connection and structured output.** Verified against the live Meta endpoint on `api.meta.ai/v1`. Three consecutive minimal calls returned replies that parsed cleanly into the required `{ text, targets }` shape. No alternate endpoint or provider is probed.
- **Model identity.** The served model ID is read from the API response at runtime and written into the provenance record. No model name is hardcoded in the product. The verified run served `muse-spark-1.3`.
- **Spend ceilings.** $10 shared per UTC day, all visitors combined, reset at midnight UTC, with a separate $40 rolling window cap. Both are enforced atomically in the database before any request reaches Meta. Proven live: with the day's ledger at its limit, pressing Generate stopped before contacting Meta and showed the limit message in Studio, while the static passages kept scoring normally.
- **Measured cost.** Approximately 3.4 cents for a press that verifies on the first attempt, 6 cents when the second attempt is used, and 4.5 cents for the refusal demonstration. The $10 daily ceiling covers roughly 150 presses.
- **Refusal path.** Proven live: the checker's required target count was set one above the maximum a grade 2 passage can hold, so no passage could qualify. Attempt 1 was rejected with diagnostics, attempt 2 received those diagnostics and was rejected again, and the refusal card showed both attempts' reasons. Nothing was saved, badged, or added to the test bench.

## Configuration and spend controls (in place)
- `META_API_KEY`, `META_MODEL`, and `META_API_BASE_URL` are configured as secrets. The model name is never hardcoded.
- Rates are keyed to the served model ID: $1.25 per million input tokens, $4.25 per million output tokens. A response naming a model with no verified rate on file is refused rather than charged blind.
- Each attempt reserves a conservative worst-case amount before requesting Meta. Reservations remain charged to the app budget even after a failed or unknown response, so the safeguard can stop earlier than the provider's measured spend.
- `MAX_OUTPUT_TOKENS` is 8192 because the served model is a reasoning model: a hard request can spend thousands of tokens reasoning before emitting any JSON.
- If Meta rejects JSON mode with 400, stop and check the documented account protocol. No automatic alternate endpoint or provider is probed. Set `META_JSON_MODE=off` only after confirming plain-text mode is supported; all responses still require strict JSON and pass the same schema and verifier. Malformed output consumes an attempt and is never accepted.
- This is a purpose-built spend ledger, not a general rate-limiting service. It caps Meta generation reservations, not Cloud hosting costs, and depends on verified provider rates and the provider honoring the output-token cap. No provider caching discount is assumed.

## Honesty boundaries
- Provenance records are editable browser artifacts, not server signatures or sealed Parent Records. Model/date/token fields are reported generation metadata; only the displayed linguistic checks are recomputed under current code.
- Decodability is a pattern heuristic, not a validated readability or grade-level measure. A teacher reviews meaning and age appropriateness.
- Voice and reading transcripts never enter Meta generation. Only structured teacher settings and generation-audit diagnostics do.
- Scores are prototype word-match results, not clinical benchmark or intervention classifications.
- Live Meta compatibility, spend ceilings, and the refusal path are established by live runs on the judge build, listed above. Prompt cache hits are not assumed or discounted. Real recorded-voice quality depends on the recording: the on-device transcriber is only as good as the audio it receives, and a garbled take produces a garbled score.
