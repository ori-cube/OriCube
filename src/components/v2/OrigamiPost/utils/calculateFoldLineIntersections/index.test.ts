import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { calculateFoldLineIntersections } from "./index";

describe("calculateFoldLineIntersections", () => {
  const initialBoard = [
    new THREE.Vector3(-50, -50, 0),
    new THREE.Vector3(50, -50, 0),
    new THREE.Vector3(50, 50, 0),
    new THREE.Vector3(-50, 50, 0),
  ];

  it("折り線から交点を正しく計算できる", () => {
    // 折り線が中心を通り、Y軸方向に伸びる場合（XY平面上）
    // 折り紙を左右に分ける折り線（x=0の縦線）
    const midpoint = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 1, 0); // Y軸方向

    const intersections = calculateFoldLineIntersections({
      midpoint,
      direction,
      initialBoard,
    });

    // 上辺と下辺で交差するはず
    // 始点: (0, -50, 0) または (0, 50, 0)
    // 終点: (0, 50, 0) または (0, -50, 0)
    expect(intersections.start.x).toBe(0);
    expect(intersections.end.x).toBe(0);
    expect(intersections.start.z).toBe(0);
    expect(intersections.end.z).toBe(0);

    // Y座標は-50と50のどちらか
    const yValues = [intersections.start.y, intersections.end.y].sort();
    expect(yValues[0]).toBe(-50);
    expect(yValues[1]).toBe(50);
  });

  it("折り線が頂点を通る場合でも正しく2点を返す", () => {
    // 折り線が右上の頂点 (50, 50, 0) を通る場合（XY平面上）
    // この場合、上辺と右辺が同じ点で交差するため、3つの交点が見つかる
    // 重複除去により、ユニークな2点のみが返される
    const midpoint = new THREE.Vector3(0, -25, 0);
    const direction = new THREE.Vector3(1, 0, 0); // X軸方向

    const intersections = calculateFoldLineIntersections({
      midpoint,
      direction,
      initialBoard,
    });

    // 2点が返されることを確認
    expect(intersections.start).toBeDefined();
    expect(intersections.end).toBeDefined();

    // Z座標は両方とも0のはず（XY平面上）
    expect(intersections.start.z).toBe(0);
    expect(intersections.end.z).toBe(0);

    // Y座標は両方とも-25のはず
    expect(intersections.start.y).toBe(-25);
    expect(intersections.end.y).toBe(-25);

    // X座標は-50と50
    const xValues = [intersections.start.x, intersections.end.x].sort();
    expect(xValues[0]).toBe(-50);
    expect(xValues[1]).toBe(50);
  });
});
