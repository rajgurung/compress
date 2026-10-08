import type { GsFactory, GsModule } from "./pdf";

// Bump when the files in public/gs/ change, so caches fetch the new ones.
const GS_VERSION = "10.06.0";
const base = "/gs/";

type CreateModule = (options: object) => Promise<GsModule>;
let create: Promise<CreateModule> | undefined;
let compiled: Promise<WebAssembly.Module> | undefined;

/** Loads Ghostscript on first use, compiles its wasm once, and makes a fresh instance per file. */
export const browserGs: GsFactory = async (options) => {
  create ??= import(/* @vite-ignore */ `${base}gs.js?v=${GS_VERSION}`).then((m) => m.default as CreateModule);
  compiled ??= WebAssembly.compileStreaming(fetch(`${base}gs.wasm?v=${GS_VERSION}`));
  const [createModule, module] = await Promise.all([create, compiled]);
  return createModule({
    noInitialRun: true,
    ...options,
    instantiateWasm(imports: WebAssembly.Imports, done: (i: WebAssembly.Instance, m: WebAssembly.Module) => void) {
      WebAssembly.instantiate(module, imports).then((instance) => done(instance, module));
      return {};
    },
  });
};
