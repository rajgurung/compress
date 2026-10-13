import type { Page } from "@playwright/test";

/** Collects every request the page makes that is not to this site, a blob or a data URL. */
export function watchOutbound(page: Page, origin: string): string[] {
  const outbound: string[] = [];
  const check = (url: string) => {
    if (!url.startsWith(origin) && !url.startsWith("blob:") && !url.startsWith("data:")) outbound.push(url);
  };
  page.on("request", (r) => check(r.url()));
  page.on("requestfailed", (r) => check(r.url()));
  return outbound;
}

/** Answers the usage count in the browser, so test runs against the live site are not counted. */
export async function skipCounting(page: Page): Promise<void> {
  await page.route("**/api/used", (route) => route.fulfill({ status: 204 }));
}
