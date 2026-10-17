import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { isPointLeftOfLine } from "./index";

describe("isPointLeftOfLine", () => {
  // Y軸正方向の有向直線（左側はx負、右側はx正）
  const lineStart = new THREE.Vector3(0, -50, 0);
  const lineEnd = new THREE.Vector3(0, 50, 0);

  it("直線の左側の点はtrueを返す", () => {
    const point = new THREE.Vector3(-10, 0, 0);
    expect(isPointLeftOfLine(point, lineStart, lineEnd)).toBe(true);
  });

  it("直線の右側の点はfalseを返す", () => {
    const point = new THREE.Vector3(10, 0, 0);
    expect(isPointLeftOfLine(point, lineStart, lineEnd)).toBe(false);
  });

  it("直線上の点はnullを返す", () => {
    const point = new THREE.Vector3(0, 25, 0);
    expect(isPointLeftOfLine(point, lineStart, lineEnd)).toBeNull();
  });

  it("直線の延長線上の点もnullを返す", () => {
    const point = new THREE.Vector3(0, 100, 0);
    expect(isPointLeftOfLine(point, lineStart, lineEnd)).toBeNull();
  });

  it("直線の向きを反転すると判定も反転する", () => {
    const point = new THREE.Vector3(-10, 0, 0);
    expect(isPointLeftOfLine(point, lineEnd, lineStart)).toBe(false);
  });

  it("斜めの直線でも正しく判定する", () => {
    // 対角線 (-50,-50) → (50,50)：左側はy > xの領域
    const diagStart = new THREE.Vector3(-50, -50, 0);
    const diagEnd = new THREE.Vector3(50, 50, 0);

    expect(
      isPointLeftOfLine(new THREE.Vector3(-50, 50, 0), diagStart, diagEnd)
    ).toBe(true);
    expect(
      isPointLeftOfLine(new THREE.Vector3(50, -50, 0), diagStart, diagEnd)
    ).toBe(false);
    expect(
      isPointLeftOfLine(new THREE.Vector3(0, 0, 0), diagStart, diagEnd)
    ).toBeNull();
  });

  it("epsilonの範囲内の微小なずれは線上とみなす", () => {
    const point = new THREE.Vector3(1e-10, 0, 0);
    expect(isPointLeftOfLine(point, lineStart, lineEnd)).toBeNull();
  });
});
