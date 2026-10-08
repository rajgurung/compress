// Copies Ghostscript's module and wasm into public/gs/ as-is, so the 15 MB wasm is
// fetched only when someone compresses a PDF.
import { copyFileSync, mkdirSync } from "node:fs";

const from = new URL("../node_modules/@okathira/ghostpdl-wasm/dist/", import.meta.url);
const to = new URL("../public/gs/", import.meta.url);
mkdirSync(to, { recursive: true });
for (const file of ["gs.js", "gs.wasm"]) copyFileSync(new URL(file, from), new URL(file, to));
