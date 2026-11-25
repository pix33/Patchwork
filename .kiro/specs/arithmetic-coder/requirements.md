# Requirements Document

## Introduction

The arithmetic coder is a standalone TypeScript module that compresses a sequence of symbols into a compact bitstream and decompresses it back to the original sequence without loss. It uses exact whole-number arithmetic throughout — no floating-point operations — so that the encoder and decoder produce identical results in every JavaScript engine. The coder accepts a 50,257-symbol alphabet (matching DistilGPT-2's vocabulary) by default, but Alphabet_Size is a configurable parameter. The coder works with per-symbol frequency tables whose values sum to exactly 2^24. The module has no dependency on any language model; it can be exercised with synthetic frequency tables.

> **Rationale (corruption handling):** An arithmetic decoder cannot detect data corruption. Criteria that required the Decoder to detect modified bytes have been removed. A separate file-format spec will handle integrity verification with a SHA-256 check.

## Glossary

- **Arithmetic_Coder**: The TypeScript module implementing both the encoder and the decoder.
- **Encoder**: The component of the Arithmetic_Coder that maps a symbol sequence plus frequency tables to a compressed byte array.
- **Decoder**: The component of the Arithmetic_Coder that maps a compressed byte array plus frequency tables back to the original symbol sequence, operating one symbol at a time via the Decoder_Step interface.
- **Symbol**: An integer in the range [0, Alphabet_Size − 1] representing one element of the alphabet.
- **Alphabet_Size**: A configurable positive integer parameter specifying the vocabulary size. Defaults to 50,257 (matching DistilGPT-2's vocabulary). All Frequency_Tables supplied to a given encode or decode session must have exactly Alphabet_Size entries.
- **Frequency_Table**: An array of Alphabet_Size positive integers (each at least 1) that sum to exactly 2^24 (16,777,216). One table is supplied per encoding/decoding step.
- **Frequency_Total**: The fixed sum of all entries in a Frequency_Table, equal to 2^24 (16,777,216).
- **Interval**: The half-open range [low, high) maintained internally by both the Encoder and Decoder during processing.
- **Compressed_Output**: The byte array produced by the Encoder.
- **Theoretical_Minimum**: The ideal compressed size in bits, equal to the sum of −log₂(freq[s] / Frequency_Total) for each symbol s in the sequence.
- **Whole-Number_Arithmetic**: Computation using only integer addition, subtraction, multiplication, division (truncating) and comparison — no calls to `Math.exp`, `Math.log`, `Math.pow` or any floating-point transcendental function.
- **Codec_State**: The internal register state (low, high, pending bits) held by the Encoder or Decoder between symbols.
- **Encoder_Step**: The incremental interface on the Encoder that accepts one Symbol and its corresponding Frequency_Table and updates the Codec_State, emitting output bytes as needed.
- **Decoder_Step**: The incremental interface on the Decoder that accepts one Frequency_Table and returns the next decoded Symbol, consuming bytes from the Compressed_Output as needed. The caller supplies the Frequency_Table for symbol N only after receiving symbol N−1 from a prior Decoder_Step call.

## Requirements

### Requirement 1: Encode a symbol sequence

**User Story:** As a developer integrating the arithmetic coder into a compression pipeline, I want to encode a sequence of symbols with per-symbol frequency tables so that I receive a compact byte array.

#### Acceptance Criteria

1. WHEN the Encoder is given a non-empty sequence of Symbols and a corresponding sequence of Frequency_Tables, THE Arithmetic_Coder SHALL produce a Compressed_Output byte array.
2. WHEN the Encoder is given an empty symbol sequence and a valid Frequency_Table, THE Arithmetic_Coder SHALL produce a valid Compressed_Output that the Decoder can decode to an empty sequence.
3. THE Arithmetic_Coder SHALL perform all Interval arithmetic using Whole-Number_Arithmetic only, with no calls to floating-point transcendental functions.
4. WHEN a Frequency_Table whose values do not sum to exactly Frequency_Total is supplied to the Encoder, THE Arithmetic_Coder SHALL throw an error identifying the table as invalid.
5. WHEN a Frequency_Table containing a zero or negative frequency is supplied to the Encoder, THE Arithmetic_Coder SHALL throw an error identifying the offending entry.
6. WHEN a Symbol outside [0, Alphabet_Size − 1] is supplied to the Encoder, THE Arithmetic_Coder SHALL throw an error identifying the out-of-range value.

### Requirement 2: Decode a compressed byte array

**User Story:** As a developer integrating the arithmetic coder into a decompression pipeline, I want to decode a compressed byte array with the same frequency tables used during encoding so that I recover the original symbol sequence exactly.

#### Acceptance Criteria

1. WHEN the Decoder is initialised with a Compressed_Output produced by the Encoder and the caller invokes Decoder_Step once per symbol — supplying the Frequency_Table for symbol N only after receiving symbol N−1 — THE Arithmetic_Coder SHALL return each Symbol identical to the original, in order.
2. WHEN the Decoder is given a Compressed_Output produced from an empty sequence, THE Arithmetic_Coder SHALL return an empty array.
3. FOR ANY byte array and any requested symbol count, THE Decoder SHALL terminate, SHALL NOT read out of bounds, and SHALL either return exactly that many symbols or throw.

### Requirement 3: Whole-number arithmetic constraint

**User Story:** As an engineer maintaining determinism across JavaScript engines, I want the coder to use only integer operations so that the same input always produces the same output on any conforming JS runtime.

#### Acceptance Criteria

1. THE Arithmetic_Coder SHALL compute all Interval updates and frequency lookups using Whole-Number_Arithmetic only.
2. EVERY intermediate value in the Encoder and Decoder SHALL be exactly representable, either as a JavaScript integer below 2^53 or as a BigInt, and the design SHALL document this constraint for the largest possible product (interval range × maximum frequency).
3. THE Arithmetic_Coder SHALL NOT call `Math.exp`, `Math.log`, `Math.pow`, `Math.sqrt`, or any other floating-point transcendental function inside encoding or decoding loops.
4. FOR ANY pair of identical inputs (symbol sequence and Frequency_Tables), THE Arithmetic_Coder SHALL produce the same Compressed_Output on every invocation in every conforming JavaScript engine.

### Requirement 4: Alphabet and frequency table contract

**User Story:** As a developer supplying frequency tables derived from a language model, I want the coder to enforce a clear contract on table shape so that integration bugs are caught at the boundary.

#### Acceptance Criteria

1. THE Arithmetic_Coder SHALL accept Frequency_Tables with exactly Alphabet_Size entries, where Alphabet_Size is the value configured for the current encode or decode session.
2. THE Arithmetic_Coder SHALL require each entry in a Frequency_Table to be a positive integer of at least 1.
3. THE Arithmetic_Coder SHALL require the sum of all entries in a Frequency_Table to equal exactly Frequency_Total (2^24).
4. WHEN a caller supplies a Frequency_Table with fewer or more entries than the configured Alphabet_Size, THE Arithmetic_Coder SHALL throw an error identifying the table's actual length.

### Requirement 5: Model independence

**User Story:** As a developer writing unit and property tests, I want the coder to be fully exercisable with synthetic frequency tables so that I can verify its correctness without loading any language model.

#### Acceptance Criteria

1. THE Arithmetic_Coder SHALL export its encode and decode functions independently of any model-loading code.
2. THE Arithmetic_Coder SHALL accept any valid Frequency_Table, including uniform tables, random tables, and tables with one dominant symbol, without requiring a live model.
3. THE Arithmetic_Coder SHALL have no import-time side effects that require network access, file system access, or a loaded model.

### Requirement 6: Compression efficiency

**User Story:** As a developer verifying that the coder is working correctly, I want its output to be close to the information-theoretic minimum so that I can confirm the coder is not wasting bits.

#### Acceptance Criteria

1. FOR ANY non-empty symbol sequence and any valid Frequency_Tables, THE Arithmetic_Coder SHALL produce a Compressed_Output whose bit length is at most the Theoretical_Minimum plus a fixed overhead of no more than 64 bits (accounting for Codec_State flushing) plus the number of symbols divided by 1,000.
2. WHEN encoding a sequence of N of at least 10,000 symbols drawn uniformly from a Frequency_Table with equal frequencies, THE Arithmetic_Coder SHALL produce a Compressed_Output whose bit length is within 2% of N × log₂(Alphabet_Size).

### Requirement 7: Property-based test coverage

**User Story:** As a developer verifying coder correctness under arbitrary inputs, I want a property-based test suite using fast-check so that edge cases are found automatically without enumerating them by hand.

#### Acceptance Criteria

1. THE test suite SHALL include a round-trip property: FOR ANY valid symbol sequence and Frequency_Tables generated by fast-check, the caller SHALL encode the sequence using Encoder_Step, then decode it using Decoder_Step — supplying each symbol's Frequency_Table only after the previous symbol has been returned — and the decoded sequence SHALL equal the original. A batch convenience wrapper around Decoder_Step MAY be used in tests.
2. THE test suite SHALL include an efficiency property: FOR ANY valid symbol sequence and Frequency_Tables, the Compressed_Output bit length SHALL satisfy the bound in Requirement 6 Criterion 1.
3. THE test suite SHALL generate Frequency_Tables synthetically (not from a language model) using fast-check's integer generators, with each entry at least 1 and the total normalised to exactly Frequency_Total.
4. THE test suite SHALL cover edge cases including: single-symbol sequences, sequences of length 1,024, sequences whose symbols are all identical, and sequences that cycle through every symbol in the alphabet.
5. THE test suite SHALL use small alphabets (4–256 symbols) for the majority of generated cases and the full 50,257-symbol alphabet only for a small number of targeted cases, so that fast-check can explore more combinations within the time budget.
6. THE test suite SHALL include a reference-parity property: FOR ANY valid symbol sequence and Frequency_Tables on small inputs, a simple BigInt reference coder and the production implementation SHALL produce identical Compressed_Output for the same symbol sequence and Frequency_Tables.
