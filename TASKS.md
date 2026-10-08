# Tasks

Generated from SPEC.md on 2026-10-08. Design reference: the approved mockup
(https://claude.ai/artifact/XU1VaUzJcS9wNLpuAk5K81).

## Sequential: foundation
- [x] **Task 1**: Scaffold. Vite + TypeScript, no UI framework. AGPL-3.0
  LICENSE, README. Base CSS with light/dark tokens from the mockup. Geist and
  Geist Mono self-hosted (no Google Fonts: third-party requests break the
  privacy promise). Vitest for unit tests, Playwright for browser tests.
  — Files: `package.json`, `index.html`, `src/main.ts`, `src/styles.css`,
  `public/fonts/`, `LICENSE`, `README.md` — Verify: `npm run build` and
  `npm test` pass; page renders in light and dark.
- [x] **Task 2**: Privacy guard rails. Cloudflare Pages `_headers` with a strict
  CSP (`default-src 'self'`, `connect-src 'self'`, `'wasm-unsafe-eval'` for
  WASM, `blob:` for downloads). A Playwright test fails if any request leaves
  the origin. — Depends on: Task 1 — Files: `public/_headers`,
  `tests/e2e/privacy.spec.ts` — Verify: test passes; a deliberate outbound
  fetch makes it fail.

## Parallel Group 1 (after foundation)
- [x] **Task 3**: JPG engine in a Web Worker. mozjpeg via `@jsquash`; the three
  levels; EXIF removed but orientation applied to the pixels; never returns a
  bigger file. — Files: `src/engine/jpg.ts`, `src/engine/worker.ts`,
  `tests/jpg.test.ts` — Verify: tests on fixture JPGs (sizes shrink, rotated
  photo stays upright, no EXIF in output, already-small file kept).
- [x] **Task 4**: PDF engine in the same worker. Ghostscript WASM loaded only
  when a PDF arrives. Presets: `/screen`, `/ebook`, custom Best (about 200 DPI,
  high JPEG quality). Page progress from Ghostscript's output. Cancel by ending
  the worker. Password-protected PDFs detected and reported. Never returns a
  bigger file. — Files: `src/engine/pdf.ts`, `tests/pdf.test.ts` — Verify:
  tests on small fixtures (scan shrinks, text-only kept, locked PDF gives a
  clear error, progress events arrive in order).
- [x] **Task 5**: Empty screen UI from the mockup. Header, headline, drop zone
  (drag and drop plus file picker), quality switch with hint, privacy footer.
  44px touch targets, works at 390px. — Files: `src/ui/empty.ts`,
  `src/styles.css` — Verify: Playwright screenshots at 390px and 1280px, light
  and dark; keyboard can reach every control.

## Sequential (after Group 1)
- [x] **Task 6**: Jobs and results. Queue files through the worker; Compressing
  screen with progress; single-file result; several-files list with "kept
  original" rows; Download and Download all (zip via `fflate`). —
  Depends on: Tasks 3–5 — Files: `src/jobs.ts`, `src/ui/working.ts`,
  `src/ui/result.ts`, `src/ui/list.ts` — Verify: Playwright drops a JPG and a
  PDF, downloads both, sizes match the engine output.
- [x] **Task 7**: Limits and failures. Device detection (pointer, screen,
  `navigator.deviceMemory` where present); big-file warning with Continue;
  failure screens for out of memory, locked PDF and tab reloaded
  (`sessionStorage` marker); worker crashes caught. — Depends on: Task 6 —
  Files: `src/limits.ts`, `src/ui/warning.ts`, `src/ui/failed.ts` — Verify:
  tests for thresholds; Playwright forces each failure and checks the copy.

## Parallel Group 2 (after Task 6)
- [x] **Task 8**: JPG before/after slider, keyboard-accessible. — Files:
  `src/ui/compare.ts` — Verify: Playwright drags and uses arrow keys.
- [x] **Task 9**: How it works page with the limits table. — Files:
  `how-it-works.html`, `src/styles.css` — Verify: renders at 390px; links work.
- [x] **Task 10**: Offline. Service worker caches the app shell; the
  Ghostscript WASM is cached the first time it loads. — Files: `src/sw.ts` —
  Verify: Playwright goes offline after first load and still compresses a JPG
  and a PDF.

## Final
- [x] **Task 11**: Current Ghostscript. Switched to Ghostscript 10.06.0 from
  `@okathira/ghostpdl-wasm` (GitHub Actions build with npm provenance) instead of
  compiling our own; replaces the 2022 npm build. — Files: `ghostscript/build.sh`,
  `public/gs/` — Verify: PDF tests pass; spike `bench.sh` sizes and timings no
  worse.
- [ ] **Task 12**: Real-device tuning. Run on a real iPhone and laptop with real
  scans; tune Balanced and Best quality; set the warning thresholds from what
  we measure. — Verify: numbers recorded in `docs/tuning.md`; SPEC limits
  updated.
- [x] **Task 13**: Deploy. Public GitHub repo, Cloudflare Pages project,
  `compress.rajgurung.me` DNS, headers checked live. — Verify: the privacy test
  passes against the live site; Lighthouse run recorded.
