import * as THREE from "three";
import { Board, LayeredBoard, OrigamiStep } from "../../types";
import { applyFoldStep } from "../applyFoldStep";
import { applySquashFoldStep } from "../applySquashFoldStep";
import { applyPetalFoldStep } from "../applyPetalFoldStep";
import { applyInsideReverseFoldStep } from "../applyInsideReverseFoldStep";
import { determineFoldRotation } from "../determineFoldRotation";

/** 折り角がこの値以上なら平面折り（180度）とみなす */
const FLAT_ANGLE_EPSILON = 1e-6;

/**
 * 仕上げ角度（180度未満の折り）で折られた板の表示用回転
 *
 * @description
 * エンジン上は平面（180度折り）の位置にある板を、描画時に折り線周りへ
 * (angle - π) だけ回転して実際の折り角の姿勢で表示するための情報
 */
export interface FinishingRotation {
  /** 回転の基準点（折り線上の点） */
  origin: THREE.Vector3;
  /** 回転軸（正の角度で視点側へ持ち上がる向き、正規化済み） */
  axis: THREE.Vector3;
  /** 折り角（ラジアン、π未満） */
  angle: number;
}

/**
 * リプレイの詳細結果（板群 + 仕上げ角度の表示用回転）
 */
export interface ReplayResult {
  /** 履歴をすべて適用した後の板群（平面プロキシ） */
  boards: LayeredBoard[];
  /** 仕上げ角度で折られた板の表示用回転（板の参照がキー） */
  finishingRotations: Map<LayeredBoard, FinishingRotation>;
}

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
): LayeredBoard[] => replayFoldStepsDetailed(initialBoard, steps).boards;

/**
 * replayFoldStepsの詳細版。仕上げ角度の表示用回転も返す
 *
 * @description
 * - 折り角がπ未満のFoldStepで動いた板について、平面プロキシの位置から
 *   実際の折り角の姿勢へ戻すための回転（折り線・軸・角度）を収集する
 * - 回転軸はアニメーション（useFoldAnimation）と同じ
 *   determineFoldRotationで決めるため、折りアニメーションの最終姿勢と
 *   表示が一致する
 * - 仕上げ角度の板が後続のステップの対象になった場合、その板の回転情報は
 *   破棄され平面として扱われる（仕上げは最後の手として使う想定）
 */
export const replayFoldStepsDetailed = (
  initialBoard: Board,
  steps: OrigamiStep[]
): ReplayResult => {
  // 初期状態では折り畳み空間と展開図空間が一致する
  let boards: LayeredBoard[] = [
    {
      polygon: initialBoard,
      sourcePolygon: initialBoard.map((vertex) => vertex.clone()),
      layer: 0,
    },
  ];
  let finishingRotations = new Map<LayeredBoard, FinishingRotation>();

  for (const step of steps) {
    const result = applyStep(boards, step);
    if (!result) return { boards, finishingRotations };

    // 前のステップの対象にならず残った板の回転情報だけを引き継ぐ
    const carried = new Map<LayeredBoard, FinishingRotation>();
    for (const board of result.boards) {
      const rotation = finishingRotations.get(board);
      if (rotation) carried.set(board, rotation);
    }
    finishingRotations = carried;

    const finishing = collectFinishingRotation(result, step);
    if (finishing) {
      for (const board of finishing.movedBoards) {
        finishingRotations.set(board, finishing.rotation);
      }
    }

    boards = result.boards;
  }

  return { boards, finishingRotations };
};

/**
 * 折り操作の適用結果（仕上げ角度の収集に必要な最小の形）
 */
interface AppliedStepResult {
  boards: LayeredBoard[];
  staticBoards: LayeredBoard[];
  /** 回転前の動く片（通常の折り・中割り折りのみ。回転軸の決定に使用） */
  movingBoards?: LayeredBoard[];
}

/**
 * 折り操作を種類ごとの適用関数へ振り分ける
 */
const applyStep = (
  boards: LayeredBoard[],
  step: OrigamiStep
): AppliedStepResult | null => {
  switch (step.kind) {
    case "fold":
      return applyFoldStep(boards, step);
    case "squash":
      return applySquashFoldStep(boards, step);
    case "petal":
      return applyPetalFoldStep(boards, step);
    case "insideReverse":
      return applyInsideReverseFoldStep(boards, step);
    default:
      return assertNever(step);
  }
};

/**
 * 仕上げ角度のステップから、動いた板の表示用回転を導出する
 *
 * @returns 折り角がπ未満のFoldStepの場合のみ、動いた板と回転の組。
 *          それ以外（平面折り・他の操作）はnull
 */
const collectFinishingRotation = (
  result: AppliedStepResult,
  step: OrigamiStep
): { movedBoards: LayeredBoard[]; rotation: FinishingRotation } | null => {
  if (step.kind !== "fold") return null;
  const angle = step.angle ?? Math.PI;
  if (angle >= Math.PI - FLAT_ANGLE_EPSILON) return null;
  if (!result.movingBoards) return null;

  const staticSet = new Set(result.staticBoards);
  const movedBoards = result.boards.filter((board) => !staticSet.has(board));

  // 回転軸はアニメーションと同じく回転前の動く片から決める
  // （鏡映後の頂点で決めると軸の向きが反転してしまう）
  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);
  const axis = determineFoldRotation(
    step.foldLine,
    result.movingBoards.flatMap((board) => board.polygon),
    liftDirection
  );
  if (!axis) return null;

  return {
    movedBoards,
    rotation: {
      origin: step.foldLine.start.clone(),
      axis,
      angle,
    },
  };
};

/**
 * OrigamiStepの網羅チェック（新しい種類の追加漏れをコンパイル時に検出する）
 */
const assertNever = (step: never): never => {
  throw new Error(`未対応の折り操作です: ${JSON.stringify(step)}`);
};
