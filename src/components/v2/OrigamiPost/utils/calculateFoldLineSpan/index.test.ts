import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { calculateFoldLineSpan } from "./index";
import { Board } from "../../types";

/** 一辺100の正方形（原点中心、XY平面上） */
const createSquare = (): Board => [
  new THREE.Vector3(-50, -50, 0),
  new THREE.Vector3(50, -50, 0),
  new THREE.Vector3(50, 50, 0),
  new THREE.Vector3(-50, 50, 0),
];

const expectPointNear = (
  point: THREE.Vector3,
  x: number,
  y: number
): void => {
  expect(point.x).toBeCloseTo(x, 5);
  expect(point.y).toBeCloseTo(y, 5);
  expect(point.z).toBeCloseTo(0, 5);
};

describe("calculateFoldLineSpan", () => {
  it("縦の直線が正方形を横切る場合、上下の辺との交点がスパンになる", () => {
    const result = calculateFoldLineSpan(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      [createSquare()]
    );

    expect(result).not.toBeNull();
    if (!result) return;
    expectPointNear(result.start, 0, -50);
    expectPointNear(result.end, 0, 50);
  });

  it("対角線（頂点を通る直線）の場合、両端の頂点がスパンになる", () => {
    const result = calculateFoldLineSpan(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 0),
      [createSquare()]
    );

    expect(result).not.toBeNull();
    if (!result) return;
    expectPointNear(result.start, -50, -50);
    expectPointNear(result.end, 50, 50);
  });

  it("複数の板を渡した場合、すべての板を覆うスパンになる", () => {
    // 正方形の上に隣接するもう1枚（y: 50〜150）
    const upperSquare: Board = [
      new THREE.Vector3(-50, 50, 0),
      new THREE.Vector3(50, 50, 0),
      new THREE.Vector3(50, 150, 0),
      new THREE.Vector3(-50, 150, 0),
    ];

    const result = calculateFoldLineSpan(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      [createSquare(), upperSquare]
    );

    expect(result).not.toBeNull();
    if (!result) return;
    expectPointNear(result.start, 0, -50);
    expectPointNear(result.end, 0, 150);
  });

  it("直線が板と交わらない場合はnullを返す", () => {
    const result = calculateFoldLineSpan(
      new THREE.Vector3(100, 0, 0),
      new THREE.Vector3(0, 1, 0),
      [createSquare()]
    );

    expect(result).toBeNull();
  });

  it("直線が頂点1点にしか触れない場合はnullを返す", () => {
    // (50, 50)の頂点で正方形に接する直線
    const result = calculateFoldLineSpan(
      new THREE.Vector3(50, 50, 0),
      new THREE.Vector3(1, -1, 0),
      [createSquare()]
    );

    expect(result).toBeNull();
  });

  it("方向ベクトルが零ベクトルの場合はnullを返す", () => {
    const result = calculateFoldLineSpan(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      [createSquare()]
    );

    expect(result).toBeNull();
  });
});
