<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Accent rules live in src/lib/accent/rules.ts; every rule must cite a published source, unsourced rules are excluded — why: fairness claims must be defensible.
- Reading checks run in the browser; no audio leaves the device — why: child-voice privacy rule.
- Speech-to-text runs in src/lib/audio/whisper.worker.ts (transformers.js, whisper-tiny q8, WebGPU with 3s probe then WASM); never the browser Web Speech API, which streams audio to Google/Apple — why: the privacy claim must survive a judge opening the network tab.
- The worker biases decoding with a vernacular initial_prompt (aks, dis, brover...) — why: whisper otherwise "corrects" dialect spellings into Standard American English before the checker sees them.
- Rule stacking (two rules on one word) lives in checker.ts findRule and only uses coda-edit intermediates — why: keeps stacking narrow so it can't excuse real misreadings.

- Score comparison stays immediately after sample readers and scrolls into view after checks; scores are prototype word-match results, never clinical benchmark or intervention classifications — why: make disparity visible without claiming unvalidated clinical outcomes.
- Passage Studio (src/lib/studio): the Meta model only proposes passage text + tags; verifier.ts (schema, verbatim tags, rule qualification, density, decodability, rule-derived readers) decides, with at most MAX_ATTEMPTS retries fed by diagnostics — why: generated material is never trusted unverified.
- Generated-passage sample readers come from readers.ts (rules applied / planted miscues), never from the model; the model writes no product prose — why: unverified model output must not enter the bench through a side door.
- Studio model name is read from the API response and configured via META_MODEL / META_API_KEY / META_API_BASE_URL secrets, never hardcoded — why: the receipt must name the exact model actually served.
- Studio orchestration is a dependency-injected pure module with server-function guards; unsupported JSON mode stops without hidden retries — why: regression tests must exercise all paid-call control paths without provider spend.
- Revalidate stored candidate and structured parameters on every load; discard legacy records missing these inputs, derive readers anew, and stamp current independent engine/lexicon versions from studio/versions.ts — why: editable browser material must not bypass current rules or claim sealed provenance.
- Bump the engine version for alignment/rule/verifier changes and the lexicon version for pattern/sight-word changes; provenance is unsigned and records current verification separately from claimed generation metadata — why: future recalculations need interpretable version stamps.
- Studio access uses an exact server origin allowlist (now the published app origin), an off-by-default flag, and an encrypted shared-passcode session; localhost is development-only — why: hiding a button is not paid-endpoint protection; the passcode and spend ceiling are the real gate.
- Global spending uses atomic UTC-day reservations in a service-only RLS table, before every provider request; conservative byte-based input and capped output reserves are never refunded on uncertain charges and missing verified pricing fails closed — why: concurrent visitors and process restarts cannot bypass the shared ceiling.
- Studio "Demonstrate refusal" sets demoRefusal: verifier requires word-cap+1 tokens per target and the prompt asks only to maximize, so the real pipeline must refuse without the model burning its output budget deliberating — why: a live, honest refusal for judges with no special-case code path.
