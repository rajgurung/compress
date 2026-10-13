import { readFileSync, statSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { watchOutbound } from "./helpers";

const fixture = (name: string) => new URL(`../fixtures/${name}`, import.meta.url).pathname;

async function pick(page: Page, ...names: string[]) {
  await page.locator("#file-input").setInputFiles(names.map(fixture));
}

let outbound: string[] = [];
test.beforeEach(async ({ page, baseURL }) => {
  outbound = watchOutbound(page, baseURL!);
  await page.goto("/");
});
test.afterEach(() => {
  expect(outbound, "requests that left the site").toEqual([]);
});

test("the quality switch changes the hint", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Balanced" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Smaller" }).click();
  await expect(page.getByRole("button", { name: "Smaller" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Smallest file. Fine for screens and email.")).toBeVisible();
});

test("a JPG compresses, compares and downloads", async ({ page }) => {
  const counted = page.waitForRequest((r) => r.url().endsWith("/api/used") && r.method() === "POST");
  await pick(page, "photo.jpg");
  expect((await counted).postData(), "the count sends only the kind").toBe("jpg");
  await expect(page.getByText(/\d+% smaller/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Hidden photo details, like location and camera, were removed.")).toBeVisible();

  const slider = page.getByRole("slider", { name: /Compare original and compressed/ });
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveValue("49");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("photo-compressed.jpg");
  const path = await file.path();
  expect(statSync(path).size).toBeLessThan(statSync(fixture("photo.jpg")).size);
});

test("a PDF compresses with page progress and downloads", async ({ page }) => {
  await pick(page, "scan.pdf");
  await expect(page.getByText("Compressing")).toBeVisible();
  await expect(page.getByText(/\d+% smaller/)).toBeVisible({ timeout: 60_000 });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("scan-compressed.pdf");
  const bytes = readFileSync(await file.path());
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  expect(bytes.length).toBeLessThan(statSync(fixture("scan.pdf")).size);
});

test("several files show as a list and download as one zip", async ({ page }) => {
  await pick(page, "photo.jpg", "scan.pdf", "tiny.jpg");
  await expect(page.getByRole("button", { name: "Download all" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("tiny.jpg was already well compressed, so we kept the original.")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all" }).click();
  const zip = unzipSync(new Uint8Array(readFileSync(await (await download).path())));
  expect(Object.keys(zip).sort()).toEqual(["photo-compressed.jpg", "scan-compressed.pdf", "tiny.jpg"]);

  await page.getByRole("button", { name: /^photo\.jpg/ }).click();
  await expect(page.getByRole("button", { name: "Back to all files" })).toBeVisible();
  await page.getByRole("button", { name: "Back to all files" }).click();
  await expect(page.getByRole("list", { name: "Files" })).toBeVisible();
});

test("a password-protected PDF explains itself", async ({ page }) => {
  await pick(page, "locked.pdf");
  await expect(page.getByRole("heading", { name: "This PDF is locked." })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Nothing was uploaded or saved.")).toBeVisible();
});

test("a file that is not a PDF or JPG is turned away", async ({ page }) => {
  await page.locator("#file-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByRole("heading", { name: "Only PDFs and JPGs for now." })).toBeVisible();
});

test("a reload mid-job is explained", async ({ page }) => {
  await pick(page, "scan.pdf");
  await expect(page.getByText("Compressing")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your last file didn't finish." })).toBeVisible();
  await expect(page.getByText(/compressing scan\.pdf/)).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("a big file gets a warning first", async ({ page }, info) => {
    await expect(page.getByText("Works best with files under 200 MB on a phone.")).toBeVisible();
    const big = info.outputPath("big.pdf");
    const bytes = Buffer.alloc(201e6);
    bytes.write("%PDF-1.7\n");
    writeFileSync(big, bytes);
    await page.locator("#file-input").setInputFiles(big);
    await expect(page.getByRole("heading", { name: "This is a big file for a phone." })).toBeVisible();
    await page.getByRole("button", { name: "Choose another file" }).click();
    await expect(page.getByRole("heading", { name: "Make PDFs and JPGs smaller." })).toBeVisible();
  });

  test("nothing scrolls sideways", async ({ page }) => {
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
});

test("How it works explains the limits", async ({ page }) => {
  await page.getByRole("link", { name: "Limits" }).click();
  await expect(page.getByRole("heading", { name: "How Compress works" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Phone Up to 200 MB/ })).toBeVisible();
  await page.getByRole("link", { name: "Compress a file" }).click();
  await expect(page.getByRole("heading", { name: "Make PDFs and JPGs smaller." })).toBeVisible();
});
