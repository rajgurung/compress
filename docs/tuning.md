# Tuning notes

## Ghostscript 10.06.0 on a MacBook (2026-10-08)

`scripts/bench-pdf.ts`, one process per run, peak memory from `/usr/bin/time -l`.
Samples from `spike/make-samples.mjs` (A4, 300 DPI, every page unique).

| File | Level | Output | Time | Peak memory |
|---|---|---|---|---|
| 22 MB, 7 pages | Smaller | 0.56 MB | 1.3 s | 203 MB |
| 22 MB | Balanced | 1.25 MB | 1.3 s | 207 MB |
| 22 MB | Best | 2.46 MB | 3.8 s | 229 MB |
| 111 MB, 36 pages | Smaller | 2.8 MB | 6.1 s | 338 MB |
| 111 MB | Balanced | 6.3 MB | 6.2 s | 403 MB |
| 111 MB | Best | 12.5 MB | 19 s | 490 MB |
| 331 MB, 107 pages | Smaller | 8.3 MB | 18 s | 648 MB |
| 331 MB | Balanced | 18.7 MB | 18 s | 832 MB |
| 331 MB | Best | 37.1 MB | 57 s | 881 MB |

Compared with the 9.56 build in the spike: smaller files and faster at every
level; Best now compresses (it used to pass scans through at 1.27 GB peak).
Peak memory on the 331 MB file is 170–190 MB higher at Smaller and Balanced.
Unverified how much of that is the `tsx` runner rather than Ghostscript.

## Still to do (needs real devices and files)

- Run on a real iPhone with real scans, including small print, and judge quality
  at each level.
- Tune Balanced and Best JPEG quality from that.
- Confirm the warning thresholds (200 MB phone, 1 GB computer) against what the
  iPhone actually manages, and update `src/limits.ts` and the How it works table.
