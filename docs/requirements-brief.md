# Patchwork: requirements brief

*Working title. Kiroween 2026 entry, Frankenstein category. Written 25 November 2026, updated the same day with measured compression results.*

This is the input brief for Kiro. Paste it (or point Kiro at it) when starting spec-driven development, and let Kiro generate its own `requirements.md`, `design.md` and `tasks.md` under `/.kiro/specs/`. Do not hand-write those files: the contest judges how Kiro was used, and the write-up must describe that honestly. If this brief stays in the repo, say in the write-up that it was drafted with outside help before the Kiro build.

## 1. What we are building

Patchwork is a browser app that compresses plain text to a smaller size than zip, gzip or xz. It does this by stitching two things together:

- a small language model (DistilGPT-2) that predicts the next piece of text, and
- an arithmetic coder, a 1970s technique that turns good predictions into few bits.

The better the model predicts the text, the smaller the output. Everything runs locally in the browser. Nothing is uploaded.

**The one claim the project makes:** on English text, Patchwork output is smaller than gzip, zip and xz output, and decompresses to a byte-for-byte identical file on the same machine and browser.

**What it does not claim:** that it is fast, that it works on photos, video or already-compressed files, or that a file compressed on one device will decompress on another.

## 2. Contest constraints that shape the design

| Constraint | Source | Consequence |
|---|---|---|
| Submission deadline 4 December 2026, 2:00 pm Pacific | Official rules | Aim to submit 3 December |
| Project must be newly created with Kiro | Official rules | All application code is produced through Kiro |
| Public GitHub repo with an open-source licence visible in the About section | Official rules | MIT licence for our code |
| `/.kiro` directory at repo root, not in `.gitignore` | Official rules | Specs, steering and hooks are committed |
| Repo must contain all source, assets and instructions needed to run | Official rules | Model files are committed to the repo |
| The whole project lives in one repo of under 100 MB | Our decision | One model file of about 85 MB, committed exactly once; everything else fits in the remaining 10 MB |
| Working app URL, free to use through 29 January 2027 | Official rules | Static hosting, no server |
| Demo video under three minutes, public on YouTube | Official rules | The live demo must finish in well under a minute |
| Third-party components must be properly licensed and disclosed | Official rules | Model and libraries listed in `THIRD_PARTY.md` |

## 3. The model

Facts checked on 25 November 2026 against the Hugging Face model pages:

- **Chosen model:** DistilGPT-2, using the ready-made browser file `onnx/decoder_model_merged_quantized.onnx` from the `Xenova/distilgpt2` repo. It is 84,911,479 bytes (about 85 MB).
- **Licence:** the original model (`distilbert/distilgpt2`) is Apache 2.0. The `Xenova` conversion repo states no licence of its own, so `THIRD_PARTY.md` should cite the original.
- **Shape:** 50,257-token vocabulary, 1,024-token context, 6 layers.
- **Tokenizer files:** about 2 MB.

**Why not SmolLM2-135M:** its smallest ready-made file is 117,691,126 bytes, and the CPU-friendly 8-bit file is about 137 MB. Neither fits a repo of under 100 MB.

**Fallback model:** Pythia-70m (`Xenova/pythia-70m`, `onnx/model_int8.onnx`, 71,442,000 bytes). It is smaller but likely a weaker predictor, and its licence has not been checked.

**Repo size budget:** model 85 MB, tokenizer 2 MB, leaving roughly 10 MB for code, sample texts, benchmark results and images. Git keeps every version of every file, so the model must be committed once and never replaced. Swapping models means starting a fresh repo.

### Measured compression (25 November 2026)

Before any build work, the real 85 MB model file was run over four sample texts and the information content of every token was added up. That gives the size an arithmetic coder would produce, plus 100 bytes allowed for a file header. Sizes are in bytes. "Best conventional" is the smallest of gzip, zip, bzip2, xz, zstd and brotli at their strongest settings.

