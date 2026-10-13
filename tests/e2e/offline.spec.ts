import { expect, test } from "@playwright/test";
import { skipCounting } from "./helpers";

const fixture = (name: string) => new URL(`../fixtures/${name}`, import.meta.url).pathname;

test("works offline after the first visit", async ({ page, context }) => {
  await skipCounting(page);
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker

  // A first PDF caches Ghostscript.
  await page.locator("#file-input").setInputFiles(fixture("scan.pdf"));
  await expect(page.getByText(/\d+% smaller/)).toBeVisible({ timeout: 60_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Make PDFs and JPGs smaller." })).toBeVisible();

  await page.locator("#file-input").setInputFiles([fixture("photo.jpg"), fixture("scan.pdf")]);
  await expect(page.getByRole("button", { name: "Download all" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Failed")).toHaveCount(0);

  await page.goto("/how-it-works/");
  await expect(page.getByRole("heading", { name: "How Compress works" })).toBeVisible();
});
