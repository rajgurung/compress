// Copies Ghostscript's script and wasm into public/gs/ as-is. They are served
// unbundled: the script relies on a global `exports` trick that bundlers rewrite.
import { copyFileSync, mkdirSync } from "node:fs";

const from = new URL("../node_modules/@jspawn/ghostscript-wasm/", import.meta.url);
const to = new URL("../public/gs/", import.meta.url);
mkdirSync(to, { recursive: true });
for (const file of ["gs.js", "gs.wasm"]) copyFileSync(new URL(file, from), new URL(file, to));
