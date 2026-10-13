// Daily totals from the usage count (see api/used.ts), as a plain page. It is
// not linked from the site, but anyone with the address can see the totals.
// STATS_TOKEN is a Cloudflare token with only Account Analytics Read.

interface Env {
  ACCOUNT_ID: string;
  STATS_TOKEN: string;
}

// Points before this are test runs from the day counting was added.
const START = "2026-10-13 12:00:00";

export interface DayRow {
  day: string;
  pdf: number;
  jpg: number;
}

export async function onRequestGet({ env }: { env: Env }): Promise<Response> {
  const query = `SELECT toDate(timestamp) AS day, blob1 AS kind, SUM(_sample_interval) AS files
    FROM compress_usage WHERE timestamp >= toDateTime('${START}')
    GROUP BY day, kind ORDER BY day DESC FORMAT JSON`;
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STATS_TOKEN}` },
    body: query,
  });
  if (!response.ok) return page("<p>Couldn't load the counts. Try again later.</p>", 502);
  const { data } = (await response.json()) as { data: { day: string; kind: string; files: string }[] };
  return page(table(byDay(data)));
}

export function byDay(data: { day: string; kind: string; files: string }[]): DayRow[] {
  const days = new Map<string, DayRow>();
  for (const { day, kind, files } of data) {
    const row = days.get(day) ?? { day, pdf: 0, jpg: 0 };
    if (kind === "pdf" || kind === "jpg") row[kind] += Number(files);
    days.set(day, row);
  }
  return [...days.values()];
}

export function table(rows: DayRow[]): string {
  if (rows.length === 0) return "<p>No files compressed yet.</p>";
  const total = rows.reduce((sum, r) => ({ pdf: sum.pdf + r.pdf, jpg: sum.jpg + r.jpg }), { pdf: 0, jpg: 0 });
  const line = (day: string, pdf: number, jpg: number) => `<tr><td>${day}</td><td>${pdf}</td><td>${jpg}</td><td>${pdf + jpg}</td></tr>`;
  return `<table><thead><tr><th>Day</th><th>PDFs</th><th>JPGs</th><th>Total</th></tr></thead><tbody>${rows
    .map((r) => line(r.day, r.pdf, r.jpg))
    .join("")}</tbody><tfoot>${line("Last 3 months", total.pdf, total.jpg)}</tfoot></table>`;
}

function page(body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Compress · Usage</title><link rel="stylesheet" href="/stats.css"></head><body><main><h1>Files compressed</h1>${body}<p class="note">Counts only. Nothing about people or files is stored. Cloudflare keeps the data for three months.</p></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
