# Implementation Plan: Arithmetic Coder

## Overview

Implement a standalone TypeScript arithmetic (byte-wise range) coder module under `src/arithmetic-coder/`. The plan builds bottom-up: types and utilities first, then the encoder, then the decoder, then the BigInt reference coder, then property and unit tests. Every step integrates immediately with the files created before it so no code is left orphaned.

## Tasks

- [x] 1. Set up project configuration and module skeleton
  - Create `package.json` with:
    - `devDependencies`: `typescript`, `vite`, `vitest`, `fast-check` (and `@vitest/coverage-v8` or similar)
    - `scripts`: `"test": "vitest --run"`, `"typecheck": "tsc --noEmit"`
  - Create `tsconfig.json` with `strict: true`, `target: "ES2020"` (for BigInt), `module: "ESNext"`, `moduleResolution: "bundler"`
  - Create `vitest.config.ts` configured to match `**/*.test.ts` (covers both `*.test.ts` and `*.property.test.ts`)
  - Create `.gitignore` containing `node_modules/` and `dist/` — do NOT add `.kiro` to `.gitignore`
  - Create `LICENSE` file with MIT licence text (copyright holder: Zach Jacobs, year 2026)
  - Create `src/arithmetic-coder/` directory structure with empty barrel files
  - Write `types.ts`: export `FrequencyTable`, `CumulativeTable`, `EncoderOptions`, `DecoderOptions`, `EncoderState`, `DecoderState` interfaces, and the constants `FREQUENCY_TOTAL = 16_777_216`, `DEFAULT_ALPHABET_SIZE = 50_257`
  - Create placeholder `index.ts` that re-exports all public names (fill in as each file is implemented)
  - Confirm TypeScript compiles cleanly (`tsc --noEmit`)
  - _Requirements: 1.3, 3.1, 3.2, 4.1, 5.1, 5.3_

