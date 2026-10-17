import { OrigamiStep } from "../../types";

/**
 * Undo/Redo可能な折り手順の履歴
 *
 * @description
 * - stepsは折り操作の全履歴、indexは適用済みのステップ数
 * - Undoはindexを戻すだけで、stepsは保持する（Redoで再適用できる）
 * - 板の形状は適用済みステップ（appliedFoldSteps）のリプレイで導出する
 */
export interface FoldHistory {
  /** 折り操作の全履歴 */
  steps: OrigamiStep[];
  /** 適用済みのステップ数（0 <= index <= steps.length） */
  index: number;
}

/** 空の履歴 */
export const EMPTY_FOLD_HISTORY: FoldHistory = { steps: [], index: 0 };

/**
 * 適用済みの折り手順（リプレイの入力）を返す
 */
export const appliedFoldSteps = (history: FoldHistory): OrigamiStep[] =>
  history.steps.slice(0, history.index);

/**
 * 新しい折り操作を履歴へ積む
 *
 * @description
 * Undoで戻った位置より先の履歴（Redo対象）は破棄される
 */
export const pushFoldStep = (
  history: FoldHistory,
  step: OrigamiStep
): FoldHistory => ({
  steps: [...history.steps.slice(0, history.index), step],
  index: history.index + 1,
});

/**
 * 折り操作を1手戻す（先頭ではそのまま返す）
 */
export const undoFoldStep = (history: FoldHistory): FoldHistory =>
  canUndo(history) ? { ...history, index: history.index - 1 } : history;

/**
 * 戻した折り操作を1手やり直す（末尾ではそのまま返す）
 */
export const redoFoldStep = (history: FoldHistory): FoldHistory =>
  canRedo(history) ? { ...history, index: history.index + 1 } : history;

/**
 * 1手戻せるか
 */
export const canUndo = (history: FoldHistory): boolean => history.index > 0;

/**
 * 1手やり直せるか
 */
export const canRedo = (history: FoldHistory): boolean =>
  history.index < history.steps.length;
