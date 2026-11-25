# Product: Patchwork

Patchwork is a browser-based text compressor entered in the Kiroween 2026 Frankenstein category. It stitches a small language model (DistilGPT-2, run locally via WebAssembly) to an arithmetic coder to produce output smaller than gzip, zip, bzip2, xz, zstd or brotli on English text.

## The one claim

On English text, Patchwork output is smaller than gzip, zip and xz output, and decompresses to a byte-for-byte identical file on the same machine and browser.

## What it does not claim

- Fast compression.
- Compatibility across devices, browsers or browser versions.
- Useful results on binary files, images, video or already-compressed data.

## User-facing features

- Drop a text file or paste text; receive a `.pw` compressed file.
- Drop a `.pw` file; receive the original file, verified by SHA-256.
- Progress display: percentage complete, tokens per second, estimated time remaining, cancel button.
- One-click sample demonstrating a full round trip without supplying a file.
- Benchmark page comparing Patchwork against conventional compressors on a fixed sample set, with a live run option.
- All processing is local; no user text ever leaves the browser.

## Fallback behaviour

When the input is not valid UTF-8, the tokenizer cannot reproduce it exactly, or Patchwork output would be larger than the fallback, the system stores a conventional-compressor output instead, marks the file as fallback mode, and tells the user why.

## Frankenstein theme

The interface presents a laboratory where two mismatched parts (the neural model and the 1970s coder) are stitched together. The model's prediction confidence is shown as text is processed. The theme is functional, not purely decorative.

## Accessibility

The interface must be operable by keyboard alone, meet WCAG AA contrast ratios, and respect the `prefers-reduced-motion` setting. It must work at phone width, though large jobs may be discouraged on mobile.

## Privacy

No network requests may carry user text. The model is served from the same origin as the app.

## Contest constraints

- Public GitHub repo, MIT licence, `/.kiro` committed and not git-ignored.
- Repo total under 100 MB including history; model committed exactly once.
- Working static-hosted URL, free to access through 29 January 2027.
- All source, assets and instructions to run from a fresh clone in the repo.
- Demo video under three minutes, public on YouTube.
