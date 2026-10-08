import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/** Reads the `/*` block of public/_headers so `vite preview` serves the live site's headers. */
function siteHeaders(): Record<string, string> {
  const lines = readFileSync(resolve(import.meta.dirname, "public/_headers"), "utf8").split("\n");
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const match = /^\s+([\w-]+):\s*(.+)$/.exec(line);
    if (match) headers[match[1]] = match[2].trim();
  }
  return headers;
}

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
      },
    },
  },
  worker: { format: "es" },
  preview: { headers: siteHeaders() },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
