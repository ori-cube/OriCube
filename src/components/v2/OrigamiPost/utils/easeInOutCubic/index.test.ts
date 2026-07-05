import { describe, it, expect } from "vitest";
import { easeInOutCubic } from "./index";

describe("easeInOutCubic", () => {
  it("開始は0、終了は1になる", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("中間点では0.5になる", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });

  it("序盤は等速より遅く、終盤は等速より速く進む", () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
  });

  it("単調増加する", () => {
    for (let i = 0; i < 10; i++) {
      expect(easeInOutCubic((i + 1) / 10)).toBeGreaterThan(
        easeInOutCubic(i / 10)
      );
    }
  });
});
