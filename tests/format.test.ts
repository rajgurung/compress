import { describe, expect, it } from "vitest";
import { formatBytes, percentSmaller } from "../src/format";

describe("formatBytes", () => {
  it("uses decimal units", () => {
    expect(formatBytes(640)).toBe("640 B");
    expect(formatBytes(812_400)).toBe("812 KB");
    expect(formatBytes(24_600_000)).toBe("24.6 MB");
    expect(formatBytes(1_250_000_000)).toBe("1.25 GB");
  });
});

describe("percentSmaller", () => {
  it("rounds the saving", () => {
    expect(percentSmaller(24.6e6, 6.1e6)).toBe(75);
  });
  it("is zero when nothing was saved", () => {
    expect(percentSmaller(100, 100)).toBe(0);
    expect(percentSmaller(100, 120)).toBe(0);
  });
});
