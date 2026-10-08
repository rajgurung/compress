// Loads Ghostscript in Node. We compile the wasm ourselves and hand it over through
// instantiateWasm, the same way the browser loader does.
import { readFileSync } from "node:fs";
import type { GsFactory, GsModule } from "../../src/engine/pdf";

const dir = new URL("../../node_modules/@okathira/ghostpdl-wasm/dist/", import.meta.url);
let compiled: Promise<WebAssembly.Module> | undefined;

export const nodeGs: GsFactory = async (options) => {
  const { default: create } = (await import(new URL("gs.js", dir).href)) as { default: (o: object) => Promise<GsModule> };
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
