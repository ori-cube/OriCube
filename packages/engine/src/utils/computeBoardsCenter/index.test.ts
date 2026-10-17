import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { computeBoardsCenter } from "./index";
import { LayeredBoard } from "../../types";

const createBoard = (
  vertices: [number, number][],
  layer = 0
): LayeredBoard => ({
  polygon: vertices.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  sourcePolygon: vertices.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  layer,
});

describe("computeBoardsCenter", () => {
  it("板が無い場合は原点を返す", () => {
    const center = computeBoardsCenter([]);
    expect(center.x).toBe(0);
    expect(center.y).toBe(0);
    expect(center.z).toBe(0);
  });

  it("1枚の板のバウンディングボックス中心を返す", () => {
    const board = createBoard([
      [0, 0],
      [100, 0],
      [100, 50],
      [0, 50],
    ]);

    const center = computeBoardsCenter([board]);
    expect(center.x).toBeCloseTo(50);
    expect(center.y).toBeCloseTo(25);
    expect(center.z).toBe(0);
  });

  it("複数の板をまたいだバウンディングボックスの中心を返す", () => {
    const left = createBoard([
      [-100, -50],
      [-50, -50],
      [-50, 0],
    ]);
    const right = createBoard(
      [
        [0, 0],
        [100, 0],
        [100, 150],
      ],
      1
    );

    const center = computeBoardsCenter([left, right]);
    expect(center.x).toBeCloseTo(0);
    expect(center.y).toBeCloseTo(50);
  });

  it("頂点の密度に偏りがあっても中心はバウンディングボックスで決まる", () => {
    // 左端に頂点を密集させても、範囲が同じなら中心は変わらない
    const board = createBoard([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ]);

    const center = computeBoardsCenter([board]);
    expect(center.x).toBeCloseTo(50);
    expect(center.y).toBeCloseTo(50);
  });
});
