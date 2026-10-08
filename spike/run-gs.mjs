// Route A: Ghostscript compiled to WASM.
// Usage: node run-gs.mjs <in.pdf> <smaller|balanced|best> <out.pdf>
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const [input, level, output] = process.argv.slice(2);
const PRESETS = { smaller: "/screen", balanced: "/ebook", best: "/printer" };

const pkg = new URL("./node_modules/@jspawn/ghostscript-wasm/", import.meta.url).pathname;
const createGs = createRequire(pkg)("./gs.js");
const wasm = readFileSync(pkg + "gs.wasm");

const t0 = performance.now();
const gs = await createGs({
  noInitialRun: true,
  print: () => {},
  printErr: (s) => console.error("[gs]", s),
  instantiateWasm(imports, done) {
    WebAssembly.instantiate(wasm, imports).then((r) => done(r.instance, r.module));
    return {};
  },
});
const tLoaded = performance.now();

let data = readFileSync(input);
const inBytes = data.length;
gs.FS.writeFile("/in.pdf", data);
data = null;

gs.callMain([
  "-sDEVICE=pdfwrite",
  `-dPDFSETTINGS=${PRESETS[level]}`,
  "-dCompatibilityLevel=1.5",
  "-dNOPAUSE",
  "-dBATCH",
  "-dQUIET",
  "-sOutputFile=/out.pdf",
  "/in.pdf",
]);
const out = gs.FS.readFile("/out.pdf");
writeFileSync(output, out);
const t1 = performance.now();

console.log(
  JSON.stringify({
    route: "ghostscript",
    level,
    inMB: +(inBytes / 1e6).toFixed(1),
    outMB: +(out.length / 1e6).toFixed(2),
    loadMs: Math.round(tLoaded - t0),
    runMs: Math.round(t1 - tLoaded),
    wasmHeapMB: Math.round(gs.HEAP8.buffer.byteLength / 1e6),
  }),
);
