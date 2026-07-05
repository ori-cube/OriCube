import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { replayFoldSteps } from "./index";
import { Board, FoldStep } from "../../types";
import { createSquareBoard } from "../createSquareBoard";

const createFoldStep = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  dragX: number,
  dragY: number
): FoldStep => ({
  foldLine: {
    start: new THREE.Vector3(startX, startY, 0),
    end: new THREE.Vector3(endX, endY, 0),
  },
  dragVertex: new THREE.Vector3(dragX, dragY, 0),
  foldCount: 1,
  viewFront: true,
});

/** 頂点列に期待する座標が含まれるか判定する */
const containsPoint = (board: Board, x: number, y: number): boolean =>
  board.some(
    (vertex) => Math.abs(vertex.x - x) < 1e-6 && Math.abs(vertex.y - y) < 1e-6
  );

describe("replayFoldSteps", () => {
  it("履歴が空の場合は初期状態の板1枚（レイヤー0）を返す", () => {
    const result = replayFoldSteps(createSquareBoard(100), []);

    expect(result).toHaveLength(1);
    expect(result[0].layer).toBe(0);
    expect(result[0].polygon).toHaveLength(4);
  });

  it("1回折ると2枚の板になる", () => {
    // x=0の縦の折り線で右上の頂点をドラッグして半分に折る
    const steps = [createFoldStep(0, -50, 0, 50, 50, 50)];

    const result = replayFoldSteps(createSquareBoard(100), steps);

    expect(result).toHaveLength(2);
    expect(result.map((board) => board.layer).sort()).toEqual([0, 1]);
  });

  it("2回折ると履歴の順に適用されて3枚の板になる", () => {
    // 1回目: x=0で半分に折る → 2回目: 上の板（レイヤー1）をy=0で折る
    const steps = [
      createFoldStep(0, -50, 0, 50, 50, 50),
      createFoldStep(-50, 0, 50, 0, -50, 50),
    ];

    const result = replayFoldSteps(createSquareBoard(100), steps);

    expect(result).toHaveLength(3);

    // 2回目の折りで動いた片は一番上（レイヤー2）に積まれ、
    // (-50, 50)の頂点はy=0で鏡映されて(-50, -50)へ移る
    const topBoard = result.find((board) => board.layer === 2);
    expect(topBoard).toBeDefined();
    if (!topBoard) return;
    expect(containsPoint(topBoard.polygon, -50, -50)).toBe(true);
  });

  it("適用できないステップ以降は打ち切り、直前までの状態を返す", () => {
    const steps = [
      createFoldStep(0, -50, 0, 50, 50, 50),
      // どの板の頂点でもない位置をドラッグした不正なステップ
      createFoldStep(-50, 0, 50, 0, 10, 10),
      createFoldStep(-25, -50, -25, 50, -50, 50),
    ];

    const result = replayFoldSteps(createSquareBoard(100), steps);

    expect(result).toHaveLength(2);
  });
});
