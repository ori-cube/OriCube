import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { replayFoldSteps } from "./index";
import { Board, FoldStep, OrigamiStep } from "../../types";
import { createSquareBoard } from "../createSquareBoard";

const createFoldStep = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  dragX: number,
  dragY: number,
  foldCount = 1
): FoldStep => ({
  kind: "fold",
  foldLine: {
    start: new THREE.Vector3(startX, startY, 0),
    end: new THREE.Vector3(endX, endY, 0),
  },
  dragVertex: new THREE.Vector3(dragX, dragY, 0),
  foldCount,
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

  it("2回折ると履歴の順に適用されて4枚の板になる", () => {
    // 1回目: x=0で半分に折る → 2回目: つながった2枚をy=0でまとめて折る
    // （2枚はx=0の折り目でつながっているため、1枚だけでは折れない）
    const steps = [
      createFoldStep(0, -50, 0, 50, 50, 50),
      createFoldStep(-50, 0, 50, 0, -50, 50, 2),
    ];

    const result = replayFoldSteps(createSquareBoard(100), steps);

    expect(result).toHaveLength(4);

    // 2回目の折りで動いた片のうち下の紙の片が一番上（レイヤー3）に積まれ、
    // (-50, 50)の頂点はy=0で鏡映されて(-50, -50)へ移る
    const topBoard = result.find((board) => board.layer === 3);
    expect(topBoard).toBeDefined();
    if (!topBoard) return;
    expect(containsPoint(topBoard.polygon, -50, -50)).toBe(true);
  });

  it("通常の折りと開いて畳むが混在した履歴をリプレイできる", () => {
    // 対角線で2回折った後、頂点(20,20)を(20,-20)へ開いて畳む
    const steps: OrigamiStep[] = [
      {
        kind: "fold",
        foldLine: {
          start: new THREE.Vector3(-20, -20, 0),
          end: new THREE.Vector3(20, 20, 0),
        },
        dragVertex: new THREE.Vector3(-20, 20, 0),
        foldCount: 1,
        viewFront: true,
      },
      {
        kind: "fold",
        foldLine: {
          start: new THREE.Vector3(-20, 20, 0),
          end: new THREE.Vector3(20, -20, 0),
        },
        dragVertex: new THREE.Vector3(-20, -20, 0),
        foldCount: 2,
        viewFront: true,
      },
      {
        kind: "squash",
        foldLine: {
          start: new THREE.Vector3(0, 0, 0),
          end: new THREE.Vector3(20, 0, 0),
        },
        dragVertex: new THREE.Vector3(20, 20, 0),
        viewFront: true,
      },
    ];

    const result = replayFoldSteps(createSquareBoard(40), steps);

    expect(result).toHaveLength(6);

    // 開いて畳んだ片が最前面（レイヤー6）に積まれ、先端はy=0で鏡映される
    const topBoard = result.find((board) => board.layer === 6);
    expect(topBoard).toBeDefined();
    if (!topBoard) return;
    expect(containsPoint(topBoard.polygon, 20, -20)).toBe(true);
    expect(containsPoint(topBoard.polygon, 20, 20)).toBe(false);
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
