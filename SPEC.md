# Project: Compress

## Goal
A small, beautiful web tool that makes PDFs and JPGs smaller. Files never leave
the person's device: all compression runs in the browser. The design is
minimal: one screen, one action, the result as the hero.

## Scope

### In Scope
- JPG compression in the browser (mozjpeg via WebAssembly, canvas as fallback).
- PDF compression in the browser with Ghostscript compiled to WASM (decided by
  the spike, see `spike/RESULTS.md`).
- One control: Smaller / Balanced (default) / Best quality.
- Multiple files at once, shown as a list with per-file savings and "Download all".
- JPG before/after comparison slider.
- Clear, device-aware limits messaging (see Limits).
- "How it works" page: what happens to your file, limits, what won't shrink.
- Light and dark mode following the device. Works well on phones.
- Static site on Cloudflare Pages at compress.rajgurung.me. Open source.

### Out of Scope
- Any server-side processing, uploads, accounts or storage.
- Analytics, trackers, ads, third-party scripts.
- Other formats (PNG, HEIC, WebP, Word). Possible later.
- Advanced settings (DPI, colour profiles, per-page options).

## Technical Approach
- TypeScript, no UI framework. Vite for dev and build.
- Compression runs in a Web Worker so the page never freezes and memory
  failures can be caught.
- PDF: Ghostscript `pdfwrite`. Smaller and Balanced start from `/screen` and
  `/ebook`; Best uses custom settings (about 200 DPI, high JPEG quality), since
  `/printer` leaves 300 DPI scans unchanged. Tune on real scans.
- Ghostscript 10.06 WASM from `@okathira/ghostpdl-wasm`, built on GitHub Actions
  with npm provenance (`npm audit signatures` verifies it). It loads only when a
  PDF is dropped and is cached by the service worker.
- Process one image at a time and free it before the next, to keep peak
  memory flat.
- Never return a bigger file: if output >= input, keep the original and say
  "already well compressed".
- JPG output strips EXIF metadata but keeps orientation.
- Strict Content Security Policy: no outbound requests except the site itself.
- Works offline once loaded (service worker), as proof of the privacy promise.

## Limits
Framing: "Your files never leave your device, so the size we can handle depends
on your device."

- Soft limits, never hard blocks (except unopenable files).
  - Phone: warn above ~200 MB. Computer: warn above ~1 GB. Starting guesses;
    tune after testing on real devices.
  - Device type from pointer/screen; `navigator.deviceMemory` where available
    (Chromium only).
- Where it shows:
  1. Before: one line under the drop zone.
  2. Large file dropped: inline note with Continue.
  3. Failure: plain words and a next step, no error codes.
  4. How it works page: a short limits table.
- Edge cases stated honestly: password-protected PDFs can't be opened;
  text-only PDFs barely shrink; JPG metadata is removed.
- If the tab reloads mid-job (iOS memory kill), detect it via sessionStorage and
  explain on return.

## Key Flows
1. Drop or pick a file → compressing (progress, e.g. "Page 40 of 300") →
   result ("4.2 MB → 1.1 MB, 74% smaller") → Download.
2. Drop several files → list with per-file progress and savings → Download all.
3. Drop a large file on a phone → warning → Continue or stop.
4. Compression fails → plain message with a next step.

## Success Criteria
- [ ] No network request carries file data (verified in DevTools and by CSP).
- [ ] A typical 20 MB scanned PDF shrinks meaningfully on an iPhone and a laptop.
- [ ] Output is never larger than input.
- [ ] Page stays responsive during compression.
- [ ] Limits and failure states read clearly; tested on a real iPhone.
- [ ] Lighthouse: fast, accessible; works at 390px with no sideways scroll.

## Risks and Unknowns
- Phone speed is unmeasured. The spike ran on a laptop (a 111 MB scan took
  7.5 s). Mitigation: test on a real iPhone early.
- We depend on a third-party Ghostscript WASM build. Mitigation: pinned version,
  provenance checked; a Docker-based build of our own remains an option.
- Ghostscript is AGPL: the repo is AGPL too.
- iOS memory ceiling varies by model: soft limits plus graceful failure.

## Decisions
- PDF route: Ghostscript in WASM (2026-10-08 spike).
- Licence: AGPL-3.0.