- [x] 2. Implement `validate.ts` and `cumulative.ts`
  - [x] 2.1 Implement `validateFrequencyTable` in `validate.ts`
    - Checks `table.length === alphabetSize`; throws `"FrequencyTable length is <actual>, expected <alphabetSize>"`
    - Checks every entry ≥ 1; throws `"FrequencyTable entry at index <i> is <value>; must be ≥ 1"`
    - Checks sum equals `FREQUENCY_TOTAL`; throws `"FrequencyTable sum is <actual>, expected 16777216 (2^24)"`
    - Accepts `Uint32Array | number[]`
    - _Requirements: 1.4, 1.5, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.2 Implement `buildCumulativeTable` in `cumulative.ts`
    - Accepts `freq: FrequencyTable` and a pre-allocated `buffer: Uint32Array` of length `alphabetSize + 1`
    - Single-pass: validates each entry ≥ 1 while accumulating; checks final sum equals `FREQUENCY_TOTAL`
    - `buffer[0] = 0`, `buffer[i] = freq[0]+…+freq[i-1]`, `buffer[alphabetSize] = FREQUENCY_TOTAL`
    - _Requirements: 1.3, 4.2, 4.3_

  - [x] 2.3 Implement `findSymbol` in `cumulative.ts`
    - Binary search returning `s` such that `cumTable[s] <= value < cumTable[s+1]`
    - _Requirements: 2.1_

  - [x] 2.4 Write unit tests for `validateFrequencyTable` in `validate.test.ts`
    - Wrong length (too short, too long)
    - Zero-frequency entry at index 0 and at a mid-table index
    - Sum too low, sum too high, sum off by 1
    - Valid `Uint32Array` and valid `number[]` both accepted
    - _Requirements: 1.4, 1.5, 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Implement `encoder.ts`
  - [ ] 3.1 Implement internal state and `emitByte` helper
    - Fields: `low = 0`, `range = 2**47`, `cache` (uninitialised sentinel `-1`), `carry = 0`, `output: number[]`, `_deepCarryCount = 0`
    - `emitByte(byte)`: on first call set `cache = byte`; on subsequent calls if `byte < 0xFF` flush `cache` + `carry` × `0xFF` bytes then set new `cache`; if `byte === 0xFF` increment `carry`
    - No bitwise operators (`<<`, `>>`, `&`, `|`, `^`); use `*`, `Math.floor`, `%` throughout
    - _Requirements: 1.1, 1.3, 3.1, 3.2, 3.3_

  - [ ] 3.2 Implement `propagateCarry` helper
    - Assert `cache !== -1` (carry cannot arrive before first byte extracted)
    - On every call: increment `_carryCount`
    - If `carry === 0`: `cache = cache + 1`
    - If `carry >= 1`: push `cache + 1`, push `carry - 1` × `0x00` bytes, set `cache = 0x00`, `carry = 0`
    - If `carry >= 2` before reset: also increment `_deepCarryCount`
    - Expose `get carryCount(): number` (test-only accessor, not exported from `index.ts`)
    - Expose `get deepCarryCount(): number` (test-only accessor, not exported from `index.ts`)
    - _Requirements: 1.1, 3.4_

  - [ ] 3.3 Implement `step(symbol, freqTable)` on `ArithmeticEncoder`
    - Call `buildCumulativeTable(freqTable, cumulativeBuffer)` (single-pass validate+accumulate)
    - Guard `symbol` in `[0, alphabetSize−1]`; throw `"Symbol <value> is out of range [0, <alphabetSize-1>]"` otherwise
    - Guard that `finish()` has not been called; throw `"Cannot call step() after finish()"` otherwise
    - Moffat divide-first: `r = Math.floor(range / FREQUENCY_TOTAL)`, `low += r * cumLow`, `range = r * (cumHigh - cumLow)`
    - Carry detection: if `low >= 2**48` subtract `2**48` and call `propagateCarry()`
    - Renorm loop: while `range < 2**40` extract top byte via `Math.floor(low / 2**40)`, call `emitByte`, then `low = (low % 2**40) * 256`, `range = range * 256`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3_

  - [ ] 3.4 Implement `finish()` on `ArithmeticEncoder`
    - Emit top 6 bytes of `low` via 6 `emitByte` calls (byte at position `i` = `Math.floor(low / 2**(i*8)) % 256` for `i` from 5 downto 0)
    - Final flush: if `cache !== -1` push `cache` then push `carry` × `0xFF` bytes
    - Return `Uint8Array.from(output)`
    - Mark encoder as flushed; subsequent `step()` calls throw
    - _Requirements: 1.1, 6.1_

  - [ ] 3.5 Write unit tests for `ArithmeticEncoder` in `encoder.test.ts`
    - Empty sequence encodes without throwing
    - Single symbol round-trips (decode in task 5)
    - Symbol out of range throws with correct message
    - `step()` after `finish()` throws with correct message
    - Invalid table (zero entry, wrong sum, wrong length) throws before any state mutation
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

- [ ] 4. Implement `decoder.ts`
  - [ ] 4.1 Implement constructor and 6-byte priming
    - Fields: `range = 2**47`, `code = 0`, `pos = 0`, `input: Uint8Array`
    - Priming loop: `for i in 0..5: code = code * 256 + (input[i] ?? 0x00)`, `pos = 6`
    - Virtual zero padding when `input.length < 6`
    - Pre-allocate `cumulativeBuffer: Uint32Array` of length `alphabetSize + 1`
    - No bitwise operators
    - _Requirements: 2.1, 2.3_

  - [ ] 4.2 Implement `step(freqTable)` on `ArithmeticDecoder`
    - Call `buildCumulativeTable(freqTable, cumulativeBuffer)`
    - `r = Math.floor(range / FREQUENCY_TOTAL)`
    - `offset = Math.min(Math.floor(code / r), FREQUENCY_TOTAL - 1)`
    - `symbol = findSymbol(cumTable, offset)`
    - `code = code - r * cumLow`, `range = r * (cumHigh - cumLow)`
    - Renorm loop: while `range < 2**40`, read `nextByte = pos < input.length ? input[pos++] : 0x00`, `code = (code % 2**40) * 256 + nextByte`, `range = range * 256`
    - Return `symbol`
    - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3_

  - [ ] 4.3 Implement `static batchDecode(...)` on `ArithmeticDecoder`
    - Instantiate a `ArithmeticDecoder`, call `step()` `symbolCount` times with `tableSupplier(i)`, return results as `number[]`
    - _Requirements: 2.1, 7.1_

  - [ ] 4.4 Write unit tests for `ArithmeticDecoder` in `decoder.test.ts`
    - Decoding an empty-sequence compressed output returns empty array
    - `batchDecode` matches incremental decode for the same input
    - Input shorter than 6 bytes primes without throwing (virtual zero padding)
    - Invalid table throws before any symbol is returned
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4_