| Sample | Original | zip | xz | Best conventional | Model estimate | vs zip | vs best |
|---|---|---|---|---|---|---|---|
| Original screenplay scene, written 25 November 2026 | 4,265 | 1,861 | 1,848 | 1,441 (brotli) | 1,010 | 54% | 70% |
| Wikipedia, "2026 FIFA World Cup" | 43,795 | 16,392 | 15,328 | 13,001 (brotli) | 6,185 | 38% | 48% |
| *The Importance of Being Earnest* | 117,987 | 42,903 | 38,404 | 34,333 (bzip2) | 22,650 | 53% | 66% |
| *Alice's Adventures in Wonderland* | 151,095 | 53,425 | 47,652 | 42,684 (bzip2) | 28,360 | 53% | 66% |

What this settled:

- **The claim holds.** The estimate beat every conventional compressor on every sample.
- **Restarting every 1,024 tokens is fine.** Carrying 512 tokens of context across restarts improved results by only about 2%, at double the computing cost. Use the plain restart.
- **Short inputs do best.** On the first 5 KB of each text the estimate was 33–48% of gzip's size.
- **The tokenizer reproduced all four texts exactly.**
- **Whole-number frequencies cost almost nothing.** Rounding probabilities to a total of 2^24 added under 0.1%.
- **Screenplay indentation is expensive.** The scene needed 1,967 tokens for 4,265 bytes, against about 1,000 for prose of that size. Handling runs of spaces before the model sees them is a possible stretch improvement.

What it did not settle:

- **These are calculated sizes, not compressed files.** No coder exists yet.
- **Two samples may be memorised.** The model could have seen *Alice* and *Earnest* in training. The screenplay and the Wikipedia text are the fair tests.
- **The screenplay sample is small and AI-written,** which may make it more predictable than a human script.
- **Speed in the browser and exact repeatability are untested.**

The measurement script was not built with Kiro. It lives in `feasibility/`, outside the contest repo, and must stay out of the repo or be disclosed as pre-existing work.

## 4. Requirements

Written in the "WHEN / THE SYSTEM SHALL" form Kiro uses for acceptance criteria.

### R1. Compress a text file

*As a user, I want to drop a text file into the page and get a smaller file back.*

1. WHEN the user supplies a file or pasted text that is valid UTF-8, THE SYSTEM SHALL produce a `.pw` file containing the compressed data.
2. WHEN compression finishes, THE SYSTEM SHALL show the original size, the Patchwork size and the gzip size of the same input side by side.
3. WHEN the input is not valid UTF-8, or the tokenizer cannot reproduce it exactly, THE SYSTEM SHALL fall back to a conventional compressor, mark the file as fallback mode, and tell the user why.
4. WHEN the Patchwork output would be larger than the fallback output, THE SYSTEM SHALL store the fallback output instead.
5. WHEN the input exceeds 2 MB, THE SYSTEM SHALL warn the user of the expected time before starting.
6. THE SYSTEM SHALL treat text that looks like the model's special markers (for example `<|endoftext|>`) as ordinary text.

### R2. Decompress a file

*As a user, I want the original file back, exactly.*

1. WHEN the user supplies a valid `.pw` file, THE SYSTEM SHALL reproduce the original bytes and offer them as a download with the original file name.
2. WHEN decompression finishes, THE SYSTEM SHALL compare a SHA-256 hash of the output against the hash stored in the file, and SHALL report success only if they match.
3. IF the hashes do not match, THEN THE SYSTEM SHALL refuse to offer the output as the original and SHALL explain that the file was probably made on a different device or browser.
4. IF the file is truncated, has the wrong magic bytes, or names an unknown format version or model, THEN THE SYSTEM SHALL show a specific error and SHALL NOT crash or hang.

### R3. Prediction engine

1. THE SYSTEM SHALL run the model on the CPU path (WebAssembly), not the graphics card, because graphics-card arithmetic varies between runs and devices.
2. THE SYSTEM SHALL compute predictions through one shared function used by both compression and decompression, fed the same tokens in the same order, one token at a time with cached state. Compression SHALL NOT use a faster batch path that decompression cannot reproduce.
3. THE SYSTEM SHALL reset the model's context on a fixed schedule (a block size in tokens, default 1,024, which is the model's maximum) recorded in the file header.
4. THE SYSTEM SHALL convert the model's raw scores into whole-number frequencies using only addition, subtraction, multiplication, division and comparison, with no calls to built-in `exp` or `log` functions, so that this step gives identical results in every JavaScript engine.
5. THE SYSTEM SHALL round the raw scores to a fixed grid before conversion, to reduce sensitivity to tiny numerical differences.
6. THE SYSTEM SHALL give every token a frequency of at least 1, so that any token can be encoded.

