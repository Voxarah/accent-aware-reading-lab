# Accent-Aware Reading Lab

A reading-fluency bench that separates *decoding errors* from *accent differences* when a child reads aloud. A struggling reader who says "tes" for "test" (a dialect feature) is scored differently from one who genuinely misreads the word — and every excusal is tied to a published linguistics source.

Built for the Meta hackathon, November 2026.

## What it does

- **Reading checks in the browser.** A passage is checked two ways: a literal word-match check, and the accent-aware check which excuses differences that match documented pronunciation rules of the reader's accent profile (e.g. Southern US, African American Vernacular English, General American).
- **Contrastive disparity panel.** Both scores are shown side by side so the disparity is visible, never hidden.
- **On-device speech-to-text.** Voice readings are transcribed with Whisper running entirely in the browser (WebGPU with WASM fallback). No audio ever leaves the device — the privacy claim holds with the network tab open.
- **Every rule cites a source.** Each accent rule carries a published citation with a link (DOI or WorldCat). Rules without a published source are excluded from the codebase.
- **Passage Studio (teacher-gated).** Meta's model proposes practice passages; a deterministic verifier built on the published rules accepts or rejects them. The model never self-certifies its output: every passage is checked for target-sound density, word count, grade level, and decodability before it can be used. When no passage can pass, the studio refuses and shows both attempts' diagnostics. Model name, token counts, and cost per call are logged and surfaced.

## Privacy

A child's audio never leaves the device. Transcription is on-device; there is no server-side audio path and no third-party speech API.

## Tech

- React 19 + TanStack Start (Vite), Tailwind CSS v4
- On-device Whisper via transformers.js (WebGPU, WASM fallback)
- Lovable Cloud (hosted database and auth) — publishable keys only in the client
- Meta API for Passage Studio generation, verified server-side

## Judge instructions

See [docs/judge-testing.md](docs/judge-testing.md). The teacher passcode for Passage Studio is supplied separately in the submission's private testing notes.

## Running locally

```bash
npm install
npm run dev
```

## Tests

```bash
npx vitest run
```

## License

MIT — see [LICENSE](LICENSE).
