import * as THREE from "three";
import {
  AxisV2,
  FixBoardV2,
  HistoryStepV2,
  MoveBoardV2,
  PointV2,
  ProcedureV2,
  SegmentV2,
  StepV2,
} from "../../model-v2";
import {
  EditorStep,
  isFoldStep,
  FoldLine,
  FoldStep,
  InsideReverseFoldStep,
  LayeredBoard,
  OrigamiStep,
  PetalFoldStep,
  SquashFoldStep,
} from "../../types";
import { createSquareBoard } from "../createSquareBoard";
import { applyFoldStep } from "../applyFoldStep";
import { applySquashFoldStep } from "../applySquashFoldStep";
import { applyPetalFoldStep } from "../applyPetalFoldStep";
import { applyInsideReverseFoldStep } from "../applyInsideReverseFoldStep";
import { determineFoldRotation } from "../determineFoldRotation";
import {
  collectSquashVertexAxes,
  deriveSquashRotationAxes,
} from "../computeSquashAnimationPositions";
import {
  collectPetalVertexAxes,
  derivePetalRotationAxes,
} from "../computePetalAnimationPositions";
import { VertexAxis } from "../vertexAxes";

/**
 * ジェスチャ履歴をv2投稿データ（答え形式＋履歴）へエクスポートする
 *
 * @param props.size - 折る前の正方形の一辺
 * @param props.steps - ジェスチャ履歴（折りと裏返し。適用可能と検証済みのもの）
 * @returns v2投稿データ。履歴に適用できないステップがある場合はnull
 *
 * @description
 * - 履歴をリプレイしながら、各ステップの「動かない板 + 動く板の頂点ごとの
 *   回転軸の列」を書き出す。閲覧側はソルバなしでθ回転の再生だけで
 *   折り手順を表示できる
 * - 回転軸の分類はアニメーション（useFoldAnimation）と同じ関数を使うため、
 *   投稿時に見た動きと保存データの再生が一致する
 * - ジェスチャ履歴も一緒に保存し、将来の再編集やソルバ改良時の
 *   再エクスポートを可能にする
 * - 裏返しは history に手順として残す（version 3）。カメラを回して裏から
 *   折った場合など、折りの表裏が直前の表裏と違うときは、その折りの前に
 *   裏返しを補い、history の表裏と各折りの表裏を常に一致させる
 */
export const exportProcedureV2 = (props: {
  size: number;
  steps: EditorStep[];
}): ProcedureV2 | null => {
  const { size } = props;
  const history = normalizeFlips(props.steps);
  const steps = history.filter(isFoldStep);

  const initialBoard = createSquareBoard(size);
  let boards: LayeredBoard[] = [
    {
      polygon: initialBoard,
      sourcePolygon: initialBoard.map((vertex) => vertex.clone()),
      layer: 0,
    },
  ];

  const exportedSteps: StepV2[] = [];
  for (const step of steps) {
    const exported = exportStep(boards, step);
    if (!exported) return null;
    exportedSteps.push(exported.exportedStep);
    boards = exported.boards;
  }

  return {
    version: 3,
    size,
    steps: exportedSteps,
    finalBoards: boards.map(toFixBoard),
    history: history.map(serializeHistoryStep),
  };
};

/**
 * 裏返しを表裏の変化と一致させる
 *
 * @description
 * 表から始め、表裏を変えない裏返しは除き、表裏が直前と違う折りの前には裏返しを補う
 */
const normalizeFlips = (steps: EditorStep[]): EditorStep[] => {
  const normalized: EditorStep[] = [];
  let viewFront = true;
  for (const step of steps) {
    if (step.viewFront !== viewFront) {
      normalized.push({ kind: "flip", viewFront: step.viewFront });
      viewFront = step.viewFront;
    }
    if (isFoldStep(step)) normalized.push(step);
  }
  return normalized;
};

/**
 * 1ステップを適用し、答え形式のステップと適用後の板群を返す
 */
const exportStep = (
  boards: LayeredBoard[],
  step: OrigamiStep
): { exportedStep: StepV2; boards: LayeredBoard[] } | null => {
  switch (step.kind) {
    case "fold":
      return exportFoldStep(boards, step);
    case "squash":
      return exportSquashStep(boards, step);
    case "petal":
      return exportPetalStep(boards, step);
    case "insideReverse":
      return exportInsideReverseStep(boards, step);
  }
};

/**
 * 通常の折り: 全ての動く板の全頂点が折り線周りの単一回転
 */
const exportFoldStep = (
  boards: LayeredBoard[],
  step: FoldStep
): { exportedStep: StepV2; boards: LayeredBoard[] } | null => {
  const result = applyFoldStep(boards, step);
  if (!result) return null;

  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);
  const movingVertices = result.movingBoards.flatMap(
    (board) => board.polygon
  );
  const axisDirection = determineFoldRotation(
    step.foldLine,
    movingVertices,
    liftDirection
  );
  if (!axisDirection) return null;

  const rotation: VertexAxis = {
    origin: step.foldLine.start,
    direction: axisDirection,
  };

  return {
    exportedStep: {
      kind: "fold",
      fixBoards: result.staticBoards.map(toFixBoard),
      moveBoards: result.movingBoards.map((board) => ({
        polygon: board.polygon.map(toPointV2),
        layer: board.layer,
        vertexAxes: board.polygon.map(() => [toAxisV2(rotation)]),
      })),
      foldLines: [toSegmentV2(step.foldLine)],
      ...(step.angle !== undefined && step.angle < Math.PI
        ? { targetAngle: step.angle }
        : {}),
    },
    boards: result.boards,
  };
};

/**
 * 開いて畳む: アニメーションと同じ分類で頂点ごとの回転軸の列を書き出す
 */