### R4. Arithmetic coder

1. THE SYSTEM SHALL implement the coder with exact whole-number arithmetic only.
2. THE SYSTEM SHALL support a 50,257-symbol alphabet with a frequency total of at least 2^24, so that the minimum-frequency rule in R3.6 costs under 1% in size.
3. FOR ANY sequence of symbols and any valid frequency tables, decoding the encoder's output SHALL return the same sequence.
4. THE SYSTEM SHALL keep the coder independent of the model, so it can be tested with synthetic frequency tables.

### R5. File format

1. THE SYSTEM SHALL write a header containing: magic bytes, format version, mode (model or fallback), model identifier and model file hash, block size, score-rounding grid, original length in bytes, original file name, and SHA-256 of the original.
2. THE SYSTEM SHALL reject, with a clear message, any file whose model hash differs from the loaded model.
3. THE SYSTEM SHALL document the format in `FORMAT.md`.

### R6. Progress and responsiveness

1. THE SYSTEM SHALL run compression and decompression in a background worker so the page stays responsive.
2. WHILE a job is running, THE SYSTEM SHALL show percentage complete, tokens per second and estimated time remaining.
3. WHEN the user presses cancel, THE SYSTEM SHALL stop the job within two seconds.
4. WHILE the model is loading for the first time, THE SYSTEM SHALL show download progress, and SHALL cache the model so later visits load without downloading.

### R7. Benchmark page

*As a judge, I want to see the claim proven on files I can inspect.*

1. THE SYSTEM SHALL include a benchmark page comparing Patchwork against gzip, zip, xz, zstd and brotli at their strongest settings on a fixed set of sample texts.
2. THE sample set SHALL include public-domain prose, a human-written screenplay-format text, and at least one text written after the model was trained, so the result cannot be explained by the model having memorised the sample. It SHALL include short inputs of 5 KB or less as well as full-length ones.
3. THE benchmark page SHALL report, for each file: sizes for every method, Patchwork's size as a percentage of each, and compression and decompression time.
4. THE benchmark page SHALL state the model's size and that it is not counted in the output sizes.
5. THE repo SHALL contain a script that regenerates the benchmark results, and the committed results SHALL come from that script.
6. THE benchmark page SHALL let a visitor run the comparison live on a short sample.

### R8. Interface and theme

1. THE interface SHALL follow the Frankenstein theme: a laboratory where two mismatched parts are stitched together. The theme SHALL support the function, for example by showing the model's prediction confidence as the text is processed.
2. THE interface SHALL be usable by keyboard alone, SHALL meet WCAG AA contrast, and SHALL respect the reduced-motion setting.
3. THE interface SHALL work at phone width, though large jobs may be discouraged there.
4. THE first screen SHALL offer a one-click sample so a visitor sees a full round trip without supplying a file.

### R9. Privacy and hosting

1. THE SYSTEM SHALL make no network requests containing user text.
2. THE SYSTEM SHALL be deployable as static files with no server-side code.
3. THE SYSTEM SHALL load its model from the same site that serves the app, not from a third-party host.

### R10. Repo and compliance

1. THE repo SHALL total under 100 MB including its history, enforced by an automated check. The model file SHALL be committed exactly once.
2. THE repo SHALL include `LICENSE` (MIT), `THIRD_PARTY.md` (model and libraries with licences and sources), `README.md` (setup, run, test and benchmark instructions) and `FORMAT.md`.
3. THE repo SHALL run from a fresh clone with the documented commands and no extra downloads.

## 5. Targets

These are goals to measure against, not promises. None has been measured yet.

| Measure | Target | Minimum to proceed |
|---|---|---|
| Size versus gzip on English prose of 20 KB or more | 60% of gzip's size or less (calculated: 35–53%) | Smaller than every conventional compressor tested |
| Round trip on the same machine and browser | 100% of test files identical | 100% |
| Speed on a mid-range laptop | Not yet measured; measure on day one | A 5 KB sample completes a round trip in under 60 seconds |
| First load on a fast connection | Under 30 seconds | Under 60 seconds |

