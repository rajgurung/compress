import { defineConfig } from "@playwright/test";

// BASE_URL runs the suite against a deployed site instead of a local preview.
const remote = process.env.BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  use: {
    baseURL: remote ?? "http://localhost:4173",
    channel: "chrome",
  },
  webServer: remote
    ? undefined
    : {
        command: "npm run build && npx vite preview --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
