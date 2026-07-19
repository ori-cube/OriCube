import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyInsideReverseFoldStep,
  buildInsideReverseFoldStep,
} from ".";
import { InsideReverseFoldStep, LayeredBoard } from "../../types";
import { replayFoldSteps } from "../replayFoldSteps";
import { craneNarrowedLegsSteps } from "../replayFoldSteps/craneFixture";
import { createSquareBoard } from "../createSquareBoard";
import { calculateFoldLine } from "../calculateFoldLine";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import { findFoldCandidates } from "../applyFoldStep";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);

/**
 * 正方形を縦半分に折った2枚重ねのフラップ（最小の中割り対象）
 */
const foldedStrip = (): LayeredBoard[] =>
  replayFoldSteps(createSquareBoard(100), [
    {
      kind: "fold",
      foldLine: { start: v(0, -50), end: v(0, 50) },
      dragVertex: v(-50, -50),
      foldCount: 1,
      viewFront: true,
    },
  ]);

const buildStep = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3,
  drop: THREE.Vector3,
  viewFront = true
): InsideReverseFoldStep | null => {
  const foldLineInfo = calculateFoldLine(dragVertex, drop);
  if (!foldLineInfo) return null;
  return buildInsideReverseFoldStep({
    boards,
    midpoint: foldLineInfo.midpoint,
    direction: foldLineInfo.direction,
    dragVertex,
    viewFront,
  });
};

describe("applyInsideReverseFoldStep", () => {
  it("2枚重ねのフラップのスパイン側の角を、レイヤーの間へ差し込んで折り返す", () => {
    const boards = foldedStrip();
    expect(boards.map((b) => b.layer).sort()).toEqual([0, 1]);

    // スパイン（折り目 x=0）の端点の角(0,50)を、スパインを横切る折り線で折り込む
    const step = buildStep(boards, v(0, 50), v(30, 20));
    expect(step).not.toBeNull();
    if (!step) return;

    const result = applyInsideReverseFoldStep(boards, step);
    expect(result).not.toBeNull();
    if (!result) return;

    // 根元2片 + 先端2片
    expect(result.boards.length).toBe(4);
    expect(result.movingBoards.length).toBe(2);

    // 先端片は外側ではなく、根元のレイヤー0と1の間に差し込まれる
    const insertedLayers = result.boards
      .filter((board) => !result.staticBoards.includes(board))
      .map((board) => board.layer);
    for (const layer of insertedLayers) {
      expect(layer).toBeGreaterThan(0);
      expect(layer).toBeLessThan(1);
    }
  });

  it("折り線が先端を横切らない場合は不成立", () => {
    const boards = foldedStrip();
    // ドラッグ開始点と同一点 → 折り線なし
    expect(buildStep(boards, v(50, -50), v(50, -50))).toBeNull();
  });

  it("折り線がスパインを横切らない開いた角の折りは不成立", () => {
    const boards = foldedStrip();

    // 角(50,-50)はスパイン（x=0）から離れた開いた角。
    // ここを起こす折り線はスパインを横切らないため中割り折りにならない
    const step = buildStep(boards, v(50, -50), v(30, 30));
    expect(step).not.toBeNull();
    if (!step) return;
    expect(applyInsideReverseFoldStep(boards, step)).toBeNull();
  });

  it("1枚だけの板（折り重なった点でない）には成立しない", () => {
    const single: LayeredBoard[] = [
      {
        polygon: createSquareBoard(100),
        sourcePolygon: createSquareBoard(100),
        layer: 0,
      },
    ];
    expect(buildStep(single, v(50, -50), v(0, 0))).toBeNull();
  });

  describe("鶴の基本形+足細めからの首・尾の中割り折り", () => {
    const boards = replayFoldSteps(
      createSquareBoard(100),
      craneNarrowedLegsSteps
    );
    const tip = v(50, 50);

    it("先端(50,50)の片方の点だけを起こせる", () => {
      const step = buildStep(boards, tip, v(0, 40));
      expect(step).not.toBeNull();
      if (!step) return;

      const result = applyInsideReverseFoldStep(boards, step);
      expect(result).not.toBeNull();
      if (!result) return;

      // 動くのは片方の点（8枚）だけで、もう片方の点は残る
      expect(result.movingBoards.length).toBe(8);
      const remainingTipCandidates = findFoldCandidates(
        result.boards,
        tip,
        true
      );
      expect(remainingTipCandidates.length).toBe(8);

      // 先端片は最大レイヤーの外側ではなく、内側に差し込まれる
      const maxLayer = Math.max(...boards.map((b) => b.layer));
      const insertedLayers = result.boards
        .filter((board) => !result.staticBoards.includes(board))
        .map((board) => board.layer);
      for (const layer of insertedLayers) {
        expect(layer).toBeLessThan(maxLayer);
      }
    });

    it("首を起こした後、残った点も反対方向へ起こせる（尾）", () => {
      const neckStep = buildStep(boards, tip, v(0, 40));
      expect(neckStep).not.toBeNull();
      if (!neckStep) return;
      const afterNeck = applyInsideReverseFoldStep(boards, neckStep);
      expect(afterNeck).not.toBeNull();
      if (!afterNeck) return;

      const tailStep = buildStep(afterNeck.boards, tip, v(40, 0));
      expect(tailStep).not.toBeNull();
      if (!tailStep) return;
      const afterTail = applyInsideReverseFoldStep(afterNeck.boards, tailStep);
      expect(afterTail).not.toBeNull();
      if (!afterTail) return;

      // 首・尾とも起こした後、先端(50,50)に残る板はない
      expect(findFoldCandidates(afterTail.boards, tip, true).length).toBe(0);
    });

    it("リプレイ（履歴経由）でも同じ結果になる", () => {
      const neckStep = buildStep(boards, tip, v(0, 40));
      expect(neckStep).not.toBeNull();
      if (!neckStep) return;

      const replayed = replayFoldSteps(createSquareBoard(100), [
        ...craneNarrowedLegsSteps,
        neckStep,
      ]);
      const direct = applyInsideReverseFoldStep(boards, neckStep);
      expect(direct).not.toBeNull();
      if (!direct) return;
      expect(replayed.length).toBe(direct.boards.length);
    });
  });
});

describe("buildInsideReverseFoldStep", () => {
  it("動かす点を覆うスパンを持つステップを組み立てる", () => {
    const boards = replayFoldSteps(
      createSquareBoard(100),
      craneNarrowedLegsSteps
    );
    const tip = v(50, 50);
    const foldLineInfo = calculateFoldLine(tip, v(0, 40));
    expect(foldLineInfo).not.toBeNull();
    if (!foldLineInfo) return;

    const step = buildInsideReverseFoldStep({
      boards,
      midpoint: foldLineInfo.midpoint,
      direction: foldLineInfo.direction,
      dragVertex: tip,
      viewFront: true,
    });
    expect(step).not.toBeNull();
    if (!step) return;

    // スパンは無限直線としては同じ折り線を表す
    const expectedSpan = calculateFoldLineSpan(
      foldLineInfo.midpoint,
      foldLineInfo.direction,
      findFoldCandidates(boards, tip, true).map((b) => b.polygon)
    );
    expect(expectedSpan).not.toBeNull();
    expect(step.kind).toBe("insideReverse");
    expect(step.viewFront).toBe(true);
  });
});