## 6. Property-based tests

The contest rules ask specifically about property-based testing, and this project suits it. Kiro should generate tests for at least these properties:

- **Coder round trip:** for any symbol sequence and any valid frequency tables, decode(encode(x)) equals x.
- **Coder efficiency:** output length is within a small constant of the theoretical minimum for the given frequencies.
- **Frequency conversion:** for any vector of scores, every frequency is at least 1 and the frequencies sum to exactly the fixed total.
- **Frequency conversion is reproducible:** the same scores always give the same frequencies.
- **Tokenizer round trip:** for any valid UTF-8 string, including emoji, mixed scripts, unusual whitespace and special-marker look-alikes, detokenize(tokenize(x)) equals x, or the file is routed to fallback mode.
- **Full round trip:** for any input, including empty input, a single character and invalid UTF-8, decompress(compress(x)) equals x.
- **Header round trip:** for any valid header, parse(serialise(h)) equals h.
- **Corruption is detected:** flipping any byte of a `.pw` file produces an error or a hash mismatch, never a silently wrong output.
- **Block independence:** changing the block size changes the output size but never the decompressed result.

## 7. Suggested Kiro specs

Splitting the work gives several small specs to show in the write-up, and lets the riskiest part be proven first:

1. **Arithmetic coder.** No model needed. Fully testable on day one.
2. **Prediction engine.** Model loading, the shared prediction function and frequency conversion.
3. **File format.** Header, modes, hashing and error handling.
4. **Compression pipeline.** Ties 1 to 3 together in a background worker.
5. **Application interface.** The lab theme, progress display and sample flow.
6. **Benchmark.** The comparison script and page.

Suggested steering documents: the determinism rules in R3 and R4, a "whole-number arithmetic only in the coder" coding rule, and the accessibility rules in R8.

Suggested hooks: run the round-trip tests whenever coder or engine files are saved, and run the file-size check before each commit.

## 8. Known risks

| Risk | Likelihood | Response |
|---|---|---|
| Model arithmetic is not exactly repeatable even on one machine | Low to medium | Test on day two. If it fails, try single-threaded execution, then coarser score rounding. This is the go/no-go item. |
| Token-by-token speed is too slow for a live demo | Medium | Measure on day one. Size the demo sample to fit. Show full-length results pre-computed. |
| Multi-threaded execution needs special server headers that some static hosts cannot send | Medium | Choose a host that supports them, or run single-threaded. |
| The built compressor falls short of the calculated sizes | Low | The calculation beat every conventional compressor by a wide margin, and a correct coder should land within about 1% of it. Compare the first working build against the figures in section 3. |
| Heavily indented text such as screenplays compresses less well | Medium | Still ahead of every conventional compressor in the measurement. Whitespace handling is a stretch goal, not a requirement. |
| The repo grows past 100 MB | Medium | Commit the model once. Keep images small. Run the size check before every commit. |
| Library interfaces differ from what Kiro assumes | Medium | Have Kiro check current library documentation before writing engine code. |
| A file made on one device fails on another | High | Out of scope. Detected by the hash check and explained to the user. |

## 9. Schedule

| Date | Milestone |
|---|---|
| Wed 25 Nov | Register on Devpost. Request the Kiro credits. Install Kiro. |
| Thu 26 Nov | Coder spec built and passing property tests. Model loads in the browser. Token-by-token speed measured. |
| Sat 28 Nov | **Go/no-go:** a 5 KB sample survives a full round trip in the browser, repeatedly. If not, switch to the fallback project. |
| Mon 30 Nov | File format, pipeline and basic interface complete. |
| Tue 1 Dec | Benchmark complete. Feature freeze. (Kiro credit request form closes at noon Pacific.) |
| Wed 2 Dec | Theme polish. Demo video recorded. Kiro write-up drafted. |
| Thu 3 Dec | Submit. |
| Fri 4 Dec | Buffer. Deadline is 2:00 pm Pacific. |

## 10. Out of scope

- Files that are not text.
- Guaranteed decompression across devices, browsers or browser versions.
- Speed comparable to conventional compressors.
- Streaming or files too large for memory.
- User accounts, storage or any server component.
- A command-line version, unless it falls out of the benchmark script for free.