- [ ] 5. End-to-end round-trip unit tests in `encoder.test.ts` / `decoder.test.ts`
  - [ ] 5.1 Single-symbol encode→decode round-trip for each symbol in a 4-symbol alphabet
    - _Requirements: 1.1, 2.1_

  - [ ] 5.2 10,000-symbol uniform round-trip and 2% efficiency check
    - Uniform table (each entry = `FREQUENCY_TOTAL / alphabetSize`), 4 symbols, 10,000 symbols
    - Assert round-trip succeeds
    - Assert bit length within 2% of `N × log2(alphabetSize)` where N = 10,000
    - _Requirements: 6.2_

  - [ ] 5.3 Full 50,257-symbol alphabet targeted cases
    - Build the uniform 50,257-symbol table as `Math.floor(FREQUENCY_TOTAL / 50_257)` per entry with the remainder `FREQUENCY_TOTAL - Math.floor(FREQUENCY_TOTAL / 50_257) * 50_257` added to the last entry
    - Case 1: single step with that uniform table, verify round-trip
    - Case 2: 10 symbols with a peaked table (one dominant symbol ≈ 99% mass), verify round-trip
    - Case 3: 500-symbol sequence spread across the full alphabet (must include symbols 0 and 50,256), verify round-trip; apply a 30-second timeout to this test case
    - _Requirements: 7.4, 7.5_

- [ ] 6. Checkpoint — ensure all tests pass
  - Run `vitest --run` and confirm all unit tests pass. Ask the user if any test fails and resolution is unclear.

- [ ] 7. Implement `carry.test.ts` with seeded-search pinned carry vector
  - [ ] 7.1 Seeded search for a deepCarry input
    - Use alphabetSize = 4 with the uniform table (each entry = `FREQUENCY_TOTAL / 4 = 4_194_304`)
    - Iterate over seeded random sequences of up to 200 symbols until `deepCarryCount >= 1`
    - Pin the first triggering sequence as a fixed literal in the test file
    - _Requirements: 3.4_

  - [ ] 7.2 Assert deepCarry and round-trip on the pinned vector
    - Assert `enc.deepCarryCount >= 1` after encoding the pinned sequence
    - Assert `decode(encode(pinned)) === pinned`
    - Assert the production output for the pinned sequence equals `BigIntReferenceCoder.encode(pinned, ...)` byte for byte
    - _Requirements: 1.1, 3.4, 7.6_

- [ ] 8. Implement `reference-coder.ts` (`BigIntReferenceCoder`)
  - [ ] 8.1 Implement `BigIntReferenceCoder.encode`
    - BigInt state: `low = 0n`, `range = 2n**47n`, `k = 0`
    - Per symbol: `r = range / BIG_TOTAL` (BigInt division), `low += r * BigInt(cumLow)`, `range = r * BigInt(cumHigh − cumLow)`
    - Renorm: while `range < 2n**40n`, `low = low * 256n`, `range = range * 256n`, `k++`
    - Finish: serialize `low` as exactly `k + 6` big-endian bytes, zero-padded on the left
    - _Requirements: 3.4, 7.6_

  - [ ] 8.2 Implement `BigIntReferenceCoder.decode`
    - BigInt decode follows the same relative-code algorithm as the production decoder but uses BigInt registers; used to verify `encode` output independently
    - _Requirements: 3.4, 7.6_

