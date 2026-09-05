import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { computeFoldPreview } from ".";
import { LayeredBoard } from "../../types";
import { applyFoldStep } from "../applyFoldStep";
import { createSquareBoard } from "../createSquareBoard";
import { replayFoldSteps } from "../replayFoldSteps";
import { craneNarrowedLegsSteps } from "../replayFoldSteps/craneFixture";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);

const squareBoards = (): LayeredBoard[] => [
  {
    polygon: createSquareBoard(100),
    sourcePolygon: createSquareBoard(100),
    layer: 0,
  },
];

const containsVertexNear = (
  polygon: THREE.Vector3[],
  point: THREE.Vector3
): boolean => polygon.some((vertex) => vertex.distanceTo(point) < 1e-6);

const area = (polygon: THREE.Vector3[]): number =>
  Math.abs(polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return sum + point.x * next.y - point.y * next.x;
  }, 0)) / 2;

describe("computeFoldPreview", () => {
  it.each([true, false])("開いて畳んだ角をめくると左右両方を予告する（表視点=%s）", (viewFront) => {
    const boards = replayFoldSteps(createSquareBoard(100), [
      ...craneNarrowedLegsSteps.slice(0, 2),
      { ...craneNarrowedLegsSteps[2], viewFront },
    ]);
    const before = JSON.stringify(boards);
    const dragVertex = v(50, 50);
    const foldLine = { start: v(25, 50), end: v(50, 25) };
    expect(applyFoldStep(boards, {
      kind: "fold", foldLine, dragVertex, foldCount: 1, viewFront,
    })).toBeNull();
    const result = applyFoldStep(boards, {
      kind: "fold", foldLine, dragVertex, foldCount: 2, viewFront,
    });
    expect(result?.movingBoards).toHaveLength(2);

    const preview = computeFoldPreview({
      boards, dragVertex, draggedPosition: v(25, 25), viewFront,
    });
    expect(preview).not.toBeNull();
    if (!preview || !result) return;
    expect(preview.movingBoards).toHaveLength(2);
    const vertices = preview.movingBoards.flatMap((board) => board.polygon);
    expect(containsVertexNear(vertices, v(25, 50))).toBe(true);
    expect(containsVertexNear(vertices, v(50, 25))).toBe(true);
    expect(containsVertexNear(vertices, v(25, 25))).toBe(true);
    expect(preview.movingBoards.reduce((sum, board) => sum + area(board.polygon), 0))
      .toBeCloseTo(312.5);
    expect(preview.movingBoards.map((board) => board.layer))
      .toEqual(result.movingBoards.map((board) => board.layer));
    expect(JSON.stringify(boards)).toBe(before);
  });

  it("正方形の角のドラッグで、動く片がドラッグ先の位置へ鏡映される", () => {
    const preview = computeFoldPreview({
      boards: squareBoards(),
      dragVertex: v(50, -50),
      draggedPosition: v(-50, -50),
      viewFront: true,
    });
    expect(preview).not.toBeNull();
    if (!preview) return;
    expect(preview.foldLine.start.x).toBeCloseTo(0);
    expect(preview.foldLine.end.x).toBeCloseTo(0);
    expect(preview.movingBoards).toHaveLength(1);
    expect(containsVertexNear(preview.movingBoards[0].polygon, v(-50, -50))).toBe(true);
    expect(containsVertexNear(preview.movingBoards[0].polygon, v(50, -50))).toBe(false);
    expect(preview.movingBoards[0].layer).toBe(0);
  });

  it("ドラッグ位置が元位置と同じ場合はnull", () => {
    expect(computeFoldPreview({
      boards: squareBoards(),
      dragVertex: v(50, -50),
      draggedPosition: v(50, -50),
      viewFront: true,
    })).toBeNull();
  });

  it("既存の折り目を使ってめくると、分割されない板全体を予告する", () => {
    const boards = replayFoldSteps(createSquareBoard(100), craneNarrowedLegsSteps.slice(0, 1));
    const preview = computeFoldPreview({
      boards, dragVertex: v(50, 50), draggedPosition: v(-50, -50), viewFront: true,
    });
    expect(preview?.movingBoards).toHaveLength(1);
    if (!preview) return;
    expect(preview.movingBoards[0].polygon).toHaveLength(3);
    expect(containsVertexNear(preview.movingBoards[0].polygon, v(-50, -50))).toBe(true);
    expect(area(preview.movingBoards[0].polygon)).toBeCloseTo(5000);
  });

  it("重なった面を独立して折れる場合は、最少枚数を視点側から選ぶ", () => {
    const boards = replayFoldSteps(createSquareBoard(100), craneNarrowedLegsSteps.slice(0, 1));
    for (const viewFront of [true, false]) {
      const preview = computeFoldPreview({
        boards, dragVertex: v(50, 50), draggedPosition: v(25, 25), viewFront,
      });
      expect(preview?.movingBoards).toHaveLength(1);
      expect(preview?.movingBoards[0].layer).toBe(viewFront ? 1 : 0);
    }
  });

  it("鶴の先端でも、ドラッグ先に移る面をすべて予告する", () => {
    const boards = replayFoldSteps(createSquareBoard(100), craneNarrowedLegsSteps);
    const preview = computeFoldPreview({
      boards, dragVertex: v(50, 50), draggedPosition: v(0, 40), viewFront: true,
    });
    expect(preview).not.toBeNull();
    if (!preview) return;
    expect(preview.movingBoards.length).toBeGreaterThan(1);
    for (const board of preview.movingBoards) {
      expect(containsVertexNear(board.polygon, v(0, 40))).toBe(true);
    }
  });

  it("ドラッグ頂点のない隣の面を引き裂く折りは予告しない", () => {
    const polygons = [
      [v(-50, -50), v(50, -50), v(-50, 50)],
      [v(50, -50), v(50, 50), v(-50, 50)],
    ];
    expect(computeFoldPreview({
      boards: polygons.map((polygon, layer) => ({ polygon, sourcePolygon: polygon, layer })),
      dragVertex: v(-50, -50), draggedPosition: v(50, -50), viewFront: true,
    })).toBeNull();
  });

  it("候補板がない位置のドラッグはnull", () => {
    expect(computeFoldPreview({
      boards: squareBoards(), dragVertex: v(10, 10), draggedPosition: v(0, 0), viewFront: true,
    })).toBeNull();
  });
});
