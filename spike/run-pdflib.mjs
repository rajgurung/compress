// Route B: pdf-lib finds each JPEG image, mozjpeg (WASM) recompresses it, pdf-lib writes the PDF.
// Usage: node run-pdflib.mjs <in.pdf> <smaller|balanced|best> <out.pdf>
//
// Spike shortcuts: only DCTDecode (JPEG) images in RGB or grey are touched, and the
// target size caps the long side as if each image fills an A4 page.
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import decode, { init as initDecode } from "@jsquash/jpeg/decode.js";
import encode, { init as initEncode } from "@jsquash/jpeg/encode.js";
import resize, { initResize } from "@jsquash/resize";

const [input, level, output] = process.argv.slice(2);
// Long side in pixels for an A4 page (11.69 in) at 72 / 150 / 300 DPI, and mozjpeg quality.
const LEVELS = {
  smaller: { longSide: 842, quality: 55 },
  balanced: { longSide: 1754, quality: 70 },
  best: { longSide: 3508, quality: 82 },
};
const { longSide, quality } = LEVELS[level];

const mod = (p) => WebAssembly.compile(readFileSync(new URL(`./node_modules/@jsquash/${p}`, import.meta.url)));
const t0 = performance.now();
await initDecode(await mod("jpeg/codec/dec/mozjpeg_dec.wasm"));
await initEncode(await mod("jpeg/codec/enc/mozjpeg_enc.wasm"));
await initResize(await mod("resize/lib/resize/pkg/squoosh_resize_bg.wasm"));
const tLoaded = performance.now();

let data = readFileSync(input);
const inBytes = data.length;
const doc = await PDFDocument.load(data, { updateMetadata: false });
data = null;

const N = (s) => PDFName.of(s);
let seen = 0;
let replaced = 0;
for (const [, obj] of doc.context.enumerateIndirectObjects()) {
  if (!(obj instanceof PDFRawStream)) continue;
  const dict = obj.dict;
  if (dict.get(N("Subtype")) !== N("Image") || dict.get(N("Filter")) !== N("DCTDecode")) continue;
  const cs = dict.get(N("ColorSpace"));
  if (cs !== N("DeviceRGB") && cs !== N("DeviceGray")) continue;
  seen++;

  let img = await decode(obj.contents);
  const scale = Math.min(1, longSide / Math.max(img.width, img.height));
  if (scale < 1) {
    img = await resize(img, {
      width: Math.round(img.width * scale),
      height: Math.round(img.height * scale),
      method: "lanczos3",
    });
  }
  const bytes = new Uint8Array(await encode(img, { quality, color_space: cs === N("DeviceGray") ? 1 : 3 }));
  img = null;
  if (bytes.length >= obj.contents.length) continue;

  obj.contents = bytes;
  dict.set(N("Width"), PDFNumber.of(Math.round(dict.get(N("Width")).asNumber() * scale)));
  dict.set(N("Height"), PDFNumber.of(Math.round(dict.get(N("Height")).asNumber() * scale)));
  dict.set(N("Length"), PDFNumber.of(bytes.length));
  dict.delete(N("DecodeParms"));
  replaced++;
}

const out = await doc.save({ useObjectStreams: true });
writeFileSync(output, out);
const t1 = performance.now();

console.log(
  JSON.stringify({
    route: "pdf-lib",
    level,
    inMB: +(inBytes / 1e6).toFixed(1),
    outMB: +(out.length / 1e6).toFixed(2),
    images: `${replaced}/${seen}`,
    loadMs: Math.round(tLoaded - t0),
    runMs: Math.round(t1 - tLoaded),
  }),
);
