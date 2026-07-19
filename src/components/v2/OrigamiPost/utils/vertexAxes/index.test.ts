import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { VertexAxis, applyVertexAxes } from "./index";

const v = (x: number, y: number, z = 0): THREE.Vector3 =>
  new THREE.Vector3(x, y, z);

describe("applyVertexAxes", () => {
  it("軸が0本の場合は元の座標のまま", () => {
    const vertex = v(3, 4);
    const moved = applyVertexAxes(vertex, [], Math.PI);

    expect(moved.distanceTo(vertex)).toBeLessThan(1e-12);
    expect(moved).not.toBe(vertex);
  });

  it("1本の軸で180度回転すると鏡映になる", () => {
    // x軸周りの180度回転: (x, y, 0) -> (x, -y, 0)
    const axis: VertexAxis = { origin: v(0, 0), direction: v(1, 0) };
    const moved = applyVertexAxes(v(3, 4), [axis], Math.PI);

    expect(moved.x).toBeCloseTo(3);
    expect(moved.y).toBeCloseTo(-4);
    expect(moved.z).toBeCloseTo(0);
  });

  it("軸上の頂点は回転しても動かない", () => {
    const axis: VertexAxis = { origin: v(10, 0), direction: v(0, 1) };
    const moved = applyVertexAxes(v(10, 5), [axis], Math.PI / 3);

    expect(moved.distanceTo(v(10, 5))).toBeLessThan(1e-12);
  });

  it("複数の軸を順に適用する（順序が結果に影響する）", () => {
    // x軸周り180度 -> y軸周り180度 = z軸周り180度と等価
    const xAxis: VertexAxis = { origin: v(0, 0), direction: v(1, 0) };
    const yAxis: VertexAxis = { origin: v(0, 0), direction: v(0, 1) };
    const moved = applyVertexAxes(v(3, 4), [xAxis, yAxis], Math.PI);

    expect(moved.x).toBeCloseTo(-3);
    expect(moved.y).toBeCloseTo(-4);
    expect(moved.z).toBeCloseTo(0);

    // 元の頂点は変更されない
    const vertex = v(3, 4);
    applyVertexAxes(vertex, [xAxis, yAxis], Math.PI / 2);
    expect(vertex.distanceTo(v(3, 4))).toBeLessThan(1e-12);
  });
});