const exportSquashStep = (
  boards: LayeredBoard[],
  step: SquashFoldStep
): { exportedStep: StepV2; boards: LayeredBoard[] } | null => {
  const result = applySquashFoldStep(boards, step);
  if (!result) return null;

  const axes = deriveSquashRotationAxes(step, result);
  if (!axes) return null;

  const vertexAxes = collectSquashVertexAxes({
    movingPieces: result.movingPieces,
    foldLine: step.foldLine,
    hinge: result.hinge,
    spine: { start: result.spineApex, end: step.dragVertex },
    foldLineAxis: axes.foldLineAxis,
    hingeAxis: axes.hingeAxis,
  });

  return {
    exportedStep: {
      kind: "squash",
      fixBoards: result.staticBoards.map(toFixBoard),
      moveBoards: result.movingPieces.map((moving, pieceIndex) =>
        toMoveBoard(moving.piece.polygon, moving.layer, vertexAxes[pieceIndex])
      ),
      foldLines: [toSegmentV2(step.foldLine), toSegmentV2(result.hinge)],
    },
    boards: result.boards,
  };
};

/**
 * 花弁折り: アニメーションと同じ分類で頂点ごとの回転軸の列を書き出す
 */
const exportPetalStep = (
  boards: LayeredBoard[],
  step: PetalFoldStep
): { exportedStep: StepV2; boards: LayeredBoard[] } | null => {
  const result = applyPetalFoldStep(boards, step);
  if (!result) return null;

  const axes = derivePetalRotationAxes(step, result);
  if (!axes) return null;

  const vertexAxes = collectPetalVertexAxes({
    movingPieces: result.movingPieces,
    foldLine: result.foldLine,
    kiteLines: result.kiteLines,
    tuckCreases: result.tuckCreases,
    foldLineAxis: axes.foldLineAxis,
    kiteAxes: axes.kiteAxes,
  });

  return {
    exportedStep: {
      kind: "petal",
      fixBoards: result.staticBoards.map(toFixBoard),
      moveBoards: result.movingPieces.map((moving, pieceIndex) =>
        toMoveBoard(moving.piece.polygon, moving.layer, vertexAxes[pieceIndex])
      ),
      foldLines: [
        toSegmentV2(result.foldLine),
        toSegmentV2(result.kiteLines[0]),
        toSegmentV2(result.kiteLines[1]),
      ],
    },
    boards: result.boards,
  };
};

/**
 * 中割り折り: 通常の折りと同じく、全ての動く片の全頂点が折り線周りの単一回転
 */
const exportInsideReverseStep = (
  boards: LayeredBoard[],
  step: InsideReverseFoldStep
): { exportedStep: StepV2; boards: LayeredBoard[] } | null => {
  const result = applyInsideReverseFoldStep(boards, step);
  if (!result) return null;

  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);
  const movingVertices = result.movingBoards.flatMap(
    (board) => board.polygon
  );
  const axisDirection = determineFoldRotation(
    step.foldLine,
    movingVertices,
    liftDirection
  );
  if (!axisDirection) return null;

  const rotation: VertexAxis = {
    origin: step.foldLine.start,
    direction: axisDirection,
  };

  return {
    exportedStep: {
      kind: "insideReverse",
      fixBoards: result.staticBoards.map(toFixBoard),
      moveBoards: result.movingBoards.map((board) => ({
        polygon: board.polygon.map(toPointV2),
        layer: board.layer,
        vertexAxes: board.polygon.map(() => [toAxisV2(rotation)]),
      })),
      foldLines: [toSegmentV2(step.foldLine)],
    },
    boards: result.boards,
  };
};

/**
 * ジェスチャ履歴の1要素を保存形式へ変換する
 */
const serializeHistoryStep = (step: EditorStep): HistoryStepV2 => {
  switch (step.kind) {
    case "flip":
      return { kind: "flip", viewFront: step.viewFront };
    case "fold":
      return {
        kind: "fold",
        foldLine: toSegmentV2(step.foldLine),
        dragVertex: toPointV2(step.dragVertex),
        foldCount: step.foldCount,
        viewFront: step.viewFront,
        ...(step.angle !== undefined && step.angle < Math.PI
          ? { angle: step.angle }
          : {}),
      };
    case "squash":
      return {
        kind: "squash",
        foldLine: toSegmentV2(step.foldLine),
        dragVertex: toPointV2(step.dragVertex),
        viewFront: step.viewFront,
      };
    case "petal":
      return {
        kind: "petal",
        foldLine: toSegmentV2(step.foldLine),
        dragVertex: toPointV2(step.dragVertex),
        viewFront: step.viewFront,
      };
    case "insideReverse":
      return {
        kind: "insideReverse",
        foldLine: toSegmentV2(step.foldLine),
        dragVertex: toPointV2(step.dragVertex),
        viewFront: step.viewFront,
      };
  }
};

const toPointV2 = (vertex: THREE.Vector3): PointV2 => [
  vertex.x,
  vertex.y,
  vertex.z,
];

const toSegmentV2 = (line: FoldLine): SegmentV2 => ({
  start: toPointV2(line.start),
  end: toPointV2(line.end),
});

const toAxisV2 = (axis: VertexAxis): AxisV2 => ({
  origin: toPointV2(axis.origin),
  direction: toPointV2(axis.direction),
});

const toFixBoard = (board: LayeredBoard): FixBoardV2 => ({
  polygon: board.polygon.map(toPointV2),
  layer: board.layer,
});

const toMoveBoard = (
  polygon: THREE.Vector3[],
  layer: number,
  vertexAxes: VertexAxis[][]
): MoveBoardV2 => ({
  polygon: polygon.map(toPointV2),
  layer,
  vertexAxes: vertexAxes.map((axes) => axes.map(toAxisV2)),
});
