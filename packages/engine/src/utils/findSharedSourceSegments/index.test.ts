import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  findSharedSourceSegments,
  mapSourceBoundaryPointToFolded,
} from "./index";
import { Board, BoardPiece } from "../../types";

/** 頂点列（XY平面上）を作る */
const createBoard = (vertices: [number, number][]): Board =>
  vertices.map(([x, y]) => new THREE.Vector3(x, y, 0));

/** 線分の集合に期待する線分（向きは問わない）が含まれるか判定する */
const containsSegment = (
  segments: { start: THREE.Vector3; end: THREE.Vector3 }[],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean =>
  segments.some((segment) => {
    const matches = (
      point: THREE.Vector3,
      x: number,
      y: number
    ): boolean => Math.abs(point.x - x) < 1e-6 && Math.abs(point.y - y) < 1e-6;
    return (
      (matches(segment.start, x1, y1) && matches(segment.end, x2, y2)) ||
      (matches(segment.start, x2, y2) && matches(segment.end, x1, y1))
    );
  });

describe("findSharedSourceSegments", () => {
  it("辺全体が一致する場合はその線分を返す", () => {
    // x=0の辺を共有する左右の長方形
    const left = createBoard([
      [-50, -50],
      [0, -50],
      [0, 50],
      [-50, 50],
    ]);
    const right = createBoard([
      [0, -50],
      [50, -50],
      [50, 50],
      [0, 50],
    ]);

    const result = findSharedSourceSegments(left, right);

    expect(result).toHaveLength(1);
    expect(containsSegment(result, 0, -50, 0, 50)).toBe(true);
  });

  it("辺が部分的に重なる場合は重なる区間だけを返す", () => {
    // 左の板のx=0の辺(y: -50〜50)と、右の小さい板のx=0の辺(y: 0〜50)
    const left = createBoard([
      [-50, -50],
      [0, -50],
      [0, 50],
      [-50, 50],
    ]);
    const smallRight = createBoard([
      [0, 0],
      [50, 0],
      [50, 50],
      [0, 50],
    ]);

    const result = findSharedSourceSegments(left, smallRight);

    expect(result).toHaveLength(1);
    expect(containsSegment(result, 0, 0, 0, 50)).toBe(true);
  });

  it("共線でも重ならない辺は共有とみなさない", () => {
    // どちらもx=0上に辺を持つが、yの区間が離れている
    const upper = createBoard([
      [-50, 10],
      [0, 10],
      [0, 50],
      [-50, 50],
    ]);
    const lower = createBoard([
      [0, -50],
      [50, -50],
      [50, -10],
      [0, -10],
    ]);

    expect(findSharedSourceSegments(upper, lower)).toEqual([]);
  });

  it("点接触のみ（長さ0の重なり）は共有とみなさない", () => {
    // (0, 0)の1点でのみ接する2つの正方形
    const lowerLeft = createBoard([
      [-50, -50],
      [0, -50],
      [0, 0],
      [-50, 0],
    ]);
    const upperRight = createBoard([
      [0, 0],
      [50, 0],
      [50, 50],
      [0, 50],
    ]);

    expect(findSharedSourceSegments(lowerLeft, upperRight)).toEqual([]);
  });

  it("辺の向きが同じでも共有を検出する（頂点順に依存しない）", () => {
    const left = createBoard([
      [-50, -50],
      [0, -50],
      [0, 50],
      [-50, 50],
    ]);
    // 頂点順を反転した右の長方形（x=0の辺の向きがleftと同じになる）
    const rightReversed = createBoard([
      [0, 50],
      [50, 50],
      [50, -50],
      [0, -50],
    ]);

    const result = findSharedSourceSegments(left, rightReversed);

    expect(containsSegment(result, 0, -50, 0, 50)).toBe(true);
  });

  it("離れた板同士は共有なし", () => {
    const left = createBoard([
      [-50, -50],
      [-10, -50],
      [-10, 50],
      [-50, 50],
    ]);
    const right = createBoard([
      [10, -50],
      [50, -50],
      [50, 50],
      [10, 50],
    ]);

    expect(findSharedSourceSegments(left, right)).toEqual([]);
  });
});

describe("mapSourceBoundaryPointToFolded", () => {
  // x=0で折られて左半分に重なった右半分の片
  // 展開図(x, y) → 折り畳み空間(-x, y) の鏡映対応
  const mirroredPiece: BoardPiece = {
    polygon: createBoard([
      [0, -50],
      [-50, -50],
      [-50, 50],
      [0, 50],
    ]),
    sourcePolygon: createBoard([
      [0, -50],
      [50, -50],
      [50, 50],
      [0, 50],
    ]),
  };

  it("展開図の境界上の頂点を対応する折り畳み空間の座標へ写像する", () => {
    const result = mapSourceBoundaryPointToFolded(
      mirroredPiece,
      new THREE.Vector3(50, 50, 0)
    );

    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(-50);
    expect(result?.y).toBeCloseTo(50);
  });

  it("展開図の辺の途中の点も同じ補間比率で写像する", () => {
    // 展開図のx=50の辺(y: -50〜50)の中点
    const result = mapSourceBoundaryPointToFolded(
      mirroredPiece,
      new THREE.Vector3(50, 0, 0)
    );

    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(-50);
    expect(result?.y).toBeCloseTo(0);
  });

  it("境界上にない点はnullを返す", () => {
    const result = mapSourceBoundaryPointToFolded(
      mirroredPiece,
      new THREE.Vector3(25, 0, 0)
    );

    expect(result).toBeNull();
  });
});
