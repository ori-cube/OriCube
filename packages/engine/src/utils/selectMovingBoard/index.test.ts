import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { selectMovingBoard } from "./index";
import { BoardPiece, FoldLine } from "../../types";

/** 頂点列からBoardPieceを作る（展開図は折り畳み空間と一致する状態） */
const createPiece = (vertices: [number, number][]): BoardPiece => ({
  polygon: vertices.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  sourcePolygon: vertices.map(([x, y]) => new THREE.Vector3(x, y, 0)),
});

describe("selectMovingBoard", () => {
  // 中央の縦の折り線で分割された2つの長方形
  const negativeXPiece = createPiece([
    [-50, -50],
    [0, -50],
    [0, 50],
    [-50, 50],
  ]);
  const positiveXPiece = createPiece([
    [0, -50],
    [50, -50],
    [50, 50],
    [0, 50],
  ]);
  const foldLine: FoldLine = {
    start: new THREE.Vector3(0, -50, 0),
    end: new THREE.Vector3(0, 50, 0),
  };

  it("ドラッグした頂点と同じ側の片が動く片になる", () => {
    const originalPoint = new THREE.Vector3(-50, -50, 0);

    const result = selectMovingBoard(
      [negativeXPiece, positiveXPiece],
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingPiece).toBe(negativeXPiece);
    expect(result?.staticPiece).toBe(positiveXPiece);
  });

  it("片の渡し順が入れ替わっても同じ結果になる", () => {
    const originalPoint = new THREE.Vector3(-50, -50, 0);

    const result = selectMovingBoard(
      [positiveXPiece, negativeXPiece],
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingPiece).toBe(negativeXPiece);
    expect(result?.staticPiece).toBe(positiveXPiece);
  });

  it("ドラッグした頂点が反対側にある場合はもう一方の片が動く片になる", () => {
    const originalPoint = new THREE.Vector3(50, 50, 0);

    const result = selectMovingBoard(
      [negativeXPiece, positiveXPiece],
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingPiece).toBe(positiveXPiece);
    expect(result?.staticPiece).toBe(negativeXPiece);
  });

  it("ドラッグした頂点が折り線上にある場合はnullを返す", () => {
    const originalPoint = new THREE.Vector3(0, 0, 0);

    const result = selectMovingBoard(
      [negativeXPiece, positiveXPiece],
      originalPoint,
      foldLine
    );

    expect(result).toBeNull();
  });
});
