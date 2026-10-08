import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { compress, UnsupportedFileError } from "../src/engine";
import { compressPdf, PdfError, isOutOfMemory } from "../src/engine/pdf";
import { detectKind } from "../src/engine/types";
import { initJpegCodecs } from "./helpers/codecs";
import { nodeGs } from "./helpers/gs";

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));

beforeAll(initJpegCodecs);

describe("compressPdf", () => {
  it("shrinks a scan at every level, smallest at Smaller", async () => {
    const input = fixture("scan.pdf");
    const sizes = [];
    for (const level of ["smaller", "balanced", "best"] as const) {
      const out = await compressPdf(input, level, nodeGs);
      expect(detectKind(out)).toBe("pdf");
      sizes.push(out.length);
    }
    expect(sizes[2]).toBeLessThan(input.length);
    expect(sizes[1]).toBeLessThan(sizes[2]);
    expect(sizes[0]).toBeLessThan(sizes[1]);
  });

  it("reports progress for each page in order", async () => {
    const seen: string[] = [];
    await compressPdf(fixture("scan.pdf"), "balanced", nodeGs, (page, pages) => seen.push(`${page}/${pages}`));
    expect(seen).toEqual(["1/2", "2/2"]);
  });

  it("says a password-protected PDF is locked", async () => {
    await expect(compressPdf(fixture("locked.pdf"), "balanced", nodeGs)).rejects.toMatchObject({ code: "locked" });
  });

  it("says a broken file is unreadable", async () => {
    const broken = new TextEncoder().encode("%PDF-1.7\nthis is not really a pdf");
    const error = await compressPdf(broken, "balanced", nodeGs).catch((e) => e);
    expect(error).toBeInstanceOf(PdfError);
    expect(error.code).toBe("unreadable");
  });

  it("recognises out-of-memory errors", () => {
    expect(isOutOfMemory(new Error("Aborted(OOM)"))).toBe(true);
    expect(isOutOfMemory(new Error("Cannot enlarge memory arrays"))).toBe(true);
    expect(isOutOfMemory(new Error("something else"))).toBe(false);
  });
});

describe("compress", () => {
  it("keeps the original when compression would not help", async () => {
    const input = fixture("text-only.pdf");
    const outcome = await compress(input, "balanced", nodeGs);
    if (outcome.kept) expect(outcome.bytes).toBe(input);
    expect(outcome.bytes.length).toBeLessThanOrEqual(input.length);
  });

  it("keeps a tiny, already-compressed JPG", async () => {
    const input = fixture("tiny.jpg");
    const outcome = await compress(input, "best", nodeGs);
    expect(outcome).toMatchObject({ kind: "jpg", kept: true });
    expect(outcome.bytes).toBe(input);
  });

  it("routes JPGs and PDFs by content", async () => {
    expect((await compress(fixture("photo.jpg"), "smaller", nodeGs)).kind).toBe("jpg");
    expect((await compress(fixture("scan.pdf"), "smaller", nodeGs)).kind).toBe("pdf");
  });

  it("rejects other files", async () => {
    await expect(compress(new TextEncoder().encode("hello"), "balanced", nodeGs)).rejects.toBeInstanceOf(UnsupportedFileError);
  });
});
