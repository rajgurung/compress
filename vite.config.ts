import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

/** Reads the `/*` block of public/_headers so `vite preview` serves the live site's headers. */
function siteHeaders(): Record<string, string> {
  const lines = readFileSync(resolve(root, "public/_headers"), "utf8").split("\n");
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const match = /^\s+([\w-]+):\s*(.+)$/.exec(line);
    if (match) headers[match[1]] = match[2].trim();
  }
  return headers;
}

/** Emits sw.js with the list of built files to cache for offline use. */
function serviceWorker(): Plugin {
  // Resize codecs we never call; no need to download them.
  const unused = /squooshhqx|magic_kernel|\.woff$/;
  return {
    name: "compress-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((name) => !unused.test(name));
      const urls = ["/", "/how-it-works/", "/favicon.svg", ...files.filter((f) => !f.endsWith(".html")).map((f) => `/${f}`)];
      const template = readFileSync(resolve(root, "src/sw.js"), "utf8");
      const version = createHash("sha256").update(files.sort().join("\n")).update(template).digest("hex").slice(0, 12);
      const source = template
        .replace("__VERSION__", version)
        .replace("__PRECACHE__", JSON.stringify(urls));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        how: resolve(root, "how-it-works/index.html"),
      },
    },
  },
  worker: { format: "es" },
  plugins: [serviceWorker()],
  preview: { headers: siteHeaders() },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
