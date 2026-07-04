import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { selectMovingBoard } from "./index";
import { Board, FoldLine } from "../../types";

describe("selectMovingBoard", () => {
  // 中央の縦の折り線で分割された左右の長方形
  const leftBoard: Board = [
    new THREE.Vector3(-50, -50, 0),
    new THREE.Vector3(0, -50, 0),
    new THREE.Vector3(0, 50, 0),
    new THREE.Vector3(-50, 50, 0),
  ];
  const rightBoard: Board = [
    new THREE.Vector3(0, -50, 0),
    new THREE.Vector3(50, -50, 0),
    new THREE.Vector3(50, 50, 0),
    new THREE.Vector3(0, 50, 0),
  ];
  const foldLine: FoldLine = {
    start: new THREE.Vector3(0, -50, 0),
    end: new THREE.Vector3(0, 50, 0),
  };

  it("ドラッグした頂点が左側にある場合、左の板が動く板になる", () => {
    const originalPoint = new THREE.Vector3(-50, -50, 0);

    const result = selectMovingBoard(
      leftBoard,
      rightBoard,
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingBoard).toBe(leftBoard);
    expect(result?.staticBoard).toBe(rightBoard);
  });

  it("ドラッグした頂点が右側にある場合、右の板が動く板になる", () => {
    const originalPoint = new THREE.Vector3(50, 50, 0);

    const result = selectMovingBoard(
      leftBoard,
      rightBoard,
      originalPoint,
      foldLine
    );

    expect(result).not.toBeNull();
    expect(result?.movingBoard).toBe(rightBoard);
    expect(result?.staticBoard).toBe(leftBoard);
  });

  it("ドラッグした頂点が折り線上にある場合はnullを返す", () => {
    const originalPoint = new THREE.Vector3(0, 0, 0);

    const result = selectMovingBoard(
      leftBoard,
      rightBoard,
      originalPoint,
      foldLine
    );

    expect(result).toBeNull();
  });
});