- [ ] 9. Write property-based tests (fast-check)
  - [ ] 9.1 Implement shared fast-check generators
    - `freqTableArb(alphabetSize)`: random positive entries normalised to `FREQUENCY_TOTAL`
    - `lmShapedTableArb(alphabetSize)`: one dominant symbol ~90% mass, all others = 1
    - Export from a shared `generators.ts` test helper (or inline in each file)
    - _Requirements: 7.3_

  - [ ] 9.2 Write Property 1 (round-trip) in `round-trip.property.test.ts`
    - `fc.integer({ min: 4, max: 256 })` → sequences up to length 200 with both `freqTableArb` and `lmShapedTableArb`
    - Explicit examples: empty sequence, single symbol, 1024 identical symbols, full-alphabet cycle
    - Assert `decode(encode(seq)) === seq` for all runs
    - **Property 1: Round-trip losslessness**
    - **Validates: Requirements 1.1, 2.1, 7.1**

  - [ ] 9.3 Write Property 2 (efficiency) in `efficiency.property.test.ts`
    - Non-empty sequences with both frequency table generators
    - Assert bit length ≤ `Theoretical_Minimum + 64 + N / 1000`
    - **Property 2: Compression efficiency bound**
    - **Validates: Requirements 6.1, 7.2**

  - [ ] 9.4 Write Property 3 (reference-parity) in `reference-parity.property.test.ts`
    - `fc.integer({ min: 4, max: 16 })`, sequences 1–50 symbols, `freqTableArb` only
    - Assert `Array.from(prod) deepEqual Array.from(ref)`
    - After `fc.assert` completes, assert `totalCarryCount >= 1`
    - **Property 3: Reference-parity (production equals BigInt oracle)**
    - **Validates: Requirements 3.4, 7.6**

  - [ ] 9.5 Write Property 4 (validation rejects) in `validation.property.test.ts`
    - Generate tables with wrong length, a zero entry, or wrong sum
    - Assert `validateFrequencyTable` throws, and both `encoder.step()` and `decoder.step()` throw before mutating state
    - **Property 4: Validation rejects invalid tables**
    - **Validates: Requirements 1.4, 1.5, 4.1, 4.2, 4.3, 4.4**

  - [ ] 9.6 Write Property 5 (decoder termination) in `termination.property.test.ts`
    - `fc.uint8Array()` for compressed bytes, random symbol count in `[1, 50]`, alphabetSize in `[4, 256]`
    - Assert each `step()` call returns a value in `[0, alphabetSize − 1]` without throwing a range error
    - **Property 5: Decoder termination and safety**
    - **Validates: Requirements 2.3**

- [ ] 10. Final checkpoint — ensure all tests pass
  - Run `vitest --run` and confirm all unit and property tests pass. Ask the user if any test fails and resolution is unclear.

## Notes

- No bitwise operators (`<<`, `>>`, `&`, `|`, `^`) anywhere in `encoder.ts`, `decoder.ts`, or `cumulative.ts`; use `* 256`, `Math.floor(x / 256)`, `x % 256` etc. throughout
- The `deepCarryCount` accessor on `ArithmeticEncoder` is test-only and must not appear in `index.ts` exports
- `BigIntReferenceCoder` must not be exported from `index.ts`
- The combined validate-and-accumulate pass in `buildCumulativeTable` is used by both encoder and decoder; `validateFrequencyTable` performs a separate standalone pass for external callers
- Each property test uses `numRuns: 100`; add explicit edge-case examples via `fc.assert(..., { examples: [...] })`
- Property test files use `*.property.test.ts` naming convention

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["3.3"] },
    { "id": 5, "tasks": ["3.4", "3.5"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["4.2"] },
    { "id": 8, "tasks": ["4.3", "4.4"] },
    { "id": 9, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 10, "tasks": ["6"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2"] },
    { "id": 13, "tasks": ["7.1"] },
    { "id": 14, "tasks": ["7.2"] },
    { "id": 15, "tasks": ["9.1"] },
    { "id": 16, "tasks": ["9.2", "9.3", "9.5", "9.6"] },
    { "id": 17, "tasks": ["9.4"] },
    { "id": 18, "tasks": ["10"] }
  ]
}
```
