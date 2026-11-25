# Determinism rules

These rules exist because the project's correctness guarantee — decompression reproduces the exact original — depends on compression and decompression producing identical prediction sequences. Any divergence between the two sides, however small, corrupts the output.

## Whole-number arithmetic in the coder

The arithmetic coder must use exact integer arithmetic only. No floating-point values, no calls to `Math.exp`, `Math.log`, `Math.pow`, `Math.sqrt`, or any other transcendental function, may appear in the coder's encode or decode paths. The only permitted operations are addition, subtraction, multiplication, integer division (truncating), modulo and comparison.

This rule applies to the coder in `src/coder/`. It does not apply to the benchmark page's display calculations or to unrelated UI code.

## Whole-number frequency conversion

Converting the model's raw logit scores into symbol frequencies must also use only the integer-safe operations above. The conversion steps are:

1. Subtract the maximum logit to shift the range (integer or fixed-point arithmetic; no `exp`).
2. Round the shifted scores to a fixed grid recorded in the file header, reducing sensitivity to tiny numerical differences between runs.
3. Scale and clamp to produce whole-number frequencies summing to exactly the fixed total (a power of two, minimum 2^24).
4. Assign every token a frequency of at least 1 before the final scaling, so no token is unencodable.

If steps 1–4 require intermediate values larger than a 32-bit integer, use BigInt or explicit 53-bit-safe integer arithmetic; document the choice.

## One shared prediction function

Compression and decompression must call the same function — the single export from `src/engine/predict.ts` — in the same order, fed the same token sequence. No separate fast-path, batch-inference path, or cached logit shortcut may be used during compression that is unavailable during decompression. Any optimisation that changes the token-by-token prediction values is forbidden.

This rule is verified by the pipeline property tests: `decompress(compress(x)) === x` must hold for arbitrary inputs.

## CPU-only model execution

The ONNX Runtime Web execution provider must be set to `wasm` (WebAssembly / CPU). The `webgl`, `webgpu` and `dml` providers are forbidden because GPU floating-point arithmetic is not guaranteed to be bit-identical across GPU models or driver versions, even on the same machine. This applies to both the compression and decompression workers.

## Context reset schedule

The model context is reset after a fixed number of tokens (the block size, default 1,024, stored in the file header). Both compression and decompression must reset at exactly the same token positions. The block size is written to the header by the compressor and read back by the decompressor; it is never hardcoded in the decompression path.
