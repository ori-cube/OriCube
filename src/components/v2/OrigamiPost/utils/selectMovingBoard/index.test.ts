import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { selectMovingBoard } from "./index";
import { Board, FoldLine } from "../../types";

describe("selectMovingBoard", () => {
  // 中央の縦の折り線で分割された2つの長方形
  const negativeXBoard: Board = [
    new THREE.Vector3(-50, -50, 0),
    new THREE.Vector3(0, -50, 0),
    new THREE.Vector3(0, 50, 0),
    new THREE.Vector3(-50, 50, 0),
  ];
  const positiveXBoard: Board = [
    new THREE.Vector3(0, -50, 0),
    new THREE.Vector3(50, -50, 0),
    new THREE.Vector3(50, 50, 0),
    new THREE.Vector3(0, 50, 0),
  ];
  const foldLine: FoldLine = {
    start: new THREE.Vector3(0, -50, 0),
    end: new THREE.Vector3(0, 50, 0),
  };

  it("ドラッグした頂点と同じ側の板が動く板になる", () => {
    const originalPoint = new THREE.Vector3(-50, -50, 0);

    const result = selectMovingBoard(
      [negativeXBoard, positiveXBoard],
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingBoard).toBe(negativeXBoard);
    expect(result?.staticBoard).toBe(positiveXBoard);
  });

  it("板の渡し順が入れ替わっても同じ結果になる", () => {
    const originalPoint = new THREE.Vector3(-50, -50, 0);

    const result = selectMovingBoard(
      [positiveXBoard, negativeXBoard],
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingBoard).toBe(negativeXBoard);
    expect(result?.staticBoard).toBe(positiveXBoard);
  });

  it("ドラッグした頂点が反対側にある場合はもう一方の板が動く板になる", () => {
    const originalPoint = new THREE.Vector3(50, 50, 0);

    const result = selectMovingBoard(
      [negativeXBoard, positiveXBoard],
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingBoard).toBe(positiveXBoard);
    expect(result?.staticBoard).toBe(negativeXBoard);
  });

  it("ドラッグした頂点が折り線上にある場合はnullを返す", () => {
    const originalPoint = new THREE.Vector3(0, 0, 0);

    const result = selectMovingBoard(
      [negativeXBoard, positiveXBoard],
      originalPoint,
      foldLine
    );

    expect(result).toBeNull();
  });
});
