// Loads the npm Ghostscript build in Node. Its own loader tries fetch() on a file path,
// so we compile the wasm ourselves and hand it over through instantiateWasm.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { GsFactory } from "../../src/engine/pdf";

const dir = new URL("../../node_modules/@jspawn/ghostscript-wasm/", import.meta.url);
let compiled: Promise<WebAssembly.Module> | undefined;

export const nodeGs: GsFactory = async (options) => {
  const create = createRequire(dir)("./gs.js");
  compiled ??= WebAssembly.compile(readFileSync(new URL("gs.wasm", dir)));
  const module = await compiled;
  return create({
    noInitialRun: true,
    ...options,
    instantiateWasm(imports: WebAssembly.Imports, done: (i: WebAssembly.Instance, m: WebAssembly.Module) => void) {
      WebAssembly.instantiate(module, imports).then((instance) => done(instance, module));
      return {};
    },
  });
};
