import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { calculateFoldLine } from "./index";

describe("calculateFoldLine", () => {
  it("ドラッグから折り線情報を正しく計算できる", () => {
    const p1 = new THREE.Vector3(0, 0, 0);
    const p2 = new THREE.Vector3(10, 20, 0);
    const foldLine = calculateFoldLine(p1, p2);

    // 中点
    expect(foldLine!.midpoint.x).toBe(5);
    expect(foldLine!.midpoint.y).toBe(10);
    expect(foldLine!.midpoint.z).toBe(0);

    // 折り線の方向ベクトル
    expect(foldLine!.direction.x).toBe(0);
    expect(foldLine!.direction.y).toBe(10);
    expect(foldLine!.direction.z).toBe(0);
  });

  it("同じ点の場合はnullを返す", () => {
    const p1 = new THREE.Vector3(5, 5, 5);
    const p2 = new THREE.Vector3(5, 5, 5);
    const foldLine = calculateFoldLine(p1, p2);

    expect(foldLine).toBeNull();
  });
});
