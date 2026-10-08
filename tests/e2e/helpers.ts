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
