# PDF spike results (2026-10-08)

Decision: **Ghostscript compiled to WASM.**

## Setup
- Samples: A4 pages at 300 DPI, JPEG q92, every page a distinct image
  (`make-samples.mjs`). 22 MB (7 pages), 111 MB (36), 331 MB (107), plus a
  0.1 MB text-only PDF.
- Route A `run-gs.mjs`: `@jspawn/ghostscript-wasm` 0.0.2, `pdfwrite` with
  `/screen`, `/ebook`, `/printer` for Smaller, Balanced, Best.
- Route B `run-pdflib.mjs`: `pdf-lib` finds JPEG images, `@jsquash` mozjpeg
  decodes, resizes to 72/150/300 DPI equivalent, re-encodes at q55/70/82.
- Node 20 on a MacBook, one process per run, peak memory from `/usr/bin/time -l`.
  `./bench.sh` reruns everything; raw lines in `out/results.jsonl`.

## Results

| File | Level | Ghostscript | pdf-lib |
|---|---|---|---|
| 22 MB | Smaller | 0.61 MB · 1.8 s · 158 MB | 0.30 MB · 3.6 s · 545 MB |
| 22 MB | Balanced | 1.42 MB · 1.5 s · 195 MB | 0.93 MB · 6.7 s · 618 MB |
| 22 MB | Best | unchanged · 1.1 s · 635 MB | 9.5 MB · 11 s · 423 MB |
| 111 MB | Smaller | 3.1 MB · 9.2 s · 273 MB | 1.5 MB · 17 s · 580 MB |
| 111 MB | Balanced | 7.2 MB · 7.5 s · 409 MB | 4.7 MB · 33 s · 646 MB |
| 111 MB | Best | unchanged · 5.7 s · 886 MB | 49 MB · 57 s · 543 MB |
| 331 MB | Smaller | 9.2 MB · 27 s · 476 MB | 4.5 MB · 52 s · 682 MB |
| 331 MB | Balanced | 21 MB · 22 s · 645 MB | 14 MB · 98 s · 772 MB |
| 331 MB | Best | unchanged · 16 s · 1274 MB | 144 MB · 167 s · 785 MB |
| Text-only | any | 0.03–0.04 MB | 0.05 MB |

## Why Ghostscript
- 2–6x faster; working heap flat at 67 MB for every size. Peak grows only with
  the input and output files held in memory.
- Handles every image type, colour space and font. The pdf-lib route only
  handled plain JPEG images; the rest would be custom work.
- pdf-lib's smaller files come mostly from its lower JPEG quality, which
  Ghostscript can also be tuned to.

## Follow-ups
- `/printer` passes 300 DPI scans through unchanged. Use custom settings for
  Best (about 200 DPI, high JPEG quality).
- Tune Balanced towards pdf-lib's sizes; judge on a real scan with small print.
- WASM is 16 MB raw, 10.6 MB brotli. Load it only when a PDF is dropped; cache it.
- The npm build dates from 2022. Build current Ghostscript 10.x before launch.
- Loading in Node needs a custom `instantiateWasm` hook (its `fetch` path
  breaks on file paths).
- Unmeasured: phone speed, quality on real small print.
- An earlier run repeated 6 page images; Ghostscript stores repeats once, so
  its sizes were unrealistically small. Kept in `out/results-repeated-pages.jsonl`.
