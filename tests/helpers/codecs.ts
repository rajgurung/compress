// Node has no fetch for local wasm files, so tests hand the codecs their compiled modules.
import { readFileSync } from "node:fs";
import { init as initDecode } from "@jsquash/jpeg/decode.js";
import { init as initEncode } from "@jsquash/jpeg/encode.js";
import { initResize } from "@jsquash/resize";

const wasm = (path: string) =>
  WebAssembly.compile(readFileSync(new URL(`../../node_modules/@jsquash/${path}`, import.meta.url)));

export async function initJpegCodecs(): Promise<void> {
  await initDecode(await wasm("jpeg/codec/dec/mozjpeg_dec.wasm"));
  await initEncode(await wasm("jpeg/codec/enc/mozjpeg_enc.wasm"));
  await initResize(await wasm("resize/lib/resize/pkg/squoosh_resize_bg.wasm"));
}
