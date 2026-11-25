# Tech stack

## Languages and build tools

- **TypeScript** throughout — no plain JavaScript source files.
- **Vite** for development server and production build. Static output only; no server-side code.
- **Vitest** as the test runner.
- **fast-check** for property-based tests. The property tests listed in the requirements brief (coder round trip, coder efficiency, frequency conversion, tokenizer round trip, full round trip, header round trip, corruption detection, block independence) must each be a fast-check property, not a hand-written example loop.

## Model runtime

- **ONNX Runtime Web** (`onnxruntime-web`) runs the DistilGPT-2 model on the WebAssembly execution provider. The GPU/WebGL/WebGPU providers must not be used; see `determinism.md`.
- **Transformers.js** (`@xenova/transformers`) handles the tokenizer. Confirm current API against the installed version before writing engine code.

## Model file

- `Xenova/distilgpt2`, file `onnx/decoder_model_merged_quantized.onnx` (~85 MB). Committed once to the repo; never replaced or re-committed.
- Tokenizer files (~2 MB) committed alongside the model.
- The model is loaded from the same origin as the app, never from a CDN or Hugging Face at runtime.

## Background execution

Compression and decompression run in a Web Worker so the main thread stays responsive. The worker communicates progress (percentage, tokens/s, ETA) and responds to cancel messages.

## Conventional compression (fallback)

Use the browser's native `CompressionStream` API for the gzip fallback. For the benchmark page's additional formats (zip, xz, zstd, brotli), use a well-licensed WebAssembly library; check that its licence is compatible with MIT before adding it.

## Hashing

Use `SubtleCrypto.digest('SHA-256', …)` for the original-file and model-file hashes stored in the `.pw` header.

## Repo size

An automated check must refuse commits that would push the repo past 100 MB. Run this check in a pre-commit hook.

## Commands (to be documented in README)

- `npm install` — install dependencies.
- `npm run dev` — start development server.
- `npm run build` — production build to `dist/`.
- `npm test` — run unit and property tests.
- `npm run benchmark` — regenerate benchmark results.

## Licensing

Application code: MIT (`LICENSE`). Third-party components listed in `THIRD_PARTY.md` with their licences and sources.
