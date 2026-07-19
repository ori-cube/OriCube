import { Board, LayeredBoard, OrigamiStep } from "../../types";
import { applyFoldStep } from "../applyFoldStep";
import { applySquashFoldStep } from "../applySquashFoldStep";
import { applyPetalFoldStep } from "../applyPetalFoldStep";

/**
 * 初期状態の板に折り手順を順に適用して、現在の板群を再現する
 *
 * @param initialBoard - 初期状態の板（折る前の正方形）
 * @param steps - 折り手順の履歴
 * @returns 履歴をすべて適用した後の板群
 *
 * @description
 * - 折り手順の履歴が唯一の状態源であり、板の形状は常にこの関数で導出する
 * - 常に初期状態から再計算するため、Undo/Redoを繰り返しても
 *   浮動小数の誤差が蓄積しない
 * - 適用できないステップがあった場合はそこで打ち切る
 *   （履歴には適用可能と検証済みのステップだけが積まれるため、防御的処理）
 */
export const replayFoldSteps = (
  initialBoard: Board,
  steps: OrigamiStep[]
): LayeredBoard[] => {
  // 初期状態では折り畳み空間と展開図空間が一致する
  let boards: LayeredBoard[] = [
    {
      polygon: initialBoard,
      sourcePolygon: initialBoard.map((vertex) => vertex.clone()),
      layer: 0,
    },
  ];

  for (const step of steps) {
    const result = applyStep(boards, step);
    if (!result) return boards;
    boards = result.boards;
  }

  return boards;
};

/**
 * 折り操作を種類ごとの適用関数へ振り分ける
 */
const applyStep = (
  boards: LayeredBoard[],
  step: OrigamiStep
): { boards: LayeredBoard[] } | null => {
  switch (step.kind) {
    case "fold":
      return applyFoldStep(boards, step);
    case "squash":
      return applySquashFoldStep(boards, step);
    case "petal":
      return applyPetalFoldStep(boards, step);
    default:
      return assertNever(step);
  }
};

/**
 * OrigamiStepの網羅チェック（新しい種類の追加漏れをコンパイル時に検出する）
 */
const assertNever = (step: never): never => {
  throw new Error(`未対応の折り操作です: ${JSON.stringify(step)}`);
};
