import { describe, expect, it } from "vitest";
import { onRequestPost } from "../functions/api/used";

function call(body: string, origin: string | null = "https://compress.rajgurung.me") {
  const points: unknown[] = [];
  const headers = origin ? { Origin: origin } : undefined;
  const request = new Request("https://compress.rajgurung.me/api/used", { method: "POST", body, headers });
  const env = { USAGE: { writeDataPoint: (p: unknown) => void points.push(p) } };
  return onRequestPost({ request, env }).then((response) => ({ status: response.status, points }));
}

describe("usage count", () => {
  it("records the kind and nothing else", async () => {
    expect(await call("pdf")).toEqual({ status: 204, points: [{ blobs: ["pdf"], indexes: ["pdf"] }] });
    expect((await call("jpg")).points).toEqual([{ blobs: ["jpg"], indexes: ["jpg"] }]);
  });

  it("ignores anything but pdf or jpg", async () => {
    expect(await call("png")).toEqual({ status: 400, points: [] });
    expect(await call("pdf".repeat(1000))).toEqual({ status: 400, points: [] });
  });

  it("turns away requests from other sites", async () => {
    expect(await call("pdf", "https://example.com")).toEqual({ status: 403, points: [] });
    expect(await call("pdf", null)).toEqual({ status: 403, points: [] });
  });
});
