import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { serializeOrigamiState } from ".";
import { FoldStep, LayeredBoard, PetalFoldStep } from "../../types";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("serializeOrigamiState", () => {
  it("折り手順と板群をJSON化可能なタプル形式に変換する", () => {
    const foldStep: FoldStep = {
      kind: "fold",
      foldLine: { start: v(0, -50, 0), end: v(0, 50, 0) },
      dragVertex: v(-50, -50, 0),
      foldCount: 1,
      viewFront: true,
    };
    const petalStep: PetalFoldStep = {
      kind: "petal",
      foldLine: { start: v(-10, 0, 0), end: v(10, 0, 0) },
      dragVertex: v(0, -50, 0),
      viewFront: false,
    };
    const boards: LayeredBoard[] = [
      {
        layer: 0,
        polygon: [v(0, 0, 0), v(50, 0, 0), v(0, 50, 0)],
        sourcePolygon: [v(0, 0, 0), v(50, 0, 0), v(0, 50, 0)],
      },
    ];

    const state = serializeOrigamiState(boards, [foldStep, petalStep]);

    expect(state).toEqual({
      steps: [
        {
          kind: "fold",
          foldLine: { start: [0, -50, 0], end: [0, 50, 0] },
          dragVertex: [-50, -50, 0],
          foldCount: 1,
          viewFront: true,
        },
        {
          kind: "petal",
          foldLine: { start: [-10, 0, 0], end: [10, 0, 0] },
          dragVertex: [0, -50, 0],
          viewFront: false,
        },
      ],
      boards: [
        {
          layer: 0,
          polygon: [
            [0, 0, 0],
            [50, 0, 0],
            [0, 50, 0],
          ],
          sourcePolygon: [
            [0, 0, 0],
            [50, 0, 0],
            [0, 50, 0],
          ],
        },
      ],
    });
    expect(() => JSON.stringify(state)).not.toThrow();
  });

  it("座標を小数第4位に丸め、板をlayer降順に並べる", () => {
    const boards: LayeredBoard[] = [
      {
        layer: -2,
        polygon: [v(1.00004999, 0, 0)],
        sourcePolygon: [v(0.123456, 0, 0)],
      },
      {
        layer: 3,
        polygon: [v(0, 0, 0)],
        sourcePolygon: [v(0, 0, 0)],
      },
    ];

    const state = serializeOrigamiState(boards, []);

    expect(state.boards.map((b) => b.layer)).toEqual([3, -2]);
    expect(state.boards[1].polygon[0]).toEqual([1, 0, 0]);
    expect(state.boards[1].sourcePolygon[0]).toEqual([0.1235, 0, 0]);
  });
});
