import { readFileSync } from "node:fs";
import decode from "@jsquash/jpeg/decode.js";
import { beforeAll, describe, expect, it } from "vitest";
import { compressJpg, iccSegments, segmentMarkers } from "../src/engine/jpg";
import { detectKind } from "../src/engine/types";
import { initJpegCodecs } from "./helpers/codecs";

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));
const pixel = (img: ImageData, x: number, y: number) => {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};

beforeAll(initJpegCodecs);

describe("compressJpg", () => {
  it("shrinks a photo at every level, smallest at Smaller", async () => {
    const input = fixture("photo.jpg");
    const smaller = await compressJpg(input, "smaller");
    const balanced = await compressJpg(input, "balanced");
    const best = await compressJpg(input, "best");
    expect(best.length).toBeLessThan(input.length);
    expect(balanced.length).toBeLessThan(best.length);
    expect(smaller.length).toBeLessThan(balanced.length);
    expect(detectKind(smaller)).toBe("jpg");
  });

  it("caps the long side at Smaller and keeps full size at Best", async () => {
    const input = fixture("photo.jpg");
    const smaller = await decode((await compressJpg(input, "smaller")).slice().buffer);
    expect([smaller.width, smaller.height]).toEqual([2048, 1365]);
    const best = await decode((await compressJpg(input, "best")).slice().buffer);
    expect([best.width, best.height]).toEqual([3000, 2000]);
  });

  it("applies the orientation tag to the pixels", async () => {
    // Stored 1200x800: red left half, blue right half; tag says rotate 90° clockwise.
    const out = await decode((await compressJpg(fixture("rotated.jpg"), "best")).slice().buffer);
    expect([out.width, out.height]).toEqual([800, 1200]);
    const [r1, , b1] = pixel(out, 400, 200);
    const [r2, , b2] = pixel(out, 400, 1000);
    expect(r1).toBeGreaterThan(150);
    expect(b1).toBeLessThan(100);
    expect(b2).toBeGreaterThan(150);
    expect(r2).toBeLessThan(100);
  });

  it("removes EXIF but keeps the colour profile", async () => {
    const input = fixture("rotated.jpg");
    expect(segmentMarkers(input)).toContain("e1");
    const out = await compressJpg(input, "balanced");
    expect(segmentMarkers(out)).not.toContain("e1");
    expect(new TextDecoder("latin1").decode(out)).not.toContain("SecretCam");
    expect(iccSegments(out)).toHaveLength(1);
    expect(iccSegments(out)[0]).toEqual(iccSegments(input)[0]);
  });
});

describe("detectKind", () => {
  it("reads magic bytes", () => {
    expect(detectKind(new TextEncoder().encode("%PDF-1.7"))).toBe("pdf");
    expect(detectKind(fixture("tiny.jpg"))).toBe("jpg");
    expect(detectKind(new TextEncoder().encode("hello"))).toBeNull();
  });
});
