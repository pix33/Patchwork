# Repository structure

```
patchwork/
├── .kiro/
│   ├── steering/          # These files
│   ├── specs/             # Kiro-generated specs (requirements, design, tasks)
│   └── hooks/             # Automated hooks (round-trip tests on save, size check on commit)
├── src/
│   ├── coder/             # Arithmetic coder — no model dependency
│   │   ├── encoder.ts
│   │   ├── decoder.ts
│   │   └── coder.test.ts  # Unit + property tests (fast-check)
│   ├── engine/            # Prediction engine: model loading, shared predict function, frequency conversion
│   │   ├── model.ts
│   │   ├── predict.ts     # The one shared prediction function (see determinism.md)
│   │   ├── frequencies.ts # Score → whole-number frequency conversion
│   │   └── engine.test.ts
│   ├── format/            # .pw file header: serialise, parse, validate
│   │   ├── header.ts
│   │   └── format.test.ts
│   ├── pipeline/          # Compression and decompression pipelines; wires coder + engine + format
│   │   ├── compress.ts
│   │   ├── decompress.ts
│   │   └── pipeline.test.ts
│   ├── worker/            # Web Worker entry point; handles cancel, progress messages
│   │   └── worker.ts
│   ├── ui/                # React (or plain TS) components: drop zone, progress bar, results, benchmark page
│   └── main.ts            # App entry point
├── model/                 # Model and tokenizer files (committed once, never updated)
│   ├── onnx/
│   │   └── decoder_model_merged_quantized.onnx
│   └── tokenizer/         # tokenizer.json, vocab.json, merges.txt, etc.
├── samples/               # Fixed sample texts for the benchmark
├── benchmark/             # Benchmark script (regenerates results) and committed result files
├── docs/
│   └── requirements-brief.md
├── FORMAT.md
├── THIRD_PARTY.md
├── LICENSE                # MIT
└── README.md
```

## Module boundaries

- `coder/` has no imports from `engine/`, `format/`, `pipeline/` or `ui/`. It is independently testable with synthetic frequency tables.
- `engine/` has no imports from `coder/`, `format/`, `pipeline/` or `ui/`.
- `format/` has no imports from `coder/`, `engine/`, `pipeline/` or `ui/`.
- `pipeline/` imports from `coder/`, `engine/` and `format/`, but not from `ui/` or `worker/`.
- `worker/` imports from `pipeline/` only.
- `ui/` imports from `pipeline/` and `format/` for display purposes.

Keeping these boundaries clean makes it possible to test each layer with synthetic inputs and to swap the model without touching the coder.

## Naming conventions

- Files: `kebab-case.ts` for all source files.
- Exports: named exports only; no default exports.
- Tests: co-located with the module they test, suffix `.test.ts`.
- Types: in the same file as the code they describe unless shared across modules, in which case a `types.ts` in the nearest common directory.
