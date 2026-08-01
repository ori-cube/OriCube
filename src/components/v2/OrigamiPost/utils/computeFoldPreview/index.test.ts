import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { computeFoldPreview } from ".";
import { LayeredBoard } from "../../types";
import { findFoldCandidates } from "../applyFoldStep";
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
): boolean =>
  polygon.some(
    (vertex) =>
      Math.abs(vertex.x - point.x) < 1e-6 && Math.abs(vertex.y - point.y) < 1e-6
  );

describe("computeFoldPreview", () => {
  it("正方形の角のドラッグで、動く片がドラッグ先の位置へ鏡映される", () => {
    const preview = computeFoldPreview({
      boards: squareBoards(),
      dragVertex: v(50, -50),
      draggedPosition: v(-50, -50),
      viewFront: true,
    });
    expect(preview).not.toBeNull();
    if (!preview) return;

    // 折り線は垂直二等分線 x=0（正方形を縦に横切るスパン）
    expect(preview.foldLine.start.x).toBeCloseTo(0);
    expect(preview.foldLine.end.x).toBeCloseTo(0);

    // ドラッグした頂点は鏡映によりドラッグ先の位置へ写る
    expect(containsVertexNear(preview.movingPolygon, v(-50, -50))).toBe(true);
    // 動く片は右半分の鏡映なので、元の右端の頂点は含まれない
    expect(containsVertexNear(preview.movingPolygon, v(50, -50))).toBe(false);
    expect(preview.layer).toBe(0);
  });

  it("ドラッグ位置が元位置と同じ場合はnull", () => {
    expect(
      computeFoldPreview({
        boards: squareBoards(),
        dragVertex: v(50, -50),
        draggedPosition: v(50, -50),
        viewFront: true,
      })
    ).toBeNull();
  });

  it("折り線が最前面の板を横切らない場合は板全体を鏡映する", () => {
    // 最前面: 小さい三角形、背面: 大きい正方形（どちらも原点に頂点を持つ）
    const triangle = [v(0, 0), v(10, 0), v(0, 10)];
    const square = [v(0, 0), v(40, 0), v(40, 40), v(0, 40)];
    const boards: LayeredBoard[] = [
      { polygon: square, sourcePolygon: square, layer: 0 },
      { polygon: triangle, sourcePolygon: triangle, layer: 1 },
    ];

    // 折り線 x+y=30 は三角形（x+y<=10）を横切らず、正方形だけを横切る
    const preview = computeFoldPreview({
      boards,
      dragVertex: v(0, 0),
      draggedPosition: v(30, 30),
      viewFront: true,
    });
    expect(preview).not.toBeNull();
    if (!preview) return;

    expect(preview.movingPolygon.length).toBe(3);
    expect(containsVertexNear(preview.movingPolygon, v(30, 30))).toBe(true);
    expect(containsVertexNear(preview.movingPolygon, v(30, 20))).toBe(true);
    expect(containsVertexNear(preview.movingPolygon, v(20, 30))).toBe(true);
    expect(preview.layer).toBe(1);
  });

  it("鶴の先端のドラッグでも最前面の1枚のプレビューを返す", () => {
    const boards = replayFoldSteps(
      createSquareBoard(100),
      craneNarrowedLegsSteps
    );
    const preview = computeFoldPreview({
      boards,
      dragVertex: v(50, 50),
      draggedPosition: v(0, 40),
      viewFront: true,
    });
    expect(preview).not.toBeNull();
    if (!preview) return;

    // ドラッグした先端はドラッグ先の位置へ写る
    expect(containsVertexNear(preview.movingPolygon, v(0, 40))).toBe(true);
    // 表示高さは最前面（視点側の先頭候補板）のレイヤー
    const candidates = findFoldCandidates(boards, v(50, 50), true);
    expect(preview.layer).toBe(candidates[0].layer);
  });

  it("候補板がない位置のドラッグはnull", () => {
    expect(
      computeFoldPreview({
        boards: squareBoards(),
        dragVertex: v(10, 10),
        draggedPosition: v(0, 0),
        viewFront: true,
      })
    ).toBeNull();
  });
});
