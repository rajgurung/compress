import decode from "@jsquash/jpeg/decode.js";
import encode from "@jsquash/jpeg/encode.js";
import resize from "@jsquash/resize";
import type { Level } from "./types";

// Long side cap in pixels and mozjpeg quality per level.
const SETTINGS: Record<Level, { longSide: number; quality: number }> = {
  smaller: { longSide: 2048, quality: 62 },
  balanced: { longSide: 4096, quality: 76 },
  best: { longSide: Infinity, quality: 86 },
};

/**
 * Re-encodes a JPEG. Orientation is applied to the pixels, so the output needs
 * no EXIF; all metadata is dropped except the colour profile, which keeps
 * colours right (iPhone photos are Display P3) and says nothing about the person.
 */
export async function compressJpg(input: Uint8Array, level: Level): Promise<Uint8Array> {
  const { longSide, quality } = SETTINGS[level];
  const source = input.slice().buffer;
  let image = await decode(source, { preserveOrientation: true });
  const scale = Math.min(1, longSide / Math.max(image.width, image.height));
  if (scale < 1) {
    image = await resize(image, {
      width: Math.round(image.width * scale),
      height: Math.round(image.height * scale),
      method: "lanczos3",
    });
  }
  const output = new Uint8Array(await encode(image, { quality }));
  return withSegments(output, iccSegments(input));
}

/** The APP2 ICC_PROFILE segments of a JPEG, markers included. */
export function iccSegments(jpeg: Uint8Array): Uint8Array[] {
  const found: Uint8Array[] = [];
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // start of scan, end of image
    const length = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (marker === 0xe2 && ascii(jpeg, i + 4, 12) === "ICC_PROFILE\0") {
      found.push(jpeg.subarray(i, i + 2 + length));
    }
    i += 2 + length;
  }
  return found;
}

/** Lists the segment markers before the image data, e.g. ["e0", "e2", "db"]. */
export function segmentMarkers(jpeg: Uint8Array): string[] {
  const markers: string[] = [];
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1];
    if (marker === 0xda) break;
    markers.push(marker.toString(16));
    i += 2 + ((jpeg[i + 2] << 8) | jpeg[i + 3]);
  }
  return markers;
}

/** Inserts segments after SOI and the JFIF APP0 segment, where APP2 belongs. */
function withSegments(jpeg: Uint8Array, segments: Uint8Array[]): Uint8Array {
  if (segments.length === 0) return jpeg;
  let at = 2;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) at = 4 + ((jpeg[4] << 8) | jpeg[5]);
  const extra = segments.reduce((n, s) => n + s.length, 0);
  const out = new Uint8Array(jpeg.length + extra);
  out.set(jpeg.subarray(0, at), 0);
  let pos = at;
  for (const s of segments) {
    out.set(s, pos);
    pos += s.length;
  }
  out.set(jpeg.subarray(at), pos);
  return out;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}
