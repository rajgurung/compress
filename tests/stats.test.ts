import { describe, expect, it } from "vitest";
import { byDay, table } from "../functions/stats";

describe("stats page", () => {
  it("puts each day's PDFs and JPGs on one row", () => {
    const rows = byDay([
      { day: "2026-10-14", kind: "pdf", files: "3" },
      { day: "2026-10-14", kind: "jpg", files: "5" },
      { day: "2026-10-13", kind: "jpg", files: "1" },
    ]);
    expect(rows).toEqual([
      { day: "2026-10-14", pdf: 3, jpg: 5 },
      { day: "2026-10-13", pdf: 0, jpg: 1 },
    ]);
  });

  it("shows a total and an empty state", () => {
    expect(table([{ day: "2026-10-14", pdf: 3, jpg: 5 }, { day: "2026-10-13", pdf: 0, jpg: 1 }])).toContain(
      "<tr><td>Last 3 months</td><td>3</td><td>6</td><td>9</td></tr>",
    );
    expect(table([])).toBe("<p>No files compressed yet.</p>");
  });
});
