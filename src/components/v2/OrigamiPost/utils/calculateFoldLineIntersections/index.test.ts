import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { calculateFoldLineIntersections } from "./index";

describe("calculateFoldLineIntersections", () => {
  const size = 100;

  it("折り線から交点を正しく計算できる", () => {
    // 折り線が中心を通り、Z軸方向に伸びる場合（XZ平面上）
    // 折り紙を左右に分ける折り線
    const midpoint = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 0, 1); // Z軸方向

    const intersections = calculateFoldLineIntersections(
      midpoint,
      direction,
      size
    );

    // 奥辺と手前辺で交差するはず
    // 始点: (0, 0, -50) または (0, 0, 50)
    // 終点: (0, 0, 50) または (0, 0, -50)
    expect(intersections.start.x).toBe(0);
    expect(intersections.end.x).toBe(0);
    expect(intersections.start.y).toBe(0);
    expect(intersections.end.y).toBe(0);

    // Z座標は-50と50のどちらか
    const zValues = [intersections.start.z, intersections.end.z].sort();
    expect(zValues[0]).toBe(-50);
    expect(zValues[1]).toBe(50);
  });

  it("折り線が頂点を通る場合でも正しく2点を返す", () => {
    // 折り線が右奥の頂点 (50, 0, -50) を通る場合（XZ平面上）
    // この場合、奥辺と右辺が同じ点で交差するため、3つの交点が見つかる
    // 重複除去により、ユニークな2点のみが返される
    const midpoint = new THREE.Vector3(0, 0, -25);
    const direction = new THREE.Vector3(1, 0, 0); // X軸方向

    const intersections = calculateFoldLineIntersections(
      midpoint,
      direction,
      size
    );

    // 2点が返されることを確認
    expect(intersections.start).toBeDefined();
    expect(intersections.end).toBeDefined();

    // Y座標は両方とも0のはず（XZ平面上）
    expect(intersections.start.y).toBe(0);
    expect(intersections.end.y).toBe(0);

    // Z座標は両方とも-25のはず
    expect(intersections.start.z).toBe(-25);
    expect(intersections.end.z).toBe(-25);

    // X座標は-50と50
    const xValues = [intersections.start.x, intersections.end.x].sort();
    expect(xValues[0]).toBe(-50);
    expect(xValues[1]).toBe(50);
  });
});
