import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { collectSnapPoints, SnapPoint } from "./index";
import { LayeredBoard } from "../../types";

/** 順序付き頂点列（正方形） */
const createSquarePolygon = () => [
  new THREE.Vector3(-50, -50, 0),
  new THREE.Vector3(50, -50, 0),
  new THREE.Vector3(50, 50, 0),
  new THREE.Vector3(-50, 50, 0),
];

/** 一辺100の正方形（原点中心、XY平面上） */
const createSquare = (layer: number): LayeredBoard => ({
  polygon: createSquarePolygon(),
  sourcePolygon: createSquarePolygon(),
  layer,
});

/** 指定座標のスナップポイントを取り出す */
const findSnapPointAt = (
  points: SnapPoint[],
  x: number,
  y: number
): SnapPoint | undefined =>
  points.find(
    (point) =>
      Math.abs(point.position.x - x) < 1e-6 &&
      Math.abs(point.position.y - y) < 1e-6
  );

describe("collectSnapPoints", () => {
  it("1枚の板では各頂点が1つずつスナップポイントになる", () => {
    const result = collectSnapPoints([createSquare(0)]);

    expect(result).toHaveLength(4);
    expect(result.every((point) => point.boardCount === 1)).toBe(true);
    expect(findSnapPointAt(result, 50, 50)).toBeDefined();
  });

  it("完全に重なった2枚の板の頂点は1つに集約され、板の数が2になる", () => {
    const result = collectSnapPoints([createSquare(0), createSquare(1)]);

    expect(result).toHaveLength(4);
    expect(result.every((point) => point.boardCount === 2)).toBe(true);
  });

  it("一部の頂点だけ共有する2枚の板では、共有する頂点のみ板の数が増える", () => {
    // 正方形の右上4分の1に重なる板（(50, 50)のみ正方形と頂点を共有する）
    const quarterPolygon = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(50, 0, 0),
      new THREE.Vector3(50, 50, 0),
      new THREE.Vector3(0, 50, 0),
    ];
    const quarter: LayeredBoard = {
      polygon: quarterPolygon,
      sourcePolygon: quarterPolygon.map((vertex) => vertex.clone()),
      layer: 1,
    };

    const result = collectSnapPoints([createSquare(0), quarter]);

    expect(result).toHaveLength(7);
    expect(findSnapPointAt(result, 50, 50)?.boardCount).toBe(2);
    expect(findSnapPointAt(result, -50, -50)?.boardCount).toBe(1);
    expect(findSnapPointAt(result, 0, 0)?.boardCount).toBe(1);
  });

  it("閾値未満のずれがある頂点は同じスナップポイントに集約される", () => {
    const shiftedPolygon = [
      new THREE.Vector3(-50.05, -50.05, 0),
      new THREE.Vector3(50.05, -50.05, 0),
      new THREE.Vector3(50.05, 50.05, 0),
      new THREE.Vector3(-50.05, 50.05, 0),
    ];
    const slightlyShifted: LayeredBoard = {
      polygon: shiftedPolygon,
      sourcePolygon: shiftedPolygon.map((vertex) => vertex.clone()),
      layer: 1,
    };

    const result = collectSnapPoints([createSquare(0), slightlyShifted]);

    expect(result).toHaveLength(4);
    expect(result.every((point) => point.boardCount === 2)).toBe(true);
  });

  it("スナップポイントの位置はz=0に揃えられる", () => {
    const result = collectSnapPoints([createSquare(0)]);

    expect(result.every((point) => point.position.z === 0)).toBe(true);
  });

  it("板がない場合は空配列を返す", () => {
    expect(collectSnapPoints([])).toEqual([]);
  });
});
