import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { replayFoldSteps } from ".";
import { craneNarrowedLegsSteps } from "./craneFixture";
import { createSquareBoard } from "../createSquareBoard";
import { applyFoldStep, findFoldCandidates } from "../applyFoldStep";
import { calculateFoldLine } from "../calculateFoldLine";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import {
  applyInsideReverseFoldStep,
  buildInsideReverseFoldStep,
} from "../applyInsideReverseFoldStep";
import { exportProcedureV2 } from "../exportProcedureV2";
import {
  InsideReverseFoldStep,
  LayeredBoard,
  OrigamiStep,
} from "../../types";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);

/**
 * ドラッグ&ドロップ相当のジェスチャから中割り折りステップを組み立てる
 */
const gestureInsideReverse = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3,
  drop: THREE.Vector3
): InsideReverseFoldStep | null => {
  const info = calculateFoldLine(dragVertex, drop);
  if (!info) return null;
  return buildInsideReverseFoldStep({
    boards,
    midpoint: info.midpoint,
    direction: info.direction,
    dragVertex,
    viewFront: true,
  });
};

/**
 * ドラッグ&ドロップ相当のジェスチャから通常の折りステップを組み立てる
 */
const gestureFold = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3,
  drop: THREE.Vector3,
  foldCount: number,
  viewFront: boolean
): OrigamiStep | null => {
  const info = calculateFoldLine(dragVertex, drop);
  if (!info) return null;
  const candidates = findFoldCandidates(boards, dragVertex, viewFront);
  const span = calculateFoldLineSpan(
    info.midpoint,
    info.direction,
    candidates.slice(0, foldCount).map((c) => c.polygon)
  );
  if (!span) return null;
  return { kind: "fold", foldLine: span, dragVertex, foldCount, viewFront };
};

/**
 * 鶴の基本形+足細めから鶴を完成させる残りのジェスチャ:
 * 首（中割り）→ 尾（中割り）→ 頭（中割り）→ 羽の折り下げ（表・裏）
 */
const buildCraneCompletionSteps = (): OrigamiStep[] | null => {
  const initialBoard = createSquareBoard(100);
  const steps: OrigamiStep[] = [...craneNarrowedLegsSteps];
  const replay = () => replayFoldSteps(initialBoard, steps);

  const legTip = v(50, 50);
  const gestures: ((boards: LayeredBoard[]) => OrigamiStep | null)[] = [
    (boards) => gestureInsideReverse(boards, legTip, v(0, 40)),
    (boards) => gestureInsideReverse(boards, legTip, v(40, 0)),
    (boards) => gestureInsideReverse(boards, v(0, 40), v(5, 28)),
    (boards) =>
      gestureFold(boards, v(-20.7107, -20.7107), v(11.7317, 11.7317), 4, true),
    (boards) =>
      gestureFold(boards, v(-20.7107, -20.7107), v(11.7317, 11.7317), 4, false),
  ];

  for (const gesture of gestures) {
    const step = gesture(replay());
    if (!step) return null;
    steps.push(step);
  }
  return steps;
};

describe("鶴の完成シーケンス", () => {
  it("首・尾・頭の中割り折りと羽の折り下げで鶴が完成する", () => {
    const steps = buildCraneCompletionSteps();
    expect(steps).not.toBeNull();
    if (!steps) return;
    expect(steps.length).toBe(15);

    // 各ステップが適用可能なことをリプレイで確認する
    // （適用できないステップがあるとreplayFoldStepsはそこで打ち切るため、
    //   最終形の板数で全ステップの適用成功を検証できる）
    const finalBoards = replayFoldSteps(createSquareBoard(100), steps);
    expect(finalBoards.length).toBe(72);

    // 首・尾を起こした後、足の先端(50,50)に板は残らない
    expect(findFoldCandidates(finalBoards, v(50, 50), true).length).toBe(0);
  });

  it("首の中割り折りの後、頭の中割り折りが首の新しい先端に成立する", () => {
    const boards = replayFoldSteps(
      createSquareBoard(100),
      craneNarrowedLegsSteps
    );
    const neckStep = gestureInsideReverse(boards, v(50, 50), v(0, 40));
    expect(neckStep).not.toBeNull();
    if (!neckStep) return;
    const afterNeck = applyInsideReverseFoldStep(boards, neckStep);
    expect(afterNeck).not.toBeNull();
    if (!afterNeck) return;

    // 起こした首の先端は(0,40)に移り、8枚の点として重なっている
    expect(findFoldCandidates(afterNeck.boards, v(0, 40), true).length).toBe(8);
  });

  it("羽の折り下げは表4枚・裏4枚の通常の折りとして成立する", () => {
    const steps = buildCraneCompletionSteps();
    expect(steps).not.toBeNull();
    if (!steps) return;

    const beforeWings = replayFoldSteps(
      createSquareBoard(100),
      steps.slice(0, 13)
    );
    const wingTip = v(-20.7107, -20.7107);
    expect(findFoldCandidates(beforeWings, wingTip, true).length).toBe(8);

    const frontWing = steps[13];
    expect(frontWing.kind).toBe("fold");
    if (frontWing.kind !== "fold") return;
    const result = applyFoldStep(beforeWings, frontWing);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.movingBoards.length).toBe(4);
  });

  it("完成までの全手順を投稿データへエクスポートできる", () => {
    const steps = buildCraneCompletionSteps();
    expect(steps).not.toBeNull();
    if (!steps) return;

    const procedure = exportProcedureV2({ size: 100, steps });
    expect(procedure).not.toBeNull();
    if (!procedure) return;
    expect(procedure.steps.length).toBe(15);
    expect(
      procedure.steps.filter((step) => step.kind === "insideReverse").length
    ).toBe(3);
    expect(procedure.finalBoards.length).toBe(72);
  });
});
