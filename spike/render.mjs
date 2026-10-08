// Renders one page of a PDF to PNG with Ghostscript WASM, for eyeballing quality.
// Usage: node render.mjs <in.pdf> <page> <dpi> <out.png>
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const [input, page, dpi, output] = process.argv.slice(2);
const pkg = new URL("./node_modules/@jspawn/ghostscript-wasm/", import.meta.url).pathname;
const wasm = readFileSync(pkg + "gs.wasm");
const gs = await createRequire(pkg)("./gs.js")({
  noInitialRun: true,
  print: () => {},
  printErr: (s) => console.error("[gs]", s),
  instantiateWasm(imports, done) {
    WebAssembly.instantiate(wasm, imports).then((r) => done(r.instance, r.module));
    return {};
  },
});
gs.FS.writeFile("/in.pdf", readFileSync(input));
gs.callMain([
  "-sDEVICE=png16m",
  `-r${dpi}`,
  `-dFirstPage=${page}`,
  `-dLastPage=${page}`,
  "-dNOPAUSE",
  "-dBATCH",
  "-dQUIET",
  "-sOutputFile=/out.png",
  "/in.pdf",
]);
writeFileSync(output, gs.FS.readFile("/out.png"));
