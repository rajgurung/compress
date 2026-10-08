import { describe, expect, it } from "vitest";
import { limitFor } from "../src/limits";

describe("limitFor", () => {
  it("warns above 200 MB on a phone", () => {
    expect(limitFor({ coarsePointer: true, shortSide: 390 })).toEqual({ device: "phone", warnAbove: 200e6 });
  });
  it("warns above 1 GB on a computer", () => {
    expect(limitFor({ coarsePointer: false, shortSide: 900 })).toEqual({ device: "computer", warnAbove: 1000e6 });
  });
  it("treats a touch laptop as a computer", () => {
    expect(limitFor({ coarsePointer: true, shortSide: 1080 }).device).toBe("computer");
  });
  it("is careful on a low-memory device", () => {
    expect(limitFor({ coarsePointer: false, shortSide: 900, memoryGb: 4 }).device).toBe("phone");
  });
});
